// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GrantFlow} from "../GrantFlow.sol";
import {GrantFlowBase, MockERC20, StubContract} from "./GrantFlow.Base.t.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Tests for ProgramType (ONCHAIN_BUILD / OPEN_BOUNTY) and Category/description
// ─────────────────────────────────────────────────────────────────────────────
contract GrantFlowModeTest is GrantFlowBase {

    // ── ONCHAIN_BUILD: existing rules still hold ─────────────────────────────

    function test_OnchainBuild_RequiresDeployedContract() public {
        uint256 pid = _createDefaultProgram();
        address eoa = makeAddr("eoa");
        vm.prank(alice);
        vm.expectRevert(GrantFlow.InvalidProjectContract.selector);
        gf.submit(pid, eoa, "ipfs://eoa");
    }

    function test_OnchainBuild_RejectsAddressZeroAsContract() public {
        uint256 pid = _createDefaultProgram();
        vm.prank(alice);
        vm.expectRevert(GrantFlow.InvalidProjectContract.selector);
        gf.submit(pid, address(0), "ipfs://zero");
    }

    function test_OnchainBuild_RejectsDuplicateContract() public {
        uint256 pid = _createDefaultProgram();
        _submitAlice(pid); // alice submits stub
        vm.prank(bob);
        vm.expectRevert(GrantFlow.AlreadySubmitted.selector);
        gf.submit(pid, address(stub), "ipfs://bob-same"); // same contract → revert
    }

    function test_OnchainBuild_AllowsDifferentContractsFromSameWallet() public {
        uint256 pid = _createDefaultProgram();
        StubContract stub2 = new StubContract();
        _submitAlice(pid); // alice with stub

        // alice may submit a SECOND contract (different address)
        vm.prank(alice);
        gf.submit(pid, address(stub2), "ipfs://alice2");
        assertEq(gf.submissionCount(pid), 2);
    }

    // ── OPEN_BOUNTY: new rules ────────────────────────────────────────────────

    function test_OpenBounty_AcceptsAddressZeroProjectContract() public {
        uint256 pid = _createOpenBountyProgram();
        _submitAliceBounty(pid);
        assertEq(gf.submissionCount(pid), 1);
    }

    function test_OpenBounty_RejectsNonZeroProjectContract() public {
        uint256 pid = _createOpenBountyProgram();
        vm.prank(alice);
        vm.expectRevert(GrantFlow.WrongProgramType.selector);
        gf.submit(pid, address(stub), "ipfs://alice"); // non-zero contract → revert
    }

    function test_OpenBounty_OneSubmissionPerWallet() public {
        uint256 pid = _createOpenBountyProgram();
        _submitAliceBounty(pid);

        vm.prank(alice);
        vm.expectRevert(GrantFlow.AlreadySubmittedWallet.selector);
        gf.submit(pid, address(0), "https://alice-again.example.com");
    }

    function test_OpenBounty_DifferentWalletsCanSubmit() public {
        uint256 pid = _createOpenBountyProgram();
        _submitAliceBounty(pid);
        _submitBobBounty(pid);
        assertEq(gf.submissionCount(pid), 2);
    }

    function test_OpenBounty_HappyPath_ThresholdPaysAndClaims() public {
        uint256 pid = _createOpenBountyProgram(); // threshold=1, reviewer1
        uint256 sid = _submitAliceBounty(pid);

        vm.prank(reviewer1);
        vm.expectEmit(true, true, true, true, address(gf));
        emit GrantFlow.PrizePaid(pid, sid, alice, PRIZE);
        gf.approve(pid, sid);

        assertEq(gf.pendingClaims(alice), PRIZE);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        gf.claim();
        assertEq(usdc.balanceOf(alice), balBefore + PRIZE);
        assertEq(gf.pendingClaims(alice), 0);
    }

    function test_OpenBounty_ReclaimWorksAsNormal() public {
        uint256 pid = _createOpenBountyProgram(); // 3 slots, 0 used
        vm.warp(_deadline() + 1);

        uint256 balBefore = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        gf.reclaim(pid);
        assertEq(usdc.balanceOf(sponsor), balBefore + PRIZE * SLOTS);
    }

    // ── Category and description stored and readable ──────────────────────────

    function test_GetProgramMeta_OnchainBuild() public {
        uint256 pid = _createDefaultProgram();
        (GrantFlow.ProgramType pt, GrantFlow.Category cat, string memory desc) = gf.getProgramMeta(pid);
        assertEq(uint8(pt), uint8(GrantFlow.ProgramType.ONCHAIN_BUILD));
        assertEq(uint8(cat), uint8(GrantFlow.Category.Hackathon));
        assertEq(desc, "");
    }

    function test_GetProgramMeta_OpenBounty_WithDescription() public {
        uint256 pid = _createOpenBountyProgram();
        (GrantFlow.ProgramType pt, GrantFlow.Category cat, string memory desc) = gf.getProgramMeta(pid);
        assertEq(uint8(pt), uint8(GrantFlow.ProgramType.OPEN_BOUNTY));
        assertEq(uint8(cat), uint8(GrantFlow.Category.Bounty));
        assertEq(desc, "A test bounty");
    }

    function test_GetProgramMeta_AllCategories() public {
        address[] memory revs = new address[](1);
        revs[0] = reviewer1;
        GrantFlow.Category[4] memory cats = [
            GrantFlow.Category.Hackathon,
            GrantFlow.Category.Bounty,
            GrantFlow.Category.Contest,
            GrantFlow.Category.Referral
        ];

        for (uint8 i = 0; i < 4; i++) {
            vm.startPrank(sponsor);
            usdc.approve(address(gf), _totalCost(PRIZE, 1));
            uint256 pid = gf.createProgram(
                "Cat Test", PRIZE, 1, _deadline(), revs, 1,
                GrantFlow.ProgramType.OPEN_BOUNTY, cats[i], "desc"
            );
            vm.stopPrank();
            (, GrantFlow.Category cat, ) = gf.getProgramMeta(pid);
            assertEq(uint8(cat), i);
        }
    }

    function test_GetProgramMeta_RevertsForMissingProgram() public {
        vm.expectRevert(GrantFlow.ProgramNotFound.selector);
        gf.getProgramMeta(999);
    }

    // ── Wallet-guard state: hasSubmittedWallet readable ──────────────────────

    function test_HasSubmittedWallet_TrueAfterBountySubmit() public {
        uint256 pid = _createOpenBountyProgram();
        assertFalse(gf.hasSubmittedWallet(pid, alice));
        _submitAliceBounty(pid);
        assertTrue(gf.hasSubmittedWallet(pid, alice));
    }

    function test_HasSubmittedWallet_FalseForOnchainBuildProgram() public {
        // ONCHAIN_BUILD programs use hasSubmittedContract, not hasSubmittedWallet
        uint256 pid = _createDefaultProgram();
        _submitAlice(pid);
        assertFalse(gf.hasSubmittedWallet(pid, alice)); // wallet guard not set for ONCHAIN_BUILD
    }
}
