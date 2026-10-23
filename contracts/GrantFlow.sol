// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GrantFlow is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    enum ProgramType {
        ONCHAIN_BUILD,
        OPEN_BOUNTY
    }

    enum Category {
        Hackathon,
        Bounty,
        Contest,
        Referral
    }

    error ProgramNotFound();
    error SubmissionNotFound();
    error NotReviewer();
    error AlreadyVoted();
    error AlreadyPaid();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error SlotsFull();
    error AlreadySubmitted();
    error InvalidProjectContract();
    error InvalidParams();
    error NotSponsor();
    error FeeTooHigh();
    error ZeroAddress();
    error WrongProgramType();
    error AlreadySubmittedWallet();

    struct Program {
        string name;
        uint256 prizeAmount;
        uint256 slots;
        uint256 deadline;
        address sponsor;
        address[] reviewers;
        uint256 threshold;
        uint256 slotsUsed;
        uint256 totalDeposited;
        bool exists;
        ProgramType programType;
        Category category;
        string description;
    }

    struct Submission {
        address submitter;
        address projectContract;
        string metadataURI;
        uint256 approvals;
        bool paid;
        bool exists;
        mapping(address => bool) hasVoted;
    }

    IERC20 public immutable usdc;

    mapping(uint256 => Program) public programs;
    mapping(uint256 => mapping(uint256 => Submission)) private submissions;
    mapping(uint256 => uint256) public submissionCount;
    mapping(uint256 => mapping(address => bool)) public hasSubmittedContract;
    /// OPEN_BOUNTY: one submission per wallet per program
    mapping(uint256 => mapping(address => bool)) public hasSubmittedWallet;
    mapping(address => uint256) public pendingClaims;
    uint256 public programCount;
    uint256 public constant MAX_FEE_BPS = 500; // 5%
    address public feeRecipient;
    uint256 public feeBps;
    uint256 public totalFeesCollected;

    event ProgramCreated(
        uint256 indexed programId,
        address indexed sponsor,
        string name,
        uint256 prizeAmount,
        uint256 slots,
        uint256 deadline
    );
    event Submitted(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed submitter,
        address projectContract,
        string metadataURI
    );
    event Approved(uint256 indexed programId, uint256 indexed submissionId, address indexed reviewer, uint256 totalApprovals);
    event PrizePaid(uint256 indexed programId, uint256 indexed submissionId, address indexed recipient, uint256 amount);
    event Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount);
    event Claimed(address indexed recipient, uint256 amount);
    event FeeCollected(uint256 indexed programId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);

    constructor(address usdc_, address feeRecipient_, uint256 feeBps_) Ownable(msg.sender) {
        if (usdc_ == address(0) || feeRecipient_ == address(0) || feeBps_ > MAX_FEE_BPS) revert InvalidParams();
        usdc = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    function createProgram(
        string calldata name,
        uint256 prizeAmount,
        uint256 slots,
        uint256 deadline,
        address[] calldata reviewers,
        uint256 threshold,
        ProgramType programType_,
        Category category_,
        string calldata description_
    ) external returns (uint256 programId) {
        if (prizeAmount == 0 || slots == 0 || deadline <= block.timestamp || threshold == 0 || reviewers.length < threshold) {
            revert InvalidParams();
        }

        uint256 totalRequired = prizeAmount * slots;
        uint256 fee = (totalRequired * feeBps) / 10_000;

        usdc.safeTransferFrom(msg.sender, address(this), totalRequired);
        if (fee > 0) {
            usdc.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        programId = programCount;
        programCount = programId + 1;

        Program storage program = programs[programId];
        program.name = name;
        program.prizeAmount = prizeAmount;
        program.slots = slots;
        program.deadline = deadline;
        program.sponsor = msg.sender;
        program.threshold = threshold;
        program.slotsUsed = 0;
        program.totalDeposited = totalRequired;
        program.exists = true;
        program.programType = programType_;
        program.category = category_;
        program.description = description_;

        for (uint256 i = 0; i < reviewers.length; i++) {
            program.reviewers.push(reviewers[i]);
        }

        totalFeesCollected += fee;

        emit ProgramCreated(programId, msg.sender, name, prizeAmount, slots, deadline);
        emit FeeCollected(programId, fee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    function setFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint256 old = feeBps;
        feeBps = newBps;
        emit FeeBpsUpdated(old, newBps);
    }

    function submit(uint256 programId, address projectContract, string calldata metadataURI) external {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();
        if (block.timestamp >= program.deadline) revert DeadlinePassed();
        if (program.slotsUsed >= program.slots) revert SlotsFull();

        if (program.programType == ProgramType.ONCHAIN_BUILD) {
            if (!_isDeployedContract(projectContract)) revert InvalidProjectContract();
            if (hasSubmittedContract[programId][projectContract]) revert AlreadySubmitted();
            hasSubmittedContract[programId][projectContract] = true;
        } else {
            if (projectContract != address(0)) revert WrongProgramType();
            if (hasSubmittedWallet[programId][msg.sender]) revert AlreadySubmittedWallet();
            hasSubmittedWallet[programId][msg.sender] = true;
        }

        uint256 submissionId = submissionCount[programId];
        submissionCount[programId] = submissionId + 1;

        Submission storage submission = submissions[programId][submissionId];
        submission.submitter = msg.sender;
        submission.projectContract = projectContract;
        submission.metadataURI = metadataURI;
        submission.approvals = 0;
        submission.paid = false;
        submission.exists = true;

        emit Submitted(programId, submissionId, msg.sender, projectContract, metadataURI);
    }

    function approve(uint256 programId, uint256 submissionId) external nonReentrant {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();
        if (block.timestamp > program.deadline) revert DeadlinePassed();

        Submission storage submission = submissions[programId][submissionId];
        if (!submission.exists) revert SubmissionNotFound();
        if (!isReviewer(programId, msg.sender)) revert NotReviewer();
        if (submission.hasVoted[msg.sender]) revert AlreadyVoted();
        if (submission.paid) revert AlreadyPaid();
        if (program.slotsUsed >= program.slots) revert SlotsFull();

        submission.hasVoted[msg.sender] = true;
        submission.approvals += 1;

        emit Approved(programId, submissionId, msg.sender, submission.approvals);

        if (submission.approvals >= program.threshold && !submission.paid && program.slotsUsed < program.slots) {
            submission.paid = true;
            program.slotsUsed += 1;
            pendingClaims[submission.submitter] += program.prizeAmount;
            emit PrizePaid(programId, submissionId, submission.submitter, program.prizeAmount);
        }
    }

    function reclaim(uint256 programId) external nonReentrant {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();
        if (msg.sender != program.sponsor) revert NotSponsor();
        if (block.timestamp <= program.deadline) revert DeadlineNotPassed();

        uint256 allocated = program.slotsUsed * program.prizeAmount;
        uint256 unallocated = program.totalDeposited - allocated;
        if (unallocated == 0) revert InvalidParams();

        program.totalDeposited = allocated;
        usdc.safeTransfer(program.sponsor, unallocated);

        emit Reclaimed(programId, program.sponsor, unallocated);
    }

    function claim() external nonReentrant {
        uint256 amount = pendingClaims[msg.sender];
        if (amount == 0) revert InvalidParams();
        pendingClaims[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function getProgram(uint256 programId)
        external
        view
        returns (
            string memory name,
            uint256 prizeAmount,
            uint256 slots,
            uint256 deadline,
            address sponsor,
            address[] memory reviewers,
            uint256 threshold,
            uint256 slotsUsed,
            uint256 totalDeposited,
            bool exists
        )
    {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();

        return (
            program.name,
            program.prizeAmount,
            program.slots,
            program.deadline,
            program.sponsor,
            program.reviewers,
            program.threshold,
            program.slotsUsed,
            program.totalDeposited,
            program.exists
        );
    }

    function getSubmission(uint256 programId, uint256 submissionId)
        external
        view
        returns (address submitter, address projectContract, string memory metadataURI, uint256 approvals, bool paid)
    {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();

        Submission storage submission = submissions[programId][submissionId];
        if (!submission.exists) revert SubmissionNotFound();

        return (
            submission.submitter,
            submission.projectContract,
            submission.metadataURI,
            submission.approvals,
            submission.paid
        );
    }

    function isReviewer(uint256 programId, address account) public view returns (bool) {
        Program storage program = programs[programId];
        if (!program.exists) return false;

        uint256 length = program.reviewers.length;
        for (uint256 i = 0; i < length; i++) {
            if (program.reviewers[i] == account) {
                return true;
            }
        }
        return false;
    }

    function getReviewers(uint256 programId) external view returns (address[] memory) {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();
        return program.reviewers;
    }

    function getProgramMeta(uint256 programId)
        external
        view
        returns (ProgramType programType, Category category, string memory description)
    {
        Program storage program = programs[programId];
        if (!program.exists) revert ProgramNotFound();
        return (program.programType, program.category, program.description);
    }

    function _isDeployedContract(address account) internal view returns (bool isContract) {
        assembly {
            isContract := gt(extcodesize(account), 0)
        }
    }
}
