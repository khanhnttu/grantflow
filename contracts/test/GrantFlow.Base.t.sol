// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";

// ---------------------------------------------------------------------------
// Minimal ERC-20 mock — no external imports needed; satisfies SafeERC20 usage
// (bool-returning transfer / transferFrom + allowance/approve).
// ---------------------------------------------------------------------------
contract MockERC20 {
    string public name;
    string public symbol;
    uint8  public decimals;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name     = _name;
        symbol   = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply    += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        return true;
    }
}

// ---------------------------------------------------------------------------
// Minimal deployed-contract stub — gives `extcodesize > 0` for projectContract
// ---------------------------------------------------------------------------
contract StubContract {}

// ---------------------------------------------------------------------------
// Shared base: actors, constants, mock token, GrantFlow instance.
// NO test/fuzz/invariant functions here — every category inherits this.
// ---------------------------------------------------------------------------
abstract contract GrantFlowBase is Test {
    // ── actors ──────────────────────────────────────────────────────────────
    address internal sponsor      = makeAddr("sponsor");
    address internal reviewer1    = makeAddr("reviewer1");
    address internal reviewer2    = makeAddr("reviewer2");
    address internal alice        = makeAddr("alice");        // submitter
    address internal bob          = makeAddr("bob");          // extra submitter
    address internal feeRecipient = makeAddr("feeRecipient"); // platform wallet

    // ── token & contract under test ─────────────────────────────────────────
    MockERC20  internal usdc;
    GrantFlow  internal gf;
    StubContract internal stub;

    // ── program defaults ────────────────────────────────────────────────────
    uint256 internal constant PRIZE           = 100e6;  // 100 USDC per slot
    uint256 internal constant SLOTS           = 3;
    uint256 internal constant DEADLINE_OFFSET = 7 days;
    uint256 internal constant THRESHOLD       = 2;
    uint256 internal constant DEFAULT_FEE_BPS = 100;    // 1% platform fee

    // convenience: funded deadline
    function _deadline() internal view returns (uint256) {
        return block.timestamp + DEADLINE_OFFSET;
    }

    // ── setUp ────────────────────────────────────────────────────────────────
    function setUp() public virtual {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        gf   = new GrantFlow(address(usdc), feeRecipient, DEFAULT_FEE_BPS);
        stub = new StubContract();

        // Fund sponsor generously: prize pool + fee overhead
        usdc.mint(sponsor, PRIZE * SLOTS * 20);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Compute total USDC the sponsor must approve: prize pool + fee.
    function _totalCost(uint256 prizeAmount, uint256 slots) internal pure returns (uint256) {
        uint256 pool = prizeAmount * slots;
        uint256 fee  = (pool * DEFAULT_FEE_BPS) / 10_000;
        return pool + fee;
    }

    /// Create a default ONCHAIN_BUILD program (threshold=2, slots=SLOTS) and return its id.
    function _createDefaultProgram() internal returns (uint256 programId) {
        address[] memory reviewers = new address[](2);
        reviewers[0] = reviewer1;
        reviewers[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));
        programId = gf.createProgram(
            "Test Program", PRIZE, SLOTS, _deadline(), reviewers, THRESHOLD,
            GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, ""
        );
        vm.stopPrank();
    }

    /// Create an OPEN_BOUNTY program with 1 reviewer (threshold=1) and return its id.
    function _createOpenBountyProgram() internal returns (uint256 programId) {
        address[] memory reviewers = new address[](1);
        reviewers[0] = reviewer1;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));
        programId = gf.createProgram(
            "Open Bounty", PRIZE, SLOTS, _deadline(), reviewers, 1,
            GrantFlow.ProgramType.OPEN_BOUNTY, GrantFlow.Category.Bounty, "A test bounty"
        );
        vm.stopPrank();
    }

    /// Submit alice's stub contract to an ONCHAIN_BUILD program; returns submissionId.
    function _submitAlice(uint256 programId) internal returns (uint256 submissionId) {
        vm.prank(alice);
        gf.submit(programId, address(stub), "ipfs://alice");
        submissionId = gf.submissionCount(programId) - 1;
    }

    /// Submit alice to an OPEN_BOUNTY program (projectContract == address(0)).
    function _submitAliceBounty(uint256 programId) internal returns (uint256 submissionId) {
        vm.prank(alice);
        gf.submit(programId, address(0), "https://alice-bounty.example.com");
        submissionId = gf.submissionCount(programId) - 1;
    }

    /// Submit bob to an OPEN_BOUNTY program.
    function _submitBobBounty(uint256 programId) internal returns (uint256 submissionId) {
        vm.prank(bob);
        gf.submit(programId, address(0), "https://bob-bounty.example.com");
        submissionId = gf.submissionCount(programId) - 1;
    }

    /// Reach threshold approvals (both reviewers) for a submission.
    function _approveToThreshold(uint256 programId, uint256 submissionId) internal {
        vm.prank(reviewer1);
        gf.approve(programId, submissionId);
        vm.prank(reviewer2);
        gf.approve(programId, submissionId);
    }
}
