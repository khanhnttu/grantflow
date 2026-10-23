// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";
import {GrantFlowBase, MockERC20, StubContract} from "./GrantFlow.Base.t.sol";

contract GrantFlowHappyTest is GrantFlowBase {

    // ── constructor ──────────────────────────────────────────────────────────

    function test_Deploy_StoresUsdc() public view {
        assertEq(address(gf.usdc()), address(usdc));
    }

    function test_Deploy_ProgramCountStartsZero() public view {
        assertEq(gf.programCount(), 0);
    }

    // ── createProgram ─────────────────────────────────────────────────────────

    function test_CreateProgram_IncrementsProgramCount() public {
        _createDefaultProgram();
        assertEq(gf.programCount(), 1);
    }

    function test_CreateProgram_DepositsUsdcIntoContract() public {
        uint256 before = usdc.balanceOf(address(gf));
        _createDefaultProgram();
        assertEq(usdc.balanceOf(address(gf)), before + PRIZE * SLOTS);
    }

    function test_CreateProgram_StoresTotalDeposited() public {
        uint256 pid = _createDefaultProgram();
        (, uint256 prizeAmount, uint256 slots, , , , , , uint256 totalDeposited, ) = gf.getProgram(pid);
        assertEq(totalDeposited, prizeAmount * slots);
    }

    function test_CreateProgram_EmitsProgramCreated() public {
        address[] memory reviewers = new address[](2);
        reviewers[0] = reviewer1;
        reviewers[1] = reviewer2;
        uint256 deadline = _deadline();

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));

        vm.expectEmit(true, true, false, true, address(gf));
        emit GrantFlow.ProgramCreated(0, sponsor, "Test Program", PRIZE, SLOTS, deadline);

        gf.createProgram("Test Program", PRIZE, SLOTS, deadline, reviewers, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();
    }

    function test_CreateProgram_StoresSponsorAndReviewers() public {
        uint256 pid = _createDefaultProgram();
        (, , , , address storedSponsor, address[] memory storedReviewers, uint256 thr, , , ) = gf.getProgram(pid);
        assertEq(storedSponsor, sponsor);
        assertEq(storedReviewers.length, 2);
        assertEq(thr, THRESHOLD);
    }

    // ── submit ───────────────────────────────────────────────────────────────

    function test_Submit_IncreasesSubmissionCount() public {
        uint256 pid = _createDefaultProgram();
        assertEq(gf.submissionCount(pid), 0);
        _submitAlice(pid);
        assertEq(gf.submissionCount(pid), 1);
    }

    function test_Submit_StoresSubmissionData() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);
        (address submitter, address pc, string memory uri, uint256 approvals, bool paid) =
            gf.getSubmission(pid, sid);
        assertEq(submitter, alice);
        assertEq(pc, address(stub));
        assertEq(uri, "ipfs://alice");
        assertEq(approvals, 0);
        assertFalse(paid);
    }

    function test_Submit_EmitsSubmitted() public {
        uint256 pid = _createDefaultProgram();

        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(gf));
        emit GrantFlow.Submitted(pid, 0, alice, address(stub), "ipfs://alice");
        gf.submit(pid, address(stub), "ipfs://alice");
    }

    function test_Submit_MarksContractAsSubmitted() public {
        uint256 pid = _createDefaultProgram();
        _submitAlice(pid);
        assertTrue(gf.hasSubmittedContract(pid, address(stub)));
    }

    // ── approve (partial) ────────────────────────────────────────────────────

    function test_Approve_FirstApprovalDoesNotPay() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        vm.prank(reviewer1);
        gf.approve(pid, sid);

        (, , , uint256 approvals, bool paid) = gf.getSubmission(pid, sid);
        assertEq(approvals, 1);
        assertFalse(paid);
        assertEq(gf.pendingClaims(alice), 0);
    }

    function test_Approve_EmitsApproved() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        vm.prank(reviewer1);
        vm.expectEmit(true, true, true, true, address(gf));
        emit GrantFlow.Approved(pid, sid, reviewer1, 1);
        gf.approve(pid, sid);
    }

    // ── full happy-path: threshold reached → PrizePaid → claim ──────────────

    function test_HappyPath_ThresholdTriggersPayoutAndClaim() public {
        uint256 pid = _createDefaultProgram();
        uint256 sid = _submitAlice(pid);

        // First approval — no payout yet
        vm.prank(reviewer1);
        gf.approve(pid, sid);
        assertEq(gf.pendingClaims(alice), 0);

        // Second approval reaches threshold → payout
        vm.prank(reviewer2);
        vm.expectEmit(true, true, true, true, address(gf));
        emit GrantFlow.PrizePaid(pid, sid, alice, PRIZE);
        gf.approve(pid, sid);

        // pendingClaims updated
        assertEq(gf.pendingClaims(alice), PRIZE);

        // submission.paid = true, slotsUsed incremented
        (, , , uint256 approvals, bool paid) = gf.getSubmission(pid, sid);
        assertEq(approvals, 2);
        assertTrue(paid);

        (, , , , , , , uint256 slotsUsed, , ) = gf.getProgram(pid);
        assertEq(slotsUsed, 1);

        // alice claims
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vm.expectEmit(true, false, false, true, address(gf));
        emit GrantFlow.Claimed(alice, PRIZE);
        gf.claim();

        assertEq(usdc.balanceOf(alice), balBefore + PRIZE);
        assertEq(gf.pendingClaims(alice), 0);
    }

    // ── threshold logic: exactly 2 reviewers needed ──────────────────────────

    function test_Threshold_OneApprovalNotEnough() public {
        uint256 pid = _createDefaultProgram();   // threshold = 2
        uint256 sid = _submitAlice(pid);

        vm.prank(reviewer1);
        gf.approve(pid, sid);

        assertEq(gf.pendingClaims(alice), 0);
        (, , , , bool paid) = gf.getSubmission(pid, sid);
        assertFalse(paid);
    }

    function test_Threshold_SecondApprovalTriggersPayout() public {
        uint256 pid = _createDefaultProgram();   // threshold = 2
        uint256 sid = _submitAlice(pid);

        _approveToThreshold(pid, sid);

        assertEq(gf.pendingClaims(alice), PRIZE);
        (, , , , bool paid) = gf.getSubmission(pid, sid);
        assertTrue(paid);
    }

    // ── isReviewer ────────────────────────────────────────────────────────────

    function test_IsReviewer_ReturnsTrue() public {
        uint256 pid = _createDefaultProgram();
        assertTrue(gf.isReviewer(pid, reviewer1));
        assertTrue(gf.isReviewer(pid, reviewer2));
    }

    function test_IsReviewer_ReturnsFalseForNonReviewer() public {
        uint256 pid = _createDefaultProgram();
        assertFalse(gf.isReviewer(pid, alice));
    }

    // ── getReviewers ──────────────────────────────────────────────────────────

    function test_GetReviewers_ReturnsCorrectList() public {
        uint256 pid = _createDefaultProgram();
        address[] memory revs = gf.getReviewers(pid);
        assertEq(revs.length, 2);
        assertEq(revs[0], reviewer1);
        assertEq(revs[1], reviewer2);
    }

    // ── reclaim after deadline ────────────────────────────────────────────────

    function test_Reclaim_SponsorGetsUnallocatedAfterDeadline() public {
        uint256 pid = _createDefaultProgram();     // 3 slots, 0 used
        // Warp past deadline
        vm.warp(_deadline() + 1);

        uint256 balBefore = usdc.balanceOf(sponsor);

        vm.prank(sponsor);
        vm.expectEmit(true, true, false, true, address(gf));
        emit GrantFlow.Reclaimed(pid, sponsor, PRIZE * SLOTS);
        gf.reclaim(pid);

        assertEq(usdc.balanceOf(sponsor), balBefore + PRIZE * SLOTS);
    }

    function test_Reclaim_PartialAllocated_OnlyReturnsUnallocated() public {
        uint256 pid = _createDefaultProgram();     // 3 slots
        uint256 sid = _submitAlice(pid);
        _approveToThreshold(pid, sid);             // 1 slot used, prize → alice

        vm.warp(_deadline() + 1);

        uint256 balBefore = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        gf.reclaim(pid);

        // 2 slots still unallocated
        assertEq(usdc.balanceOf(sponsor), balBefore + PRIZE * 2);
    }

    // ── multiple submissions / slots ──────────────────────────────────────────

    function test_MultipleSlots_TwoWinnersCanClaim() public {
        uint256 pid = _createDefaultProgram();   // 3 slots

        // Submit two different contracts
        StubContract stub2 = new StubContract();
        uint256 sid1 = _submitAlice(pid);

        vm.prank(bob);
        gf.submit(pid, address(stub2), "ipfs://bob");
        uint256 sid2 = gf.submissionCount(pid) - 1;

        // Approve both
        _approveToThreshold(pid, sid1);
        vm.prank(reviewer1); gf.approve(pid, sid2);
        vm.prank(reviewer2); gf.approve(pid, sid2);

        assertEq(gf.pendingClaims(alice), PRIZE);
        assertEq(gf.pendingClaims(bob),   PRIZE);
    }
}
