// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";
import {GrantFlowBase, MockERC20, StubContract} from "./GrantFlow.Base.t.sol";

contract GrantFlowFuzzTest is GrantFlowBase {

    // ── Scenario 14 ──────────────────────────────────────────────────────────
    // Fuzz prizeAmount and slots; verify totalDeposited = prizeAmount * slots.
    // ─────────────────────────────────────────────────────────────────────────
    function testFuzz_CreateProgram_TotalDepositedEquality(
        uint256 prizeAmount,
        uint256 slots
    ) public {
        // Constrain to reasonable, overflow-safe values
        prizeAmount = bound(prizeAmount, 1, 1e12);          // up to 1e12 USDC-like units
        slots       = bound(slots, 1, 50);                  // up to 50 slots

        uint256 totalRequired = prizeAmount * slots;
        uint256 fee           = (totalRequired * DEFAULT_FEE_BPS) / 10_000;
        uint256 sponsorCost   = totalRequired + fee;

        // Fund and approve sponsor
        usdc.mint(sponsor, sponsorCost);

        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), sponsorCost);
        uint256 pid = gf.createProgram(
            "FuzzProg",
            prizeAmount,
            slots,
            _deadline(),
            revs,
            1,   // threshold = 1 so approvals are possible
            GrantFlow.ProgramType.ONCHAIN_BUILD,
            GrantFlow.Category.Hackathon,
            ""
        );
        vm.stopPrank();

        (, uint256 storedPrize, uint256 storedSlots, , , , , , uint256 totalDeposited, ) =
            gf.getProgram(pid);

        // PROPERTY: totalDeposited == prizeAmount * slots (fee excluded)
        assertEq(totalDeposited, prizeAmount * slots);
        // PROPERTY: contract balance grew by exactly totalRequired (not including fee)
        assertEq(usdc.balanceOf(address(gf)), totalRequired);
        // PROPERTY: stored fields match inputs
        assertEq(storedPrize, prizeAmount);
        assertEq(storedSlots, slots);
    }

    // ── Fuzz threshold: any threshold ≤ #reviewers is accepted ──────────────
    function testFuzz_CreateProgram_AnyValidThreshold(uint256 threshold) public {
        threshold = bound(threshold, 1, 5);

        // Build a reviewer list of length == threshold (smallest valid)
        address[] memory revs = new address[](threshold);
        for (uint256 i = 0; i < threshold; i++) {
            revs[i] = makeAddr(string(abi.encodePacked("rev", i)));
        }

        uint256 cost = _totalCost(PRIZE, SLOTS);
        usdc.mint(sponsor, cost);

        vm.startPrank(sponsor);
        usdc.approve(address(gf), cost);
        uint256 pid = gf.createProgram("FuzzThresh", PRIZE, SLOTS, _deadline(), revs, threshold, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        (, , , , , , uint256 storedThr, , , ) = gf.getProgram(pid);
        assertEq(storedThr, threshold);
        assertEq(gf.getReviewers(pid).length, threshold);
    }

    // ── Fuzz approve accumulation: multiple reviewers, correct vote count ────
    function testFuzz_Approve_VoteCountAccumulates(uint256 voteCount) public {
        // Build a program with 5 reviewers, threshold=5 (needs all to pay)
        uint256 numReviewers = 5;
        voteCount = bound(voteCount, 1, numReviewers - 1); // votes < threshold → no payout

        address[] memory revs = new address[](numReviewers);
        for (uint256 i = 0; i < numReviewers; i++) {
            revs[i] = makeAddr(string(abi.encodePacked("r", i)));
        }

        uint256 cost = _totalCost(PRIZE, SLOTS);
        usdc.mint(sponsor, cost);

        vm.startPrank(sponsor);
        usdc.approve(address(gf), cost);
        uint256 pid = gf.createProgram("FuzzVotes", PRIZE, SLOTS, _deadline(), revs, numReviewers, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        uint256 sid = _submitAlice(pid);

        // Cast exactly `voteCount` votes (each from a distinct reviewer)
        for (uint256 i = 0; i < voteCount; i++) {
            vm.prank(revs[i]);
            gf.approve(pid, sid);
        }

        (, , , uint256 approvals, bool paid) = gf.getSubmission(pid, sid);

        // PROPERTY: approvals == voteCount
        assertEq(approvals, voteCount);
        // PROPERTY: not paid because threshold not reached
        assertFalse(paid);
        assertEq(gf.pendingClaims(alice), 0);
    }

    // ── Fuzz claim: pendingClaims cleared after claim ────────────────────────
    function testFuzz_Claim_ClearsPendingBalance(uint256 extraPrize) public {
        // Bound extra to a non-overflow range
        extraPrize = bound(extraPrize, 1, 1e12);

        // Manually credit alice some pending claims (simulate multiple wins)
        // We do this by running two programs that each pay alice.
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;

        // Program 1 — 1 slot, prize = extraPrize; sponsor pays pool + fee
        uint256 fee1   = (extraPrize * DEFAULT_FEE_BPS) / 10_000;
        uint256 cost1  = extraPrize + fee1;
        usdc.mint(sponsor, cost1 * 2); // plenty for two programs
        vm.startPrank(sponsor);
        usdc.approve(address(gf), cost1);
        uint256 pid1 = gf.createProgram("P1", extraPrize, 1, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        uint256 sid1 = _submitAlice(pid1);
        vm.prank(reviewer1);
        gf.approve(pid1, sid1); // threshold=1 → pays

        assertEq(gf.pendingClaims(alice), extraPrize);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        gf.claim();

        // PROPERTY: alice received exactly pendingClaims
        assertEq(usdc.balanceOf(alice), aliceBefore + extraPrize);
        // PROPERTY: pendingClaims reset to zero
        assertEq(gf.pendingClaims(alice), 0);
    }
}
