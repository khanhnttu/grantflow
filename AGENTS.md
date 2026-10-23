# GrantFlow

> Built with Arc Studio — money-powered apps in minutes

Project memory for the GrantFlow onchain grant & hackathon payout app.

---

## What This App Does

GrantFlow is an onchain USDC grant and hackathon payout platform on Arc. Sponsors create programs (ONCHAIN_BUILD or OPEN_BOUNTY) with a category (Hackathon, Bounty, Contest, Referral) and optional description; builders submit their work; reviewers vote to approve; payouts happen automatically when the approval threshold is reached. Unspent funds can be reclaimed after the deadline. A configurable platform fee (default 1%, max 5%) is charged at program creation.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS (Arc Light design)
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry + OpenZeppelin 5.6.1
- Chain: Arc Testnet (Chain ID: 5042002) / Arc Mainnet (Chain ID: 5042)
- Token: USDC at 0x3600000000000000000000000000000000000000 (6 decimals ERC-20, 18 decimals native)

## Deployed Contracts

| Contract   | Chain        | Address                                       | Explorer |
|------------|--------------|-----------------------------------------------|----------|
| GrantFlow v3 (MAINNET) | Arc Mainnet  | 0x7c2866a62e6ad73e15e243d4341219eb3995fe7d    | https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d |
| GrantFlow v3 (testnet) | Arc Testnet  | 0x3805f86f71b47480a2b31d563ce1620b490a841f    | https://explorer.testnet.arc.io/address/0x3805f86f71b47480a2b31d563ce1620b490a841f |
| GrantFlow v2 (deprecated) | Arc Testnet  | 0x541e15b5a1fe75534ff355d677a5ab7428bc1e93    | https://explorer.testnet.arc.io/address/0x541e15b5a1fe75534ff355d677a5ab7428bc1e93 |
| GrantFlow v1 (deprecated) | Arc Testnet  | 0xa6fbdb92f5869072972a8e5d27a8dadc378914e6    | https://explorer.testnet.arc.io/address/0xa6fbdb92f5869072972a8e5d27a8dadc378914e6 |

Mainnet deploy tx: 0x15fa390fb616c79d891f8194618b5d9e56928402f920aa5bf21363d7ba596cc9
Mainnet deployed at block: 27461407

Constructor args (mainnet v3):
- usdc: 0x3600000000000000000000000000000000000000
- feeRecipient: 0x62628A9BB100D15494D00f6C76c22C975bBB7195 (owner wallet)
- feeBps: 100 (1%)

Testnet v3 deploy tx: 0xae1d94c2da2bc1685c918a39d1bef7678e086ffbfccbe70c8497c9a43cda2bdf

Owner (Ownable2Step, mainnet): 0x62628A9BB100D15494D00f6C76c22C975bBB7195
Owner (Ownable2Step, testnet): 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42

## Key Files

- `contracts/GrantFlow.sol` — main contract (SafeERC20, ReentrancyGuard, Ownable2Step, pull-claim, fee model)
- `contracts/test/GrantFlow.*.t.sol` — 89 Foundry unit tests (all passing, includes GrantFlow.Mode.t.sol)
- `src/lib/grantflow.ts` — contract ABI + address export
- `src/lib/chainConfig.ts` — per-chain address, USDC, explorer, tx/addr URL helpers
- `src/lib/contractHelpers.ts` — typed tuple helpers for useReadContracts results
- `src/hooks/useGrantFlow.ts` — wagmi read hooks (including useFeeBps, useTotalFeesCollected, useAllProgramMetas, useProgramMeta)
- `src/components/pages/` — SponsorPage, BuilderPage, ReviewerPage, ProgramsPage

## Architecture Notes

- Pull-claim payout: approve() credits `pendingClaims[submitter]`; winner calls claim() to pull USDC.
- approve() has a deadline guard: no votes after deadline, making reclaim() deterministic.
- Fee model: sponsor pays `prizeAmount * slots + fee` at createProgram; fee goes directly to feeRecipient; totalDeposited stores only the prize pool; reclaim math never includes the fee.
- USDC address is constructor-injected (same 0x3600...0000 on both testnet and mainnet).
- Owner (Ownable2Step) can call setFeeRecipient and setFeeBps (max 5%).
- ProgramType.ONCHAIN_BUILD: submission requires a deployed contract address; one submission per contract address.
- ProgramType.OPEN_BOUNTY: projectContract must be address(0); one submission per wallet (hasSubmittedWallet guard).
- Category enum: Hackathon (0), Bounty (1), Contest (2), Referral (3) — stored alongside an optional description string.
- via_ir=true added to foundry.toml to fix stack-too-deep on 9-param createProgram.

## Environment Variables

- `VITE_GRANTFLOW_ADDRESS` — testnet GrantFlow address (set in .env after deploy)
- `VITE_GRANTFLOW_ADDRESS_MAINNET` — mainnet GrantFlow address (set in .env for mainnet)
- `VITE_CHAIN` — `testnet` (default) or `mainnet`
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS` — Arc Studio RPC proxy (optional outside Arc Studio)
