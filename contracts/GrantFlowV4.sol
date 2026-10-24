// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GrantFlowV4
 * @notice Ranked-prize hackathon/bounty contract.
 *
 * Phases per program:
 *   Submission  (block.timestamp <  submissionDeadline)
 *   Judging     (submissionDeadline <= block.timestamp < judgingDeadline)
 *   Finalized   (finalize() called after judgingDeadline)
 *
 * Prize model:
 *   prizes[] = [1st-place amount, 2nd-place amount, ...] in USDC units (6 dec).
 *   pool = sum(prizes). Fee = pool * feeBps / 10_000, sent to feeRecipient on create.
 *   Sponsor deposits pool + fee in one safeTransferFrom each.
 *
 * Conflict-of-interest guards:
 *   - Sponsor cannot submit to their own program.
 *   - Judges cannot submit to a program they judge.
 *   - One submission per wallet per program.
 *   - Judges vote only in Judging phase; max 1 vote per submission; cannot vote
 *     on their own submission.
 *   - Each judge has exactly prizes.length votes total.
 *
 * Finalization (anyone may call after judgingDeadline):
 *   Ranks all submissions by vote count DESC, tie-broken by earlier submissionId.
 *   Only submissions with >= 1 vote can win. Assigns prizes[i] to rank i.
 *   Unawarded prizes remain in contract for sponsor to reclaim.
 *   MAX_SUBMISSIONS_PER_PROGRAM = 100 for gas safety.
 *
 * Claims: pull pattern — winners call claim() after finalize().
 * Reclaim: sponsor calls reclaim() after finalize() for unawarded pool portion.
 * Cancel: sponsor may cancel() before any submission for a full pool refund.
 */
