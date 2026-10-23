// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";
import {GrantFlowBase, MockERC20, StubContract} from "./GrantFlow.Base.t.sol";

/// @notice Fee-model tests: math, cap, owner-only setters, reclaim isolation.
contract GrantFlowFeeTest is GrantFlowBase {

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Expected fee for a prize pool.
    function _expectedFee(uint256 pool) internal pure returns (uint256) {
        return (pool * DEFAULT_FEE_BPS) / 10_000;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Constructor fee params
    // ────────────────────────────────────────────────────────────────────────

    function test_Fee_Constructor_StoresParams() public view {
        assertEq(gf.feeRecipient(), feeRecipient);
        assertEq(gf.feeBps(), DEFAULT_FEE_BPS);
        assertEq(gf.MAX_FEE_BPS(), 500);
    }

    function test_Fee_Constructor_MaxBpsExactly500Accepted() public {
        GrantFlow gf2 = new GrantFlow(address(usdc), feeRecipient, 500);
        assertEq(gf2.feeBps(), 500);
    }

    function test_Fee_Constructor_FeeBpsZeroAccepted() public {
        GrantFlow gfZero = new GrantFlow(address(usdc), feeRecipient, 0);
        assertEq(gfZero.feeBps(), 0);
    }

    // ────────────────────────────────────────────────────────────────────────
    // createProgram: fee math & flows
    // ────────────────────────────────────────────────────────────────────────

    function test_Fee_CreateProgram_FeeGoesToRecipient() public {
        uint256 pool  = PRIZE * SLOTS;
        uint256 fee   = _expectedFee(pool);

        uint256 recipientBefore = usdc.balanceOf(feeRecipient);
        uint256 contractBefore  = usdc.balanceOf(address(gf));

        _createDefaultProgram();

        assertEq(usdc.balanceOf(feeRecipient), recipientBefore + fee,   "fee not sent to feeRecipient");
        assertEq(usdc.balanceOf(address(gf)),  contractBefore  + pool,  "prize pool not held by contract");
    }

    function test_Fee_CreateProgram_TotalDepositedExcludesFee() public {
        uint256 pid = _createDefaultProgram();
        (, , , , , , , , uint256 totalDeposited, ) = gf.getProgram(pid);
        assertEq(totalDeposited, PRIZE * SLOTS, "totalDeposited must exclude fee");
    }

    function test_Fee_CreateProgram_TotalFeesCollectedAccumulates() public {
        assertEq(gf.totalFeesCollected(), 0);

        uint256 pool1 = PRIZE * SLOTS;
        uint256 fee1  = _expectedFee(pool1);
        _createDefaultProgram();
        assertEq(gf.totalFeesCollected(), fee1, "after first program");

        // Create a second program (different slot count)
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        uint256 pool2 = PRIZE * 2;
        uint256 fee2  = _expectedFee(pool2);
        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, 2));
        gf.createProgram("P2", PRIZE, 2, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        assertEq(gf.totalFeesCollected(), fee1 + fee2, "after second program");
    }

    function test_Fee_CreateProgram_EmitsFeeCollected() public {
        uint256 pool = PRIZE * SLOTS;
        uint256 fee  = _expectedFee(pool);

        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        vm.startPrank(sponsor);
        usdc.approve(address(gf), _totalCost(PRIZE, SLOTS));

        vm.expectEmit(true, false, false, true, address(gf));
        emit GrantFlow.FeeCollected(0, fee);

        gf.createProgram("FeeEmit", PRIZE, SLOTS, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();
    }

    function test_Fee_ZeroFeeBps_NoTransferToRecipient() public {
        // Deploy a zero-fee instance
        GrantFlow gfFree = new GrantFlow(address(usdc), feeRecipient, 0);
        usdc.mint(sponsor, PRIZE * SLOTS * 5);

        address[] memory revs = new address[](2);
        revs[0] = reviewer1;
        revs[1] = reviewer2;

        uint256 recipientBefore = usdc.balanceOf(feeRecipient);

        vm.startPrank(sponsor);
        usdc.approve(address(gfFree), PRIZE * SLOTS);
        gfFree.createProgram("NoFee", PRIZE, SLOTS, _deadline(), revs, THRESHOLD, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        // Fee recipient balance unchanged when feeBps == 0
        assertEq(usdc.balanceOf(feeRecipient), recipientBefore, "fee recipient should receive nothing when feeBps=0");
        assertEq(gfFree.totalFeesCollected(), 0);
    }

    // ────────────────────────────────────────────────────────────────────────
    // reclaim: fee never touches prize pool / reclaim math
    // ────────────────────────────────────────────────────────────────────────

    function test_Fee_Reclaim_NeverIncludesFee() public {
        uint256 pid  = _createDefaultProgram();   // 3 slots, 0 used
        uint256 pool = PRIZE * SLOTS;

        vm.warp(_deadline() + 1);

        uint256 sponsorBefore = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        gf.reclaim(pid);

        // Sponsor gets back exactly the prize pool (fee was already taken at createProgram)
        assertEq(usdc.balanceOf(sponsor), sponsorBefore + pool, "reclaim must not include fee");
    }

    function test_Fee_Reclaim_PartialUsed_CorrectAmount() public {
        uint256 pid  = _createDefaultProgram();   // 3 slots
        uint256 sid  = _submitAlice(pid);
        _approveToThreshold(pid, sid);             // 1 slot used

        vm.warp(_deadline() + 1);

        uint256 sponsorBefore = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        gf.reclaim(pid);

        // Sponsor gets back 2 unallocated prize slots; fee was already gone
        assertEq(usdc.balanceOf(sponsor), sponsorBefore + PRIZE * 2);
    }

    // ────────────────────────────────────────────────────────────────────────
    // setFeeRecipient: owner-only
    // ────────────────────────────────────────────────────────────────────────

    function test_Fee_SetFeeRecipient_OwnerCanUpdate() public {
        address newRecipient = makeAddr("newRecipient");

        vm.prank(address(this)); // this contract is the owner (deployed gf in setUp)
        vm.expectEmit(true, true, false, false, address(gf));
        emit GrantFlow.FeeRecipientUpdated(feeRecipient, newRecipient);

        gf.setFeeRecipient(newRecipient);
        assertEq(gf.feeRecipient(), newRecipient);
    }

    function test_Fee_SetFeeRecipient_NonOwnerReverts() public {
        address newRecipient = makeAddr("newRecipient");
        vm.prank(alice);
        // OZ Ownable reverts with OwnableUnauthorizedAccount
        vm.expectRevert();
        gf.setFeeRecipient(newRecipient);
    }

    function test_Fee_SetFeeRecipient_ZeroAddressReverts() public {
        vm.prank(address(this));
        vm.expectRevert(GrantFlow.ZeroAddress.selector);
        gf.setFeeRecipient(address(0));
    }

    // ────────────────────────────────────────────────────────────────────────
    // setFeeBps: owner-only, cap enforcement
    // ────────────────────────────────────────────────────────────────────────

    function test_Fee_SetFeeBps_OwnerCanUpdate() public {
        vm.prank(address(this));
        vm.expectEmit(false, false, false, true, address(gf));
        emit GrantFlow.FeeBpsUpdated(DEFAULT_FEE_BPS, 200);

        gf.setFeeBps(200);
        assertEq(gf.feeBps(), 200);
    }

    function test_Fee_SetFeeBps_CapExactly500Accepted() public {
        vm.prank(address(this));
        gf.setFeeBps(500);
        assertEq(gf.feeBps(), 500);
    }

    function test_Fee_SetFeeBps_AboveCapReverts() public {
        vm.prank(address(this));
        vm.expectRevert(GrantFlow.FeeTooHigh.selector);
        gf.setFeeBps(501);
    }

    function test_Fee_SetFeeBps_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        gf.setFeeBps(200);
    }

    function test_Fee_SetFeeBps_ZeroAccepted() public {
        vm.prank(address(this));
        gf.setFeeBps(0);
        assertEq(gf.feeBps(), 0);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fuzz: fee math is exact
    // ────────────────────────────────────────────────────────────────────────

    function testFuzz_Fee_Math_Exact(uint256 prize, uint256 slots, uint256 bps) public {
        prize = bound(prize, 1, 1e10);
        slots = bound(slots, 1, 20);
        bps   = bound(bps, 0, 500);

        GrantFlow gfFuzz = new GrantFlow(address(usdc), feeRecipient, bps);

        uint256 pool      = prize * slots;
        uint256 expected  = (pool * bps) / 10_000;
        uint256 totalCost = pool + expected;

        usdc.mint(sponsor, totalCost);

        address[] memory revs = new address[](1);
        revs[0] = reviewer1;

        uint256 recipBefore = usdc.balanceOf(feeRecipient);
        uint256 cBefore     = usdc.balanceOf(address(gfFuzz));

        vm.startPrank(sponsor);
        usdc.approve(address(gfFuzz), totalCost);
        gfFuzz.createProgram("FuzzFee", prize, slots, _deadline(), revs, 1, GrantFlow.ProgramType.ONCHAIN_BUILD, GrantFlow.Category.Hackathon, "");
        vm.stopPrank();

        assertEq(usdc.balanceOf(feeRecipient), recipBefore + expected, "fee to recipient");
        assertEq(usdc.balanceOf(address(gfFuzz)), cBefore + pool,      "pool to contract");
        assertEq(gfFuzz.totalFeesCollected(), expected,                "totalFeesCollected");
    }
}
