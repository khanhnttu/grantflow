// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GrantFlowV5
 * @notice Ranked-prize hackathon/bounty contract with team submissions and push payouts.
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
 * Team submissions:
 *   A builder may submit solo (payees = [submitter], sharesBps = [10000]) or as a
 *   team (payees = up to MAX_TEAM_SIZE members, sharesBps must sum to 10_000).
 *   Team name can be embedded in the metadataURI JSON.
 *   Each wallet address may appear in at most one submission per program (as leader
 *   or as a team member). Judges and sponsor cannot be members.
 *   In finalize(), each member receives prize * sharesBps[i] / 10_000.
 *   Rounding dust (sum of truncated amounts < prize) is given to payees[0] (leader).
 *
 * Conflict-of-interest guards:
 *   - Sponsor cannot submit / be a team member.
 *   - Judges cannot submit / be a team member.
 *   - One submission slot per wallet per program (leader or member).
 *   - Judges vote only in Judging phase; max 1 vote per submission; cannot vote
 *     on their own submission.
 *   - Each judge has exactly prizes.length votes total.
 *
 * Finalization (anyone may call after judgingDeadline):
 *   Ranks all submissions by vote count DESC, tie-broken by earlier submissionId.
 *   Only submissions with >= 1 vote can win. Assigns prizes[i] to rank i and
 *   push-pays each team member their proportional share via safeTransfer.
 *   Rounding dust goes to payees[0] (submission leader / submitter).
 *   Unawarded residual is auto-refunded to sponsor.
 *   MAX_SUBMISSIONS_PER_PROGRAM = 100 for gas safety.
 *
 * Cancel: sponsor may cancel() before any submission for a full pool refund.
 */
