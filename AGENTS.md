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
| GrantFlowV5 (testnet, **active** — team-split, push-payout, 23/23 e2e pass) | Arc Testnet | 0x23d26fb2661497c1e658e8d717df8a7dea2f62c0 | https://explorer.testnet.arc.io/address/0x23d26fb2661497c1e658e8d717df8a7dea2f62c0 |
| GrantFlowV5 (MAINNET) | Arc Mainnet | *not yet deployed — browser wallet required* | — |
| GrantFlowV4 (MAINNET, legacy active) | Arc Mainnet | 0x41ffdab65fca60bda9beb455285d29ab753c3d2e | https://explorer.arc.io/address/0x41ffdab65fca60bda9beb455285d29ab753c3d2e |
| GrantFlowV4 (testnet, legacy active) | Arc Testnet  | 0x0754d3359f18be2079c6d3cea29658b464cfe946    | https://explorer.testnet.arc.io/address/0x0754d3359f18be2079c6d3cea29658b464cfe946 |
| GrantFlowV4 (testnet, old — wrong owner) | Arc Testnet  | 0x8a8d4e2378842d02690e247c9241842a30bbf7c4    | retired |
| GrantFlow v3 (MAINNET, legacy) | Arc Mainnet  | 0x7c2866a62e6ad73e15e243d4341219eb3995fe7d    | https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d |
| GrantFlow v3 (testnet, legacy) | Arc Testnet  | 0x3805f86f71b47480a2b31d563ce1620b490a841f    | https://explorer.testnet.arc.io/address/0x3805f86f71b47480a2b31d563ce1620b490a841f |

V4 Mainnet deploy tx: 0xb36e61207035267a2ef178bcf5daacbeb0cae53fb4e54576bed72f87645a1617
V5 Testnet deploy tx: 0x8043aa74fb757270f8d3640f26a87e742974926e46353deca51299ae7a66e030
V5 Testnet feeRecipient(): 0x62628A9BB100D15494D00f6C76c22C975bBB7195 ✓
V4 Testnet deploy tx: 0x13e62998225a0e55834ad5942946703c5d0118573f74f58a8ea38eb801e4e44f
Note: Ownable2Step pending owner on testnet is 0xa3039A5… (platform deployer); call acceptOwnership() from 0x62628…3195 to complete the transfer.
V3 Mainnet deploy tx: 0x15fa390fb616c79d891f8194618b5d9e56928402f920aa5bf21363d7ba596cc9
V3 Mainnet deployed at block: 27461407

Constructor args (both V3 and V4 mainnet):
- usdc: 0x3600000000000000000000000000000000000000
- feeRecipient: 0x62628A9BB100D15494D00f6C76c22C975bBB7195 (owner wallet)
- feeBps: 100 (1%)

Onchain verification (V4 Mainnet, read 2026-10-24):
- usdc() = 0x3600000000000000000000000000000000000000 ✓
- feeBps() = 100 ✓
- feeRecipient() = 0x62628A9BB100D15494D00f6C76c22C975bBB7195 ✓
- owner() = 0x62628A9BB100D15494D00f6C76c22C975bBB7195 ✓
- programCount() = 0 ✓

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
- `src/hooks/useGrantFlowV5.ts` — V5 ABI, read/write hooks, encodeSponsorMeta/parseSponsorMeta, buildProgramUrl/parseProgramPath
- `src/components/pages/v5/ProgramDetailV5.tsx` — V5 program detail (push-payout, ShareBox, ResultsTab, EditProgramModal)
- `src/components/pages/v5/ResultsTab.tsx` — Podium + winner cards + payout tx links (V5 push or V4 pull)
- `src/components/pages/v5/EditProgramModal.tsx` — updateProgram (sponsor-only, 0 submissions, before deadline)

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

## i18n System (EN / VI)

- Source of truth: `src/lib/i18n/en.ts` — 545 keys (as of current session)
- Vietnamese translations split across `vi.part1.ts` through `vi.part4.ts`, merged in `vi.ts`
- Barrel at `src/lib/i18n/index.ts` — exports `EN`, `VI`, `StringKey`, `Lang`, `translate()`
- Hook: `src/hooks/useI18n.ts` — `useI18n()` returns `{ lang, setLang, t }` and sets `<html lang>`
- Check: `bun run check-i18n` — confirms all EN keys exist in VI
- Test: `bun run test:i18n` — 34 assertions, verifies key counts, sample translations, role labels
- Key naming: dot-separated lowercase, e.g. `landing.hero.headline1`, `winners.claimed`
- When adding new EN keys: always add matching VI keys before running checks
- `translate(lang, key)` falls back to EN if VI key is missing at runtime (type-safe at compile time)

## Network Switching (runtime)

Users can switch between Arc Mainnet and Arc Testnet at runtime via the NetworkDropdown in the topbar. The selection is persisted in localStorage (`gf-network`). The build-time default is set by `VITE_CHAIN`.

- `useNetworkStore` — React context holding `network`, `config`, `setNetwork`; `NETWORK_CONFIGS` static map
- `useWrongNetwork` — compares wallet chainId vs selected network; `switchNetwork()` calls `wallet_switchEthereumChain` with `wallet_addEthereumChain` fallback
- `WrongNetworkProvider` / `useDisableTx` — context so all tx buttons read a single `isWrong` boolean
- `NetworkDropdown` — topbar chip with live block, TESTNET badge on testnet, dropdown to switch
- `WrongNetworkBanner` — amber banner shown on app pages when wallet is on wrong chain

## Environment Variables

- `VITE_GRANTFLOW_ADDRESS` — testnet GrantFlow v3 address (set in .env after deploy)
- `VITE_GRANTFLOW_ADDRESS_MAINNET` — mainnet GrantFlow v3 address
- `VITE_GRANTFLOW_V5_ADDRESS` — testnet GrantFlowV5 address (`0x23d26fb2661497c1e658e8d717df8a7dea2f62c0`) [team-split version, replaces 0x46e4…bca]
- `VITE_GRANTFLOW_V5_ADDRESS_MAINNET` — mainnet GrantFlowV5 address (set after browser wallet deploy)
- `VITE_GRANTFLOW_V4_ADDRESS` — testnet GrantFlowV4 address (`0x8a8d4e2378842d02690e247c9241842a30bbf7c4`)
- `VITE_GRANTFLOW_V4_ADDRESS_MAINNET` — mainnet GrantFlowV4 address (`0x41ffdab65fca60bda9beb455285d29ab753c3d2e`)
- `VITE_CHAIN` — `testnet` (default) or `mainnet` (sets build-time default; overridden by localStorage at runtime)
- `VITE_WALLETCONNECT_PROJECT_ID` — WalletConnect project ID (optional)
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS` — Arc Studio RPC proxy (optional outside Arc Studio)