contract GrantFlowV4 is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    // ── Enums ─────────────────────────────────────────────────────────────────

    enum ProgramType { ONCHAIN_BUILD, OPEN_BOUNTY }
    enum Category    { Hackathon, Bounty, Contest, Referral }
    enum Phase       { Submission, Judging, Finalized, Cancelled }

    // ── Errors ────────────────────────────────────────────────────────────────

    error ProgramNotFound();
    error SubmissionNotFound();
    error NotJudge();
    error AlreadyVoted();
    error AlreadyPaid();
    error NotSubmissionPhase();
    error NotJudgingPhase();
    error NotFinalized();
    error AlreadyFinalized();
    error NotAfterJudgingDeadline();
    error AlreadySubmitted();
    error InvalidProjectContract();
    error InvalidParams();
    error NotSponsor();
    error FeeTooHigh();
    error ZeroAddress();
    error WrongProgramType();
    error ConflictOfInterest();
    error TooManySubmissions();
    error NothingToReclaim();
    error NothingToClaim();
    error AlreadyCancelled();
    error SubmissionsExist();

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant MAX_FEE_BPS = 500;
    uint256 public constant MAX_SUBMISSIONS_PER_PROGRAM = 100;
    uint256 public constant MAX_PRIZES = 20; // ranks per program

    // ── Structs ───────────────────────────────────────────────────────────────

    struct Program {
        string        name;
        string        description;
        address       sponsor;
        address[]     judges;
        uint256[]     prizes;          // prizes[0] = 1st place, etc.
        uint256       totalDeposited;  // sum(prizes), fee excluded
        uint256       submissionDeadline;
        uint256       judgingDeadline;
        ProgramType   programType;
        Category      category;
        bool          exists;
        bool          finalized;
        bool          cancelled;
        bool          sponsorReclaimed; // set true once sponsor reclaims residual
    }

    struct Submission {
        address submitter;
        address projectContract; // address(0) for OPEN_BOUNTY
        string  metadataURI;
        uint256 votes;
        uint256 prizeAwarded;    // 0 until finalized
        bool    claimed;
        bool    exists;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public feeRecipient;
    uint256 public feeBps;
    uint256 public totalFeesCollected;
    uint256 public programCount;

    mapping(uint256 => Program)                            public  programs;
    mapping(uint256 => Submission[])                       private _submissions;
    /// one submission per wallet per program
    mapping(uint256 => mapping(address => bool))           public  hasSubmitted;
    /// one submission per deployed-contract address per program (ONCHAIN_BUILD)
    mapping(uint256 => mapping(address => bool))           public  hasSubmittedContract;
    /// judge vote tracking: programId -> judgeAddr -> submissionId -> bool
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasVotedOn;
    /// votes cast per judge per program
    mapping(uint256 => mapping(address => uint256))        public  votesCast;
    /// pending claims for winners
    mapping(address => uint256)                            public  pendingClaims;

    // ── Events ────────────────────────────────────────────────────────────────

    event ProgramCreated(
        uint256 indexed programId,
        address indexed sponsor,
        string  name,
        uint256 totalPool,
        uint256 submissionDeadline,
        uint256 judgingDeadline
    );
    event Submitted(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed submitter,
        address projectContract,
        string  metadataURI
    );
    event Voted(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed judge,
        uint256 totalVotes
    );
    event Finalized(uint256 indexed programId, uint256 winnerCount);
    event PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank);
    event Claimed(address indexed recipient, uint256 amount);
    event Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount);
    event Cancelled(uint256 indexed programId, address indexed sponsor, uint256 refund);
    event FeeCollected(uint256 indexed programId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address usdc_, address feeRecipient_, uint256 feeBps_)
        Ownable(msg.sender)
    {
        if (usdc_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        usdc         = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        feeBps       = feeBps_;
    }

    // ── Owner functions ───────────────────────────────────────────────────────

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function setFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsUpdated(feeBps, newBps);
        feeBps = newBps;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * @notice Create a ranked-prize program.
     * @param prizes_             Array of prize amounts (6-decimal USDC).
     *                            prizes_[0] = 1st place, prizes_[1] = 2nd, …
     * @param submissionDeadline_ Unix timestamp when submissions close.
     * @param judgingDeadline_    Unix timestamp when judging closes (>= submissionDeadline_).
     * @param judges_             Addresses allowed to vote.
     */
    function createProgram(
        string    calldata name_,
        string    calldata description_,
        uint256[] calldata prizes_,
        uint256   submissionDeadline_,
        uint256   judgingDeadline_,
        address[] calldata judges_,
        ProgramType programType_,
        Category    category_
    ) external returns (uint256 programId) {
        if (prizes_.length == 0 || prizes_.length > MAX_PRIZES)          revert InvalidParams();
        if (submissionDeadline_ <= block.timestamp)                       revert InvalidParams();
        if (judgingDeadline_ < submissionDeadline_)                       revert InvalidParams();
        if (judges_.length == 0)                                          revert InvalidParams();

        uint256 totalPool = 0;
        for (uint256 i = 0; i < prizes_.length; i++) {
            if (prizes_[i] == 0) revert InvalidParams();
            totalPool += prizes_[i];
        }

        uint256 fee = (totalPool * feeBps) / 10_000;

        // Pull pool into contract, fee directly to feeRecipient
        usdc.safeTransferFrom(msg.sender, address(this), totalPool);
        if (fee > 0) {
            usdc.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        programId = programCount++;

        Program storage p = programs[programId];
        p.name               = name_;
        p.description        = description_;
        p.sponsor            = msg.sender;
        p.submissionDeadline = submissionDeadline_;
        p.judgingDeadline    = judgingDeadline_;
        p.programType        = programType_;
        p.category           = category_;
        p.totalDeposited     = totalPool;
        p.exists             = true;

        for (uint256 i = 0; i < prizes_.length; i++) {
            p.prizes.push(prizes_[i]);
        }
        for (uint256 i = 0; i < judges_.length; i++) {
            p.judges.push(judges_[i]);
        }

        totalFeesCollected += fee;

        emit ProgramCreated(programId, msg.sender, name_, totalPool, submissionDeadline_, judgingDeadline_);
        emit FeeCollected(programId, fee);
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    function submit(
        uint256 programId,
        address projectContract,
        string calldata metadataURI
    ) external {
        Program storage p = programs[programId];
        if (!p.exists)     revert ProgramNotFound();
        if (p.cancelled)   revert AlreadyCancelled();
        if (block.timestamp >= p.submissionDeadline) revert NotSubmissionPhase();
        if (_submissions[programId].length >= MAX_SUBMISSIONS_PER_PROGRAM) revert TooManySubmissions();

        // Conflict-of-interest: sponsor and judges cannot submit
        if (msg.sender == p.sponsor) revert ConflictOfInterest();
        if (_isJudge(p, msg.sender)) revert ConflictOfInterest();

        // Duplicate-submission guard
        if (hasSubmitted[programId][msg.sender]) revert AlreadySubmitted();

        // Program-type checks
        if (p.programType == ProgramType.ONCHAIN_BUILD) {
            if (!_hasCode(projectContract)) revert InvalidProjectContract();
            if (hasSubmittedContract[programId][projectContract]) revert AlreadySubmitted();
            hasSubmittedContract[programId][projectContract] = true;
        } else {
            // OPEN_BOUNTY: projectContract must be address(0)
            if (projectContract != address(0)) revert WrongProgramType();
        }

        hasSubmitted[programId][msg.sender] = true;

        uint256 submissionId = _submissions[programId].length;
        _submissions[programId].push(Submission({
            submitter:       msg.sender,
            projectContract: projectContract,
            metadataURI:     metadataURI,
            votes:           0,
            prizeAwarded:    0,
            claimed:         false,
            exists:          true
        }));

        emit Submitted(programId, submissionId, msg.sender, projectContract, metadataURI);
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    function vote(uint256 programId, uint256 submissionId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)   revert ProgramNotFound();
        if (p.cancelled) revert AlreadyCancelled();
        if (p.finalized) revert AlreadyFinalized();

        // Must be in Judging phase
        if (block.timestamp <  p.submissionDeadline) revert NotJudgingPhase();
        if (block.timestamp >= p.judgingDeadline)    revert NotJudgingPhase();

        if (!_isJudge(p, msg.sender)) revert NotJudge();

        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];

        // Cannot vote on own submission
        if (sub.submitter == msg.sender) revert ConflictOfInterest();

        // One vote per submission per judge
        if (hasVotedOn[programId][msg.sender][submissionId]) revert AlreadyVoted();

        // Each judge has prizes.length votes total
        if (votesCast[programId][msg.sender] >= p.prizes.length) revert InvalidParams();

        hasVotedOn[programId][msg.sender][submissionId] = true;
        votesCast[programId][msg.sender]++;
        sub.votes++;

        emit Voted(programId, submissionId, msg.sender, sub.votes);
    }

    // ── Finalize ──────────────────────────────────────────────────────────────

    /**
     * @notice Rank submissions by votes and assign prizes. Anyone may call
     *         after judgingDeadline. Idempotent check: reverts if already finalized.
     */
    function finalize(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)       revert ProgramNotFound();
        if (p.cancelled)     revert AlreadyCancelled();
        if (p.finalized)     revert AlreadyFinalized();
        if (block.timestamp < p.judgingDeadline) revert NotAfterJudgingDeadline();

        p.finalized = true;

        uint256 subCount = _submissions[programId].length;
        uint256 prizeCount = p.prizes.length;

        // Build sorted index array (insertion sort — safe up to MAX_SUBMISSIONS=100)
        // sorted[i] = submissionId with rank i
        uint256[] memory sorted = new uint256[](subCount);
        for (uint256 i = 0; i < subCount; i++) sorted[i] = i;

        for (uint256 i = 1; i < subCount; i++) {
            uint256 key = sorted[i];
            uint256 keyVotes = _submissions[programId][key].votes;
            int256 j = int256(i) - 1;
            while (j >= 0) {
                uint256 cmp = sorted[uint256(j)];
                uint256 cmpVotes = _submissions[programId][cmp].votes;
                // Higher votes first; ties → lower submissionId first (earlier wins)
                if (cmpVotes > keyVotes || (cmpVotes == keyVotes && cmp < key)) break;
                sorted[uint256(j + 1)] = cmp;
                j--;
            }
            sorted[uint256(j + 1)] = key;
        }

        uint256 winnerCount = 0;
        for (uint256 rank = 0; rank < prizeCount && rank < subCount; rank++) {
            uint256 sid = sorted[rank];
            Submission storage sub = _submissions[programId][sid];
            // Only submissions with >= 1 vote can win
            if (sub.votes == 0) break;
            sub.prizeAwarded = p.prizes[rank];
            pendingClaims[sub.submitter] += p.prizes[rank];
            winnerCount++;
            emit PrizeAssigned(programId, sid, sub.submitter, p.prizes[rank], rank);
        }

        emit Finalized(programId, winnerCount);
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    function claim() external nonReentrant {
        uint256 amount = pendingClaims[msg.sender];
        if (amount == 0) revert NothingToClaim();
        pendingClaims[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ── Reclaim ───────────────────────────────────────────────────────────────

    /**
     * @notice Sponsor reclaims unawarded pool after finalization.
     *         Fee is never returned.
     */
    function reclaim(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)           revert ProgramNotFound();
        if (msg.sender != p.sponsor) revert NotSponsor();
        if (!p.finalized)        revert NotFinalized();
        if (p.sponsorReclaimed)  revert NothingToReclaim();

        uint256 awarded = 0;
        uint256 subCount = _submissions[programId].length;
        for (uint256 i = 0; i < subCount; i++) {
            awarded += _submissions[programId][i].prizeAwarded;
        }

        uint256 residual = p.totalDeposited - awarded;
        if (residual == 0) revert NothingToReclaim();

        p.sponsorReclaimed = true;
        usdc.safeTransfer(p.sponsor, residual);
        emit Reclaimed(programId, p.sponsor, residual);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /**
     * @notice Sponsor may cancel before any submission exists.
     *         Returns the full prize pool (fee is not returned).
     */
    function cancel(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)                  revert ProgramNotFound();
        if (msg.sender != p.sponsor)    revert NotSponsor();
        if (p.cancelled)                revert AlreadyCancelled();
        if (_submissions[programId].length > 0) revert SubmissionsExist();

        p.cancelled = true;
        uint256 refund = p.totalDeposited;
        p.totalDeposited = 0;
        usdc.safeTransfer(p.sponsor, refund);
        emit Cancelled(programId, p.sponsor, refund);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getProgram(uint256 programId)
        external view
        returns (
            string  memory name,
            string  memory description,
            address sponsor,
            uint256[] memory prizes,
            uint256 totalDeposited,
            uint256 submissionDeadline,
            uint256 judgingDeadline,
            ProgramType programType,
            Category    category,
            bool    exists,
            bool    finalized,
            bool    cancelled
        )
    {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        return (
            p.name, p.description, p.sponsor, p.prizes, p.totalDeposited,
            p.submissionDeadline, p.judgingDeadline, p.programType, p.category,
            p.exists, p.finalized, p.cancelled
        );
    }

    function getJudges(uint256 programId) external view returns (address[] memory) {
        if (!programs[programId].exists) revert ProgramNotFound();
        return programs[programId].judges;
    }

    function submissionCount(uint256 programId) external view returns (uint256) {
        return _submissions[programId].length;
    }

    function getSubmission(uint256 programId, uint256 submissionId)
        external view
        returns (
            address submitter,
            address projectContract,
            string  memory metadataURI,
            uint256 votes,
            uint256 prizeAwarded,
            bool    claimed
        )
    {
        if (!programs[programId].exists)               revert ProgramNotFound();
        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];
        return (sub.submitter, sub.projectContract, sub.metadataURI, sub.votes, sub.prizeAwarded, sub.claimed);
    }

    function isJudge(uint256 programId, address account) external view returns (bool) {
        if (!programs[programId].exists) return false;
        return _isJudge(programs[programId], account);
    }

    function getPhase(uint256 programId) external view returns (Phase) {
        Program storage p = programs[programId];
        if (!p.exists)     revert ProgramNotFound();
        if (p.cancelled)   return Phase.Cancelled;
        if (p.finalized)   return Phase.Finalized;
        if (block.timestamp < p.submissionDeadline) return Phase.Submission;
        return Phase.Judging;
    }

    function votesRemaining(uint256 programId, address judge) external view returns (uint256) {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        uint256 cast = votesCast[programId][judge];
        uint256 total = p.prizes.length;
        return cast >= total ? 0 : total - cast;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _isJudge(Program storage p, address account) internal view returns (bool) {
        uint256 len = p.judges.length;
        for (uint256 i = 0; i < len; i++) {
            if (p.judges[i] == account) return true;
        }
        return false;
    }

    function _hasCode(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}