contract GrantFlowV5 is ReentrancyGuard, Ownable2Step {
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
    error AlreadyCancelled();
    error SubmissionsExist();
    error AlreadyRefunded();
    error InvalidShares();      // sharesBps don't sum to 10_000
    error DuplicateMember();    // wallet appears in more than one submission slot
    error TooManyMembers();     // team exceeds MAX_TEAM_SIZE

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant MAX_FEE_BPS = 500;
    uint256 public constant MAX_SUBMISSIONS_PER_PROGRAM = 100;
    uint256 public constant MAX_PRIZES = 20;   // ranks per program
    uint256 public constant MAX_TEAM_SIZE = 5; // leader + up to 4 more
    uint256 public constant SHARES_DENOM  = 10_000; // basis points denominator

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
        bool          sponsorRefunded;
    }

    struct Submission {
        address   submitter;          // team leader / solo builder
        address   projectContract;    // address(0) for OPEN_BOUNTY
        string    metadataURI;        // team name lives in JSON here
        uint256   votes;
        uint256   prizeAwarded;       // total prize for this submission
        bool      paid;               // true after finalize pays this submission
        bool      exists;
        // Team payout split (set once at submit time, never changed)
        address[] payees;             // payees[0] == submitter (leader)
        uint256[] sharesBps;          // sharesBps[i] ∈ (0, 10_000]; sum == 10_000
    }

    // ── State ─────────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public feeRecipient;
    uint256 public feeBps;
    uint256 public totalFeesCollected;
    uint256 public programCount;

    mapping(uint256 => Program)    public programs;
    mapping(uint256 => Submission[]) private _submissions;

    /// submission slot guard: leader and every team member consume one slot per program
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    /// ONCHAIN_BUILD: one submission per deployed contract per program
    mapping(uint256 => mapping(address => bool)) public hasSubmittedContract;

    /// vote tracking
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasVotedOn;
    mapping(uint256 => mapping(address => uint256))                  public votesCast;

    // ── Events ────────────────────────────────────────────────────────────────

    event ProgramCreated(
        uint256 indexed programId,
        address indexed sponsor,
        string  name,
        uint256 totalPool,
        uint256 submissionDeadline,
        uint256 judgingDeadline
    );
    event ProgramUpdated(uint256 indexed programId, address indexed sponsor);
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
    /// Emitted once per team member per winning submission.
    event PrizePaid(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed recipient,
        uint256 amount,
        uint256 rank
    );
    event SponsorRefunded(uint256 indexed programId, address indexed sponsor, uint256 amount);
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
        if (prizes_.length == 0 || prizes_.length > MAX_PRIZES) revert InvalidParams();
        if (submissionDeadline_ <= block.timestamp)             revert InvalidParams();
        if (judgingDeadline_ < submissionDeadline_)             revert InvalidParams();
        if (judges_.length == 0)                                revert InvalidParams();

        uint256 totalPool = 0;
        for (uint256 i = 0; i < prizes_.length; i++) {
            if (prizes_[i] == 0) revert InvalidParams();
            totalPool += prizes_[i];
        }

        uint256 fee = (totalPool * feeBps) / 10_000;

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

        for (uint256 i = 0; i < prizes_.length; i++) p.prizes.push(prizes_[i]);
        for (uint256 i = 0; i < judges_.length;  i++) p.judges.push(judges_[i]);

        totalFeesCollected += fee;

        emit ProgramCreated(programId, msg.sender, name_, totalPool, submissionDeadline_, judgingDeadline_);
        emit FeeCollected(programId, fee);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    function updateProgram(
        uint256 programId,
        string calldata name_,
        string calldata description_,
        uint256 submissionDeadline_,
        uint256 judgingDeadline_
    ) external {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        if (msg.sender != p.sponsor) revert NotSponsor();
        if (p.cancelled) revert AlreadyCancelled();
        if (p.finalized) revert AlreadyFinalized();
        if (_submissions[programId].length > 0) revert SubmissionsExist();
        if (block.timestamp >= p.submissionDeadline) revert NotSubmissionPhase();
        if (submissionDeadline_ <= block.timestamp)  revert InvalidParams();
        if (judgingDeadline_ <= submissionDeadline_) revert InvalidParams();

        p.name = name_;
        p.description = description_;
        p.submissionDeadline = submissionDeadline_;
        p.judgingDeadline = judgingDeadline_;

        emit ProgramUpdated(programId, p.sponsor);
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    /**
     * @notice Submit to a program.
     * @param programId      Target program.
     * @param projectContract  address(0) for OPEN_BOUNTY; deployed contract for ONCHAIN_BUILD.
     * @param metadataURI    Link / IPFS URI for the submission. JSON may include "teamName".
     * @param payees_        Team member wallets. payees_[0] MUST equal msg.sender (leader).
     *                       Solo submission: pass [msg.sender] with sharesBps_ = [10000].
     *                       Team submission: 2–MAX_TEAM_SIZE members, sharesBps_ sum == 10_000.
     * @param sharesBps_     Prize share in basis points per member. sum MUST equal 10_000.
     */
    function submit(
        uint256 programId,
        address projectContract,
        string calldata metadataURI,
        address[] calldata payees_,
        uint256[] calldata sharesBps_
    ) external {
        Program storage p = programs[programId];
        if (!p.exists)   revert ProgramNotFound();
        if (p.cancelled) revert AlreadyCancelled();
        if (block.timestamp >= p.submissionDeadline) revert NotSubmissionPhase();
        if (_submissions[programId].length >= MAX_SUBMISSIONS_PER_PROGRAM) revert TooManySubmissions();

        // Validate team arrays
        if (payees_.length == 0 || payees_.length > MAX_TEAM_SIZE) revert InvalidParams();
        if (payees_.length != sharesBps_.length) revert InvalidParams();
        if (payees_[0] != msg.sender) revert InvalidParams(); // leader must be caller

        // Validate shares sum to 10_000
        uint256 sharesSum = 0;
        for (uint256 i = 0; i < sharesBps_.length; i++) {
            if (sharesBps_[i] == 0) revert InvalidShares();
            sharesSum += sharesBps_[i];
        }
        if (sharesSum != SHARES_DENOM) revert InvalidShares();

        // Conflict-of-interest: sponsor and judges cannot be leader OR member
        for (uint256 i = 0; i < payees_.length; i++) {
            if (payees_[i] == p.sponsor)          revert ConflictOfInterest();
            if (_isJudge(p, payees_[i]))           revert ConflictOfInterest();
        }

        // Check for zero addresses and intra-team duplicates (pairwise)
        for (uint256 i = 0; i < payees_.length; i++) {
            if (payees_[i] == address(0)) revert ZeroAddress();
            for (uint256 j = i + 1; j < payees_.length; j++) {
                if (payees_[i] == payees_[j]) revert DuplicateMember();
            }
        }

        // Cross-submission duplicate guard: each wallet can appear in only one submission per program
        for (uint256 i = 0; i < payees_.length; i++) {
            if (hasSubmitted[programId][payees_[i]]) revert AlreadySubmitted();
        }

        // ONCHAIN_BUILD checks
        if (p.programType == ProgramType.ONCHAIN_BUILD) {
            if (!_hasCode(projectContract)) revert InvalidProjectContract();
            if (hasSubmittedContract[programId][projectContract]) revert AlreadySubmitted();
            hasSubmittedContract[programId][projectContract] = true;
        } else {
            if (projectContract != address(0)) revert WrongProgramType();
        }

        // Mark all payees as submitted (consumes their slot)
        for (uint256 i = 0; i < payees_.length; i++) {
            hasSubmitted[programId][payees_[i]] = true;
        }

        // Check for duplicate wallet within same team (after marking, so first duplicate is caught)
        // Detect within-team duplicates before marking by checking pairwise
        // (already caught by hasSubmitted above on the second occurrence)

        uint256 submissionId = _submissions[programId].length;
        Submission storage sub = _submissions[programId].push();
        sub.submitter       = msg.sender;
        sub.projectContract = projectContract;
        sub.metadataURI     = metadataURI;
        sub.votes           = 0;
        sub.prizeAwarded    = 0;
        sub.paid            = false;
        sub.exists          = true;

        for (uint256 i = 0; i < payees_.length;   i++) sub.payees.push(payees_[i]);
        for (uint256 i = 0; i < sharesBps_.length; i++) sub.sharesBps.push(sharesBps_[i]);

        emit Submitted(programId, submissionId, msg.sender, projectContract, metadataURI);
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    function vote(uint256 programId, uint256 submissionId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)   revert ProgramNotFound();
        if (p.cancelled) revert AlreadyCancelled();
        if (p.finalized) revert AlreadyFinalized();

        if (block.timestamp <  p.submissionDeadline) revert NotJudgingPhase();
        if (block.timestamp >= p.judgingDeadline)    revert NotJudgingPhase();

        if (!_isJudge(p, msg.sender)) revert NotJudge();

        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];

        if (sub.submitter == msg.sender) revert ConflictOfInterest();
        if (hasVotedOn[programId][msg.sender][submissionId]) revert AlreadyVoted();
        if (votesCast[programId][msg.sender] >= p.prizes.length) revert InvalidParams();

        hasVotedOn[programId][msg.sender][submissionId] = true;
        votesCast[programId][msg.sender]++;
        sub.votes++;

        emit Voted(programId, submissionId, msg.sender, sub.votes);
    }

    // ── Finalize ──────────────────────────────────────────────────────────────

    /**
     * @notice Rank submissions and push-pay each member their share.
     *         Anyone may call after judgingDeadline. Idempotent check: reverts if already finalized.
     *         Rounding dust from integer division goes to payees[0] (leader).
     */
    function finalize(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)       revert ProgramNotFound();
        if (p.cancelled)     revert AlreadyCancelled();
        if (p.finalized)     revert AlreadyFinalized();
        if (block.timestamp < p.judgingDeadline) revert NotAfterJudgingDeadline();

        p.finalized = true;

        uint256 subCount   = _submissions[programId].length;
        uint256 prizeCount = p.prizes.length;

        // Insertion sort — safe up to MAX_SUBMISSIONS=100
        uint256[] memory sorted = new uint256[](subCount);
        for (uint256 i = 0; i < subCount; i++) sorted[i] = i;

        for (uint256 i = 1; i < subCount; i++) {
            uint256 key      = sorted[i];
            uint256 keyVotes = _submissions[programId][key].votes;
            int256  j        = int256(i) - 1;
            while (j >= 0) {
                uint256 cmp      = sorted[uint256(j)];
                uint256 cmpVotes = _submissions[programId][cmp].votes;
                if (cmpVotes > keyVotes || (cmpVotes == keyVotes && cmp < key)) break;
                sorted[uint256(j + 1)] = cmp;
                j--;
            }
            sorted[uint256(j + 1)] = key;
        }

        uint256 winnerCount  = 0;
        uint256 totalAwarded = 0;

        for (uint256 rank = 0; rank < prizeCount && rank < subCount; rank++) {
            uint256 sid = sorted[rank];
            Submission storage sub = _submissions[programId][sid];
            if (sub.votes == 0) break;

            uint256 prize = p.prizes[rank];
            sub.prizeAwarded = prize;
            sub.paid = true;
            totalAwarded += prize;

            // Pay each team member their proportional share
            uint256 paidSoFar = 0;
            for (uint256 m = 1; m < sub.payees.length; m++) {
                uint256 share = (prize * sub.sharesBps[m]) / SHARES_DENOM;
                paidSoFar += share;
                usdc.safeTransfer(sub.payees[m], share);
                emit PrizePaid(programId, sid, sub.payees[m], share, rank);
            }
            // Leader (payees[0]) receives the remainder (includes any rounding dust)
            uint256 leaderShare = prize - paidSoFar;
            usdc.safeTransfer(sub.payees[0], leaderShare);
            emit PrizePaid(programId, sid, sub.payees[0], leaderShare, rank);

            winnerCount++;
        }

        uint256 residual = p.totalDeposited - totalAwarded;
        if (residual > 0) {
            usdc.safeTransfer(p.sponsor, residual);
            p.sponsorRefunded = true;
            emit SponsorRefunded(programId, p.sponsor, residual);
        }

        emit Finalized(programId, winnerCount);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    function cancel(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)                          revert ProgramNotFound();
        if (msg.sender != p.sponsor)            revert NotSponsor();
        if (p.cancelled)                        revert AlreadyCancelled();
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

    /**
     * @notice Read scalar fields of a submission (votes, prize, etc.).
     *         Use getSubmissionTeam() to read the payees/sharesBps arrays.
     */
    function getSubmission(uint256 programId, uint256 submissionId)
        external view
        returns (
            address submitter,
            address projectContract,
            string  memory metadataURI,
            uint256 votes,
            uint256 prizeAwarded,
            bool    paid
        )
    {
        if (!programs[programId].exists)                    revert ProgramNotFound();
        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];
        return (sub.submitter, sub.projectContract, sub.metadataURI, sub.votes, sub.prizeAwarded, sub.paid);
    }

    /**
     * @notice Read the team payout arrays for a submission.
     * @return payees_    Ordered list of team member wallets (payees[0] == leader).
     * @return sharesBps_ Corresponding share in basis points (sum == 10_000).
     */
    function getSubmissionTeam(uint256 programId, uint256 submissionId)
        external view
        returns (address[] memory payees_, uint256[] memory sharesBps_)
    {
        if (!programs[programId].exists)                    revert ProgramNotFound();
        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];
        return (sub.payees, sub.sharesBps);
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
        uint256 cast  = votesCast[programId][judge];
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
