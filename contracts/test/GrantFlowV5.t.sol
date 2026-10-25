// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlowV5} from "../GrantFlowV5.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Mock USDC — 6 decimals, mintable
// ─────────────────────────────────────────────────────────────────────────────
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────
contract GrantFlowV5Test is Test {

    // ── Actors ────────────────────────────────────────────────────────────────
    address internal sponsor  = makeAddr("sponsor");
    address internal judge1   = makeAddr("judge1");
    address internal judge2   = makeAddr("judge2");
    address internal builder1 = makeAddr("builder1");
    address internal builder2 = makeAddr("builder2");
    address internal member1  = makeAddr("member1");
    address internal member2  = makeAddr("member2");
    address internal member3  = makeAddr("member3");
    address internal stranger = makeAddr("stranger");

    // ── Contract under test & mock ────────────────────────────────────────────
    MockUSDC    internal usdc;
    GrantFlowV5 internal gf;

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 internal constant FEE_BPS   = 100;
    uint256 internal constant PRIZE_SUM = 1_000_000; // 1 USDC

    uint256 internal constant P0 = 600_000;
    uint256 internal constant P1 = 300_000;
    uint256 internal constant P2 = 100_000;

    uint256 internal constant EXPECTED_FEE = 10_000; // 1% of 1_000_000

    // ── setUp ─────────────────────────────────────────────────────────────────
    function setUp() public {
        usdc = new MockUSDC();
        gf   = new GrantFlowV5(address(usdc), address(this), FEE_BPS);
        usdc.mint(sponsor, 10 * (PRIZE_SUM + EXPECTED_FEE));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _prizes3() internal pure returns (uint256[] memory p) {
        p = new uint256[](3);
        p[0] = P0; p[1] = P1; p[2] = P2;
    }

    function _judges2() internal view returns (address[] memory j) {
        j = new address[](2);
        j[0] = judge1; j[1] = judge2;
    }

    function _approvalAmount() internal pure returns (uint256) {
        return PRIZE_SUM + EXPECTED_FEE;
    }

    /// @dev Solo submit helper (single-member team)
    function _soloPayees(address leader) internal pure returns (address[] memory p, uint256[] memory s) {
        p = new address[](1); p[0] = leader;
        s = new uint256[](1); s[0] = 10_000;
    }

    function createDefaultProgram() internal returns (uint256 programId) {
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _approvalAmount());
        programId = gf.createProgram(
            "Default Program", "A default test program",
            _prizes3(),
            block.timestamp + 1 days,
            block.timestamp + 2 days,
            _judges2(),
            GrantFlowV5.ProgramType.OPEN_BOUNTY,
            GrantFlowV5.Category.Hackathon
        );
        vm.stopPrank();
    }

    function warpToJudging()   internal { skip(1 days + 1); }
    function warpAfterJudging() internal { skip(2 days + 1); }

    // ─────────────────────────────────────────────────────────────────────────
    // createProgram
    // ─────────────────────────────────────────────────────────────────────────

    function test_createProgram_succeeds() public {
        uint256 pid = createDefaultProgram();
        assertEq(gf.programCount(), 1);
        assertEq(pid, 0);
        (,, address storedSponsor, uint256[] memory prizes, uint256 totalDeposited,,,,, bool exists,,) = gf.getProgram(pid);
        assertTrue(exists);
        assertEq(storedSponsor, sponsor);
        assertEq(totalDeposited, PRIZE_SUM);
        assertEq(prizes.length, 3);
    }

    function test_createProgram_feeSentToRecipient() public {
        uint256 before = usdc.balanceOf(address(this));
        createDefaultProgram();
        assertEq(usdc.balanceOf(address(this)) - before, EXPECTED_FEE);
    }

    function test_createProgram_revertsOnEmptyPrizes() public {
        uint256[] memory empty = new uint256[](0);
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _approvalAmount());
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.createProgram("X","Y",empty,block.timestamp+1 days,block.timestamp+2 days,_judges2(),GrantFlowV5.ProgramType.OPEN_BOUNTY,GrantFlowV5.Category.Hackathon);
        vm.stopPrank();
    }

    function test_createProgram_revertsOnPastDeadline() public {
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _approvalAmount());
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.createProgram("X","Y",_prizes3(),block.timestamp,block.timestamp+2 days,_judges2(),GrantFlowV5.ProgramType.OPEN_BOUNTY,GrantFlowV5.Category.Hackathon);
        vm.stopPrank();
    }

    function test_createProgram_revertsOnNoJudges() public {
        address[] memory noJudges = new address[](0);
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _approvalAmount());
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.createProgram("X","Y",_prizes3(),block.timestamp+1 days,block.timestamp+2 days,noJudges,GrantFlowV5.ProgramType.OPEN_BOUNTY,GrantFlowV5.Category.Hackathon);
        vm.stopPrank();
    }

    function test_createProgram_revertsWhenJudgingBeforeSubmission() public {
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _approvalAmount());
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.createProgram("X","Y",_prizes3(),block.timestamp+2 days,block.timestamp+1 days,_judges2(),GrantFlowV5.ProgramType.OPEN_BOUNTY,GrantFlowV5.Category.Hackathon);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // submit — solo
    // ─────────────────────────────────────────────────────────────────────────

    function test_submit_soloSucceeds() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);

        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://builder1", pay, shr);

        assertEq(gf.submissionCount(pid), 1);
        assertTrue(gf.hasSubmitted(pid, builder1));

        (address submitter,,,,, bool paid) = gf.getSubmission(pid, 0);
        assertEq(submitter, builder1);
        assertFalse(paid);

        (address[] memory retPay, uint256[] memory retShr) = gf.getSubmissionTeam(pid, 0);
        assertEq(retPay.length, 1);
        assertEq(retPay[0], builder1);
        assertEq(retShr[0], 10_000);
    }

    function test_submit_revertsAfterDeadline() public {
        uint256 pid = createDefaultProgram();
        warpToJudging();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.NotSubmissionPhase.selector);
        gf.submit(pid, address(0), "ipfs://late", pay, shr);
    }

    function test_submit_revertsForSponsor() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(sponsor);
        vm.prank(sponsor);
        vm.expectRevert(GrantFlowV5.ConflictOfInterest.selector);
        gf.submit(pid, address(0), "ipfs://sponsor", pay, shr);
    }

    function test_submit_revertsForJudge() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(judge1);
        vm.prank(judge1);
        vm.expectRevert(GrantFlowV5.ConflictOfInterest.selector);
        gf.submit(pid, address(0), "ipfs://judge", pay, shr);
    }

    function test_submit_revertsOnDuplicate() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://first", pay, shr);
        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.AlreadySubmitted.selector);
        gf.submit(pid, address(0), "ipfs://second", pay, shr);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // submit — team
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev 3-member team: builder1 (leader 50%), member1 (30%), member2 (20%)
    function _teamPayees3()
        internal view
        returns (address[] memory pay, uint256[] memory shr)
    {
        pay = new address[](3);
        pay[0] = builder1; pay[1] = member1; pay[2] = member2;
        shr = new uint256[](3);
        shr[0] = 5_000; shr[1] = 3_000; shr[2] = 2_000; // sum = 10_000
    }

    function test_submit_teamSucceeds() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _teamPayees3();

        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://team1", pay, shr);

        assertEq(gf.submissionCount(pid), 1);
        assertTrue(gf.hasSubmitted(pid, builder1));
        assertTrue(gf.hasSubmitted(pid, member1));
        assertTrue(gf.hasSubmitted(pid, member2));

        (address[] memory retPay, uint256[] memory retShr) = gf.getSubmissionTeam(pid, 0);
        assertEq(retPay.length, 3);
        assertEq(retPay[0], builder1);
        assertEq(retPay[1], member1);
        assertEq(retShr[0], 5_000);
        assertEq(retShr[1], 3_000);
        assertEq(retShr[2], 2_000);
    }

    function test_submit_teamRevertsOnInvalidShares() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = member1;
        uint256[] memory shr = new uint256[](2);
        shr[0] = 5_000; shr[1] = 4_999; // sum = 9_999, not 10_000

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.InvalidShares.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    function test_submit_teamRevertsOnSharesOverflowingDenom() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = member1;
        uint256[] memory shr = new uint256[](2);
        shr[0] = 6_000; shr[1] = 5_000; // sum = 11_000, not 10_000

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.InvalidShares.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    function test_submit_teamRevertsOnZeroShare() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = member1;
        uint256[] memory shr = new uint256[](2);
        shr[0] = 10_000; shr[1] = 0; // zero share

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.InvalidShares.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    function test_submit_teamRevertsOnDuplicateMember() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = builder1; // intra-team duplicate
        uint256[] memory shr = new uint256[](2);
        shr[0] = 5_000; shr[1] = 5_000;

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.DuplicateMember.selector);
        gf.submit(pid, address(0), "ipfs://dup", pay, shr);
    }

    function test_submit_teamRevertsOnMaxMembers() public {
        uint256 pid = createDefaultProgram();
        // 6 members exceeds MAX_TEAM_SIZE = 5
        address[] memory pay = new address[](6);
        uint256[] memory shr = new uint256[](6);
        pay[0] = builder1;
        for (uint256 i = 1; i < 6; i++) {
            pay[i] = makeAddr(string(abi.encodePacked("extra", i)));
            shr[i] = 1_000;
        }
        shr[0] = 5_000; // sum = 5000 + 5*1000 = 10_000

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.submit(pid, address(0), "ipfs://big", pay, shr);
    }

    function test_submit_teamMemberBlockedFromSecondSubmission() public {
        uint256 pid = createDefaultProgram();
        // builder1 + member1 form a team
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = member1;
        uint256[] memory shr = new uint256[](2);
        shr[0] = 6_000; shr[1] = 4_000;

        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://team", pay, shr);

        // member1 tries to lead their own submission
        (address[] memory pay2, uint256[] memory shr2) = _soloPayees(member1);
        vm.prank(member1);
        vm.expectRevert(GrantFlowV5.AlreadySubmitted.selector);
        gf.submit(pid, address(0), "ipfs://solo", pay2, shr2);
    }

    function test_submit_teamRevertsIfSponsorInTeam() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = sponsor; // sponsor as member
        uint256[] memory shr = new uint256[](2);
        shr[0] = 6_000; shr[1] = 4_000;

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.ConflictOfInterest.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    function test_submit_teamRevertsIfJudgeInTeam() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = judge1; // judge as member
        uint256[] memory shr = new uint256[](2);
        shr[0] = 6_000; shr[1] = 4_000;

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.ConflictOfInterest.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    function test_submit_teamRevertsLeaderNotCaller() public {
        uint256 pid = createDefaultProgram();
        address[] memory pay = new address[](2);
        pay[0] = member1; pay[1] = builder1; // builder1 is caller, but not pay[0]
        uint256[] memory shr = new uint256[](2);
        shr[0] = 6_000; shr[1] = 4_000;

        vm.prank(builder1);
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.submit(pid, address(0), "ipfs://bad", pay, shr);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // vote
    // ─────────────────────────────────────────────────────────────────────────

    function test_vote_succeeds() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://b1", pay, shr);

        warpToJudging();
        vm.prank(judge1);
        gf.vote(pid, 0);

        (,,, uint256 votes,,) = gf.getSubmission(pid, 0);
        assertEq(votes, 1);
        assertTrue(gf.hasVotedOn(pid, judge1, 0));
        assertEq(gf.votesCast(pid, judge1), 1);
    }

    function test_vote_revertsNonJudge() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://b1", pay, shr);
        warpToJudging();
        vm.prank(stranger);
        vm.expectRevert(GrantFlowV5.NotJudge.selector);
        gf.vote(pid, 0);
    }

    function test_vote_revertsAlreadyVoted() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://b1", pay, shr);
        warpToJudging();
        vm.prank(judge1);
        gf.vote(pid, 0);
        vm.prank(judge1);
        vm.expectRevert(GrantFlowV5.AlreadyVoted.selector);
        gf.vote(pid, 0);
    }

    function test_vote_revertsExceedsBudget() public {
        uint256 pid = createDefaultProgram();
        address b3 = makeAddr("b3"); address b4 = makeAddr("b4");
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        (address[] memory p2, uint256[] memory s2) = _soloPayees(builder2);
        (address[] memory p3, uint256[] memory s3) = _soloPayees(b3);
        (address[] memory p4, uint256[] memory s4) = _soloPayees(b4);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", p1, s1);
        vm.prank(builder2); gf.submit(pid, address(0), "ipfs://b2", p2, s2);
        vm.prank(b3);       gf.submit(pid, address(0), "ipfs://b3", p3, s3);
        vm.prank(b4);       gf.submit(pid, address(0), "ipfs://b4", p4, s4);
        warpToJudging();
        vm.startPrank(judge1);
        gf.vote(pid, 0); gf.vote(pid, 1); gf.vote(pid, 2);
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.vote(pid, 3);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // finalize — solo push payouts
    // ─────────────────────────────────────────────────────────────────────────

    function test_finalize_soloPaysTwoWinners() public {
        uint256 pid = createDefaultProgram();
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        (address[] memory p2, uint256[] memory s2) = _soloPayees(builder2);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", p1, s1);
        vm.prank(builder2); gf.submit(pid, address(0), "ipfs://b2", p2, s2);
        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0);
        vm.prank(judge2); gf.vote(pid, 1);
        uint256 b1Before = usdc.balanceOf(builder1);
        uint256 b2Before = usdc.balanceOf(builder2);
        warpAfterJudging();
        gf.finalize(pid);
        // sub0 vs sub1 both have 1 vote; sub0 (lower id) → rank 0
        assertEq(usdc.balanceOf(builder1) - b1Before, P0, "builder1 rank0");
        assertEq(usdc.balanceOf(builder2) - b2Before, P1, "builder2 rank1");
    }

    function test_finalize_autoRefundsSponsor() public {
        uint256 pid = createDefaultProgram();
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", p1, s1);
        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0);
        uint256 sponsorBefore = usdc.balanceOf(sponsor);
        warpAfterJudging();
        gf.finalize(pid);
        assertEq(usdc.balanceOf(sponsor) - sponsorBefore, PRIZE_SUM - P0, "sponsor residual");
    }

    function test_finalize_noWinnersRefundsFullPool() public {
        uint256 pid = createDefaultProgram();
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", p1, s1);
        uint256 sponsorBefore = usdc.balanceOf(sponsor);
        warpAfterJudging();
        gf.finalize(pid);
        assertEq(usdc.balanceOf(sponsor) - sponsorBefore, PRIZE_SUM, "full pool to sponsor");
    }

    function test_finalize_revertsBeforeDeadline() public {
        uint256 pid = createDefaultProgram();
        warpToJudging();
        vm.expectRevert(GrantFlowV5.NotAfterJudgingDeadline.selector);
        gf.finalize(pid);
    }

    function test_finalize_revertsIfAlreadyFinalized() public {
        uint256 pid = createDefaultProgram();
        warpAfterJudging();
        gf.finalize(pid);
        vm.expectRevert(GrantFlowV5.AlreadyFinalized.selector);
        gf.finalize(pid);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // finalize — team split math
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Team: builder1 50%, member1 30%, member2 20%.  Prize = P0 = 600_000.
    ///      Expected: builder1 = 300_000, member1 = 180_000, member2 = 120_000.
    function test_finalize_teamSplitExact() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _teamPayees3();

        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://team1", pay, shr);

        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0);

        uint256 b1Before = usdc.balanceOf(builder1);
        uint256 m1Before = usdc.balanceOf(member1);
        uint256 m2Before = usdc.balanceOf(member2);

        warpAfterJudging();
        gf.finalize(pid);

        // member1 gets  P0 * 3000 / 10000 = 180_000
        // member2 gets  P0 * 2000 / 10000 = 120_000
        // leader gets   P0 - 180_000 - 120_000 = 300_000
        assertEq(usdc.balanceOf(member1) - m1Before, 180_000, "member1 share");
        assertEq(usdc.balanceOf(member2) - m2Before, 120_000, "member2 share");
        assertEq(usdc.balanceOf(builder1) - b1Before, 300_000, "leader share");
    }

    /// @dev Rounding: 2-member team, shares 3333/6667, prize P1=300_000.
    ///      member: 300_000 * 6667 / 10_000 = 200_010 (floor)
    ///      leader: 300_000 - 200_010 = 99_990 (gets the dust)
    function test_finalize_teamRoundingDustToLeader() public {
        uint256 pid = createDefaultProgram();
        // Only 1 prize so we need a 1-prize program
        uint256[] memory prizes1 = new uint256[](1);
        prizes1[0] = 300_000;
        uint256 pool1 = 300_000;
        uint256 fee1 = (pool1 * FEE_BPS) / 10_000; // 3_000
        usdc.mint(sponsor, pool1 + fee1 + 100);

        address[] memory jj = _judges2();
        vm.startPrank(sponsor);
        usdc.approve(address(gf), pool1 + fee1 + 100);
        uint256 pid1 = gf.createProgram(
            "Rounding Test", "desc",
            prizes1,
            block.timestamp + 1 days,
            block.timestamp + 2 days,
            jj,
            GrantFlowV5.ProgramType.OPEN_BOUNTY,
            GrantFlowV5.Category.Hackathon
        );
        vm.stopPrank();

        address[] memory pay = new address[](2);
        pay[0] = builder1; pay[1] = member1;
        uint256[] memory shr = new uint256[](2);
        shr[0] = 3_333; shr[1] = 6_667; // sum = 10_000

        vm.prank(builder1);
        gf.submit(pid1, address(0), "ipfs://rounding", pay, shr);

        warpToJudging();
        vm.prank(judge1); gf.vote(pid1, 0);

        uint256 b1Before = usdc.balanceOf(builder1);
        uint256 m1Before = usdc.balanceOf(member1);

        warpAfterJudging();
        gf.finalize(pid1);

        // member1 (non-leader, paid first): 300_000 * 6667 / 10_000 = 200_010
        // leader: 300_000 - 200_010 = 99_990 (dust goes to leader)
        uint256 m1Expected = (300_000 * 6_667) / 10_000;
        uint256 b1Expected = 300_000 - m1Expected;

        assertEq(usdc.balanceOf(member1) - m1Before, m1Expected, "member1 rounding");
        assertEq(usdc.balanceOf(builder1) - b1Before, b1Expected, "leader gets dust");
        // Total must equal prize exactly
        assertEq(m1Expected + b1Expected, 300_000, "total = prize");
    }

    /// @dev Both solo and team in same program; both win; verify individual payouts.
    function test_finalize_mixedSoloAndTeam() public {
        uint256 pid = createDefaultProgram();
        // Sub 0: builder1 solo
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://solo", p1, s1);

        // Sub 1: builder2+member1 team (60/40)
        address[] memory pay2 = new address[](2);
        pay2[0] = builder2; pay2[1] = member1;
        uint256[] memory shr2 = new uint256[](2);
        shr2[0] = 6_000; shr2[1] = 4_000;
        vm.prank(builder2);
        gf.submit(pid, address(0), "ipfs://team", pay2, shr2);

        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0); // vote for solo
        vm.prank(judge2); gf.vote(pid, 1); // vote for team

        uint256 b1Before  = usdc.balanceOf(builder1);
        uint256 b2Before  = usdc.balanceOf(builder2);
        uint256 m1Before  = usdc.balanceOf(member1);

        warpAfterJudging();
        gf.finalize(pid);

        // Both tied at 1 vote; sub0 (lower id) → rank 0
        // builder1 (solo rank 0) → P0 = 600_000
        assertEq(usdc.balanceOf(builder1) - b1Before, P0, "solo rank0");
        // builder2+member1 (team rank 1) → P1 = 300_000, split 60/40
        // member1 (non-leader): 300_000 * 4000 / 10_000 = 120_000
        // builder2 (leader remainder): 300_000 - 120_000 = 180_000
        assertEq(usdc.balanceOf(member1) - m1Before, 120_000, "team member1");
        assertEq(usdc.balanceOf(builder2) - b2Before, 180_000, "team leader");
    }

    /// @dev 5-member team (max size), equal shares (2000 each).
    function test_finalize_maxTeamEqualShares() public {
        uint256 pid = createDefaultProgram();
        address b3 = makeAddr("b3max");
        address b4 = makeAddr("b4max");
        address b5 = makeAddr("b5max");

        address[] memory pay = new address[](5);
        pay[0] = builder1; pay[1] = builder2; pay[2] = b3; pay[3] = b4; pay[4] = b5;
        uint256[] memory shr = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) shr[i] = 2_000; // sum = 10_000

        vm.prank(builder1);
        gf.submit(pid, address(0), "ipfs://5team", pay, shr);

        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0);

        uint256[] memory beforeBals = new uint256[](5);
        beforeBals[0] = usdc.balanceOf(builder1);
        beforeBals[1] = usdc.balanceOf(builder2);
        beforeBals[2] = usdc.balanceOf(b3);
        beforeBals[3] = usdc.balanceOf(b4);
        beforeBals[4] = usdc.balanceOf(b5);

        warpAfterJudging();
        gf.finalize(pid);

        // Prize = P0 = 600_000; 5 equal shares = 120_000 each
        // Members 1-4 get floor(600_000 * 2000/10_000) = 120_000 each
        // Leader gets remainder = 600_000 - 4*120_000 = 120_000 (no dust since exact)
        for (uint256 i = 0; i < 5; i++) {
            uint256 bal = usdc.balanceOf(pay[i]) - beforeBals[i];
            assertEq(bal, 120_000, "each member gets 120_000");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // finalize — tie-breaker
    // ─────────────────────────────────────────────────────────────────────────

    function test_finalize_tieBreaker() public {
        uint256 pid = createDefaultProgram();
        (address[] memory p1, uint256[] memory s1) = _soloPayees(builder1);
        (address[] memory p2, uint256[] memory s2) = _soloPayees(builder2);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", p1, s1);
        vm.prank(builder2); gf.submit(pid, address(0), "ipfs://b2", p2, s2);
        warpToJudging();
        vm.prank(judge1); gf.vote(pid, 0);
        vm.prank(judge2); gf.vote(pid, 1);
        uint256 b1Before = usdc.balanceOf(builder1);
        warpAfterJudging();
        gf.finalize(pid);
        assertEq(usdc.balanceOf(builder1) - b1Before, P0, "sub0 wins tie by lower id");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // updateProgram
    // ─────────────────────────────────────────────────────────────────────────

    function test_update_succeeds() public {
        uint256 pid = createDefaultProgram();
        uint256 newSub = block.timestamp + 3 days;
        uint256 newJudge = block.timestamp + 4 days;
        vm.prank(sponsor);
        gf.updateProgram(pid, "New Name", "New Desc", newSub, newJudge);
        (string memory name, string memory desc,,,,uint256 storedSub, uint256 storedJudge,,,,, ) = gf.getProgram(pid);
        assertEq(name, "New Name");
        assertEq(desc, "New Desc");
        assertEq(storedSub, newSub);
        assertEq(storedJudge, newJudge);
    }

    function test_update_revertsNonSponsor() public {
        uint256 pid = createDefaultProgram();
        vm.prank(stranger);
        vm.expectRevert(GrantFlowV5.NotSponsor.selector);
        gf.updateProgram(pid,"X","Y",block.timestamp+3 days,block.timestamp+4 days);
    }

    function test_update_revertsAfterSubmission() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", pay, shr);
        vm.prank(sponsor);
        vm.expectRevert(GrantFlowV5.SubmissionsExist.selector);
        gf.updateProgram(pid,"X","Y",block.timestamp+3 days,block.timestamp+4 days);
    }

    function test_update_revertsAfterSubDeadlinePassed() public {
        uint256 pid = createDefaultProgram();
        warpToJudging();
        vm.prank(sponsor);
        vm.expectRevert(GrantFlowV5.NotSubmissionPhase.selector);
        gf.updateProgram(pid,"X","Y",block.timestamp+3 days,block.timestamp+4 days);
    }

    function test_update_revertsJudgingBeforeSubmission() public {
        uint256 pid = createDefaultProgram();
        vm.prank(sponsor);
        vm.expectRevert(GrantFlowV5.InvalidParams.selector);
        gf.updateProgram(pid,"X","Y",block.timestamp+4 days,block.timestamp+3 days);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // cancel
    // ─────────────────────────────────────────────────────────────────────────

    function test_cancel_succeedsNoSubmissions() public {
        uint256 pid = createDefaultProgram();
        uint256 sponsorBefore = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        gf.cancel(pid);
        assertEq(usdc.balanceOf(sponsor) - sponsorBefore, PRIZE_SUM, "full pool back");
        (,,,,,,,,,bool exists,, bool cancelled) = gf.getProgram(pid);
        assertTrue(exists);
        assertTrue(cancelled);
    }

    function test_cancel_revertsWithSubmissions() public {
        uint256 pid = createDefaultProgram();
        (address[] memory pay, uint256[] memory shr) = _soloPayees(builder1);
        vm.prank(builder1); gf.submit(pid, address(0), "ipfs://b1", pay, shr);
        vm.prank(sponsor);
        vm.expectRevert(GrantFlowV5.SubmissionsExist.selector);
        gf.cancel(pid);
    }

    function test_cancel_revertsNonSponsor() public {
        uint256 pid = createDefaultProgram();
        vm.prank(stranger);
        vm.expectRevert(GrantFlowV5.NotSponsor.selector);
        gf.cancel(pid);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz — solo prize sums
    // ─────────────────────────────────────────────────────────────────────────

    function testFuzz_prizesAlwaysSumCorrectly(uint64 p0, uint64 p1, uint64 p2) public {
        p0 = uint64(bound(p0, 1, 1_000_000e6));
        p1 = uint64(bound(p1, 1, 1_000_000e6));
        p2 = uint64(bound(p2, 1, 1_000_000e6));
        uint256[] memory prizes = new uint256[](3);
        prizes[0] = p0; prizes[1] = p1; prizes[2] = p2;
        uint256 pool = uint256(p0)+uint256(p1)+uint256(p2);
        uint256 fee  = (pool * FEE_BPS) / 10_000;
        usdc.mint(sponsor, pool + fee);
        vm.startPrank(sponsor);
        usdc.approve(address(gf), pool + fee);
        uint256 pid = gf.createProgram("Fuzz","desc",prizes,block.timestamp+1 days,block.timestamp+2 days,_judges2(),GrantFlowV5.ProgramType.OPEN_BOUNTY,GrantFlowV5.Category.Hackathon);
        vm.stopPrank();
        (,,,, uint256 totalDeposited,,,,,,, ) = gf.getProgram(pid);
        assertEq(totalDeposited, pool);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz — team split must sum to 10_000
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Verifies that a valid 2-member split (summing to 10_000) always passes.
    function testFuzz_teamSharesMustSumToDenom(uint16 leaderBps) public {
        uint256 lb = bound(leaderBps, 1, 9_999);
        uint256 mb = 10_000 - lb; // sum = 10_000

        uint256 pid = createDefaultProgram();
        address teamLeader = makeAddr("fuzzLeader");
        address teamMember = makeAddr("fuzzMember");

        address[] memory pay = new address[](2);
        pay[0] = teamLeader; pay[1] = teamMember;
        uint256[] memory shr = new uint256[](2);
        shr[0] = lb; shr[1] = mb;

        vm.prank(teamLeader);
        gf.submit(pid, address(0), "ipfs://fuzz", pay, shr);
        assertEq(gf.submissionCount(pid), 1);
    }
}
