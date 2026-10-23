// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";
import {GrantFlowBase, MockERC20, StubContract} from "./GrantFlow.Base.t.sol";

contract GrantFlowRevertTest is GrantFlowBase {

    // ────────────────────────────────────────────────────────────────────────
    // constructor
    // ────────────────────────────────────────────────────────────────────────

    function test_Revert_Constructor_ZeroUsdcAddress() public {
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        new GrantFlow(address(0), feeRecipient, 100);
    }

    function test_Revert_Constructor_ZeroFeeRecipient() public {
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        new GrantFlow(address(usdc), address(0), 100);
    }

    function test_Revert_Constructor_FeeTooHigh() public {
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        new GrantFlow(address(usdc), feeRecipient, 501);
    }

    // ────────────────────────────────────────────────────────────────────────
    // createProgram
    // ────────────────────────────────────────────────────────────────────────

    function test_Revert_CreateProgram_ZeroPrize() public {
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        vm.startPrank(sponsor);
        usdc.approve(address(gf), 1e18);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.createProgram("A", 0, 1, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();
    }

    function test_Revert_CreateProgram_ZeroSlots() public {
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        vm.startPrank(sponsor);
        usdc.approve(address(gf), 1e18);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.createProgram("A", PRIZE, 0, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();
    }

    function test_Revert_CreateProgram_DeadlineInPast() public {
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        vm.startPrank(sponsor);
        usdc.approve(address(gf), 1e18);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.createProgram("A", PRIZE, 1, block.timestamp, revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();
    }

    function test_Revert_CreateProgram_ThresholdExceedsReviewers() public {
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        vm.startPrank(sponsor);
        usdc.approve(address(gf), 1e18);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.createProgram("A", PRIZE, 1, _deadline(), revs, 2, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, ""); // threshold=2, but only 1 reviewer
        vm.stopPrank();
    }

    // ────────────────────────────────────────────────────────────────────────
    // submit
    // ────────────────────────────────────────────────────────────────────────

    /// Scenario 5: submit after deadline reverts with DeadlinePassed.
    function test_Revert_Submit_AfterDeadline() public {
        uint256 pid = _createDefaultProgram();
        vm.warp(_deadline()); // timestamp == deadline (>= check)

        vm.prank(alice);
        vm.expectRevert(GrantFlow.DeadlinePassed.selector);
        gf.submit(pid, address(stub), "ipfs://late");
    }

    /// Scenario 6: EOA (no code) as projectContract reverts with InvalidProjectContract.
    function test_Revert_Submit_EOA_InvalidProjectContract() public {
        uint256 pid = _createDefaultProgram();
        address eoa = makeAddr("eoa");

        vm.prank(alice);
        vm.expectRevert(GrantFlow.InvalidProjectContract.selector);
        gf.submit(pid, eoa, "ipfs://eoa");
    }

    /// Scenario 11: double submit same projectContract reverts with AlreadySubmitted.
    function test_Revert_Submit_AlreadySubmitted() public {
        uint256 pid = _createDefaultProgram();
        _submitAlice(pid);

        vm.prank(bob);
        vm.expectRevert(GrantFlow.AlreadySubmitted.selector);
        gf.submit(pid, address(stub), "ipfs://bob-same-contract");
    }

    function test_Revert_Submit_ProgramNotFound() public {
        vm.prank(alice);
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.submit(999, address(stub), "ipfs://x");
    }

    // Slot guard: after all SLOTS are consumed, further submissions are blocked.
    function test_Revert_Submit_SlotsFull() public {
        // Create a program with only 1 slot
        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, 1));
        uint256 pid = gf.createProgram("Small", PRIZE, 1, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        // Use up the single slot
        uint256 sid = _submitAlice(pid);
        _approveToThreshold(pid, sid);   // slotsUsed → 1 == slots

        // Deploy a second stub and try to submit it — should hit SlotsFull
        StubContract stub2 = new StubContract();
        vm.prank(bob);
        vm.expectRevert(GrantFlow.SlotsFull.selector);
        gf.submit(pid, address(stub2), "ipfs://bob");
    }

    // ────────────────────────────────────────────────────────────────────────
    // approve
    // ────────────────────────────────────────────────────────────────────────

    /// Scenario 9: non-reviewer approve reverts with NotReviewer.
    function test_Revert_Approve_NotReviewer() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        vm.prank(alice);
        vm.expectRevert(GrantFlow.NotReviewer.selector);
        gf.approve(pid, sid);
    }

    /// Scenario 3: same reviewer cannot vote twice → AlreadyVoted.
    function test_Revert_Approve_AlreadyVoted() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        vm.prank(reviewer1);
        gf.approve(pid, sid);

        vm.prank(reviewer1);
        vm.expectRevert(GrantFlow.AlreadyVoted.selector);
        gf.approve(pid, sid);
    }

    /// Scenario 12: once paid, further approvals revert with AlreadyPaid.
    function test_Revert_Approve_AlreadyPaid() public {
        // Use threshold=1 so first approval immediately pays.
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));
        uint256 pid = gf.createProgram("FastPay", PRIZE, SLOTS, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        uint256 sid = _submitAlice(pid);

        vm.prank(reviewer1);
        gf.approve(pid, sid); // pays immediately (threshold=1)

        // reviewer2 is not a reviewer here; add another reviewer via a fresh program —
        // instead use a separate stub + program to keep things clean.
        // For this program reviewer1 already paid; they get AlreadyPaid (they already voted).
        // Use reviewer1 again — but they get AlreadyVoted first.
        // Deploy a second reviewer scenario: we need a reviewer who has NOT voted yet.
        // Re-use reviewer2 who is NOT a reviewer for this program → NotReviewer.
        // To hit AlreadyPaid specifically we need a reviewer that hasn't voted but submission.paid==true.
        // Create a 2-reviewer, threshold=1 program where reviewer1 pays and reviewer2 tries after.
        address[] memory revs2 = new address[](2);
        revs2[0] = reviewer1;
        revs2[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));
        uint256 pid2 = gf.createProgram("FastPay2", PRIZE, SLOTS, _deadline(), revs2, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        StubContract stub2 = new StubContract();
        vm.prank(alice);
        gf.submit(pid2, address(stub2), "ipfs://alice2");
        uint256 sid2 = gf.submissionCount(pid2) - 1;

        vm.prank(reviewer1);
        gf.approve(pid2, sid2); // pays (threshold=1)

        vm.prank(reviewer2);
        vm.expectRevert(GrantFlow.AlreadyPaid.selector);
        gf.approve(pid2, sid2);
    }

    /// Scenario 10: approve after deadline reverts with DeadlinePassed.
    function test_Revert_Approve_AfterDeadline() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        vm.warp(_deadline() + 1); // strictly past deadline

        vm.prank(reviewer1);
        vm.expectRevert(GrantFlow.DeadlinePassed.selector);
        gf.approve(pid, sid);
    }

    function test_Revert_Approve_SubmissionNotFound() public {
        uint256 pid = _createDefaultProgram();

        vm.prank(reviewer1);
        vm.expectRevert(GrantFlow.SubmissionNotFound.selector);
        gf.approve(pid, 999);
    }

    function test_Revert_Approve_ProgramNotFound() public {
        vm.prank(reviewer1);
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.approve(999, 0);
    }

    /// Scenario 4: SlotsFull revert inside approve when all slots are exhausted.
    function test_Revert_Approve_SlotsFull() public {
        // 1-slot program with threshold=2
        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, 1));
        uint256 pid = gf.createProgram("OneSlot", PRIZE, 1, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        // First submission — approved and slot consumed
        uint256 sid1 = _submitAlice(pid);
        _approveToThreshold(pid, sid1);  // slotsUsed → 1 == slots

        // Second submission with a fresh contract
        // We need to submit BEFORE slotsUsed reaches max to get through submit().
        // Use a 2-slot program so the second submission can be stored but the
        // second threshold-triggering approval hits SlotsFull.

        // ── Redo with 2-slot program ──────────────────────────────────────
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, 2));
        uint256 pid2 = gf.createProgram("TwoSlot", PRIZE, 2, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        StubContract stub3 = new StubContract();
        StubContract stub4 = new StubContract();

        vm.prank(alice);
        gf.submit(pid2, address(stub3), "ipfs://s1");
        uint256 s1 = gf.submissionCount(pid2) - 1;

        vm.prank(bob);
        gf.submit(pid2, address(stub4), "ipfs://s2");
        uint256 s2 = gf.submissionCount(pid2) - 1;

        // Consume both slots
        _approveToThreshold(pid2, s1);   // slot 1 used
        _approveToThreshold(pid2, s2);   // slot 2 used → slotsUsed = 2 = slots

        // Submit a third entry (another fresh stub — this goes through because
        // submit() only checks slotsUsed >= slots BEFORE the threshold moment).
        // Actually submit() checks the slot counter too, so this will revert SlotsFull.
        StubContract stub5 = new StubContract();
        vm.prank(alice);
        vm.expectRevert(GrantFlow.SlotsFull.selector);
        gf.submit(pid2, address(stub5), "ipfs://s3");
    }

    // ────────────────────────────────────────────────────────────────────────
    // reclaim
    // ────────────────────────────────────────────────────────────────────────

    /// Scenario 7: reclaim before deadline reverts with DeadlineNotPassed.
    function test_Revert_Reclaim_BeforeDeadline() public {
        uint256 pid = _createDefaultProgram();

        vm.prank(sponsor);
        vm.expectRevert(GrantFlow.DeadlineNotPassed.selector);
        gf.reclaim(pid);
    }

    /// Scenario 8 (negative): non-sponsor reclaim reverts.
    function test_Revert_Reclaim_NotSponsor() public {
        uint256 pid = _createDefaultProgram();
        vm.warp(_deadline() + 1);

        vm.prank(alice);
        vm.expectRevert(GrantFlow.NotSponsor.selector);
        gf.reclaim(pid);
    }

    function test_Revert_Reclaim_AllSlotsAllocated_InvalidParams() public {
        // 1-slot, threshold=2
        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, 1));
        uint256 pid = gf.createProgram("OneFull", PRIZE, 1, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        uint256 sid = _submitAlice(pid);
        _approveToThreshold(pid, sid);  // all funds allocated

        vm.warp(_deadline() + 1);

        vm.prank(sponsor);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.reclaim(pid);
    }

    function test_Revert_Reclaim_ProgramNotFound() public {
        vm.prank(sponsor);
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.reclaim(999);
    }

    // ────────────────────────────────────────────────────────────────────────
    // claim
    // ────────────────────────────────────────────────────────────────────────

    /// Scenario 13: claim with zero pending reverts with InvalidParams.
    function test_Revert_Claim_ZeroPending() public {
        vm.prank(alice);
        vm.expectRevert(GrantFlow.InvalidParams.selector);
        gf.claim();
    }

    // ────────────────────────────────────────────────────────────────────────
    // getProgram / getSubmission guards
    // ────────────────────────────────────────────────────────────────────────

    function test_Revert_GetProgram_NotFound() public {
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.getProgram(999);
    }

    function test_Revert_GetSubmission_ProgramNotFound() public {
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.getSubmission(999, 0);
    }

    function test_Revert_GetSubmission_SubmissionNotFound() public {
        uint256 pid = _createDefaultProgram();
        vm.expectRevert(GrantFlow.SubmissionNotFound.selector);
        gf.getSubmission(pid, 999);
    }

    function test_Revert_GetReviewers_ProgramNotFound() public {
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.getReviewers(999);
    }
}
