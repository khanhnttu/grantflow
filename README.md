# GrantFlow

Onchain grant, hackathon, bounty, and referral payout platform. Sponsors create programs with ranked USDC prizes and two-phase deadlines (Submission then Judging). Builders submit work; judges vote; after finalization prizes are pushed directly to winners in USDC (V5, the default) with no claim step needed. A small platform fee (default 1%) is charged at program creation. Older programs (V4 pull-claim, V3 legacy) remain viewable.

Built with [Arc Studio](https://studio.arc.io)

---

## Live on Arc Mainnet

| | |
|---|---|
| **App** | [grantflowapp.vercel.app](https://grantflowapp.vercel.app) |
| **GrantFlowV5** | `0xe67ec49a6618cc205fab934fc76f8a271cc77c37` ([explorer](https://explorer.arc.io/address/0xe67ec49a6618cc205fab934fc76f8a271cc77c37)) |
| **GrantFlowV5 (testnet)** | `0x23d26fb2661497c1e658e8d717df8a7dea2f62c0` ([explorer](https://explorer.testnet.arc.io/address/0x23d26fb2661497c1e658e8d717df8a7dea2f62c0)) |
| **GrantFlowV4** | `0x41ffdab65fca60bda9beb455285d29ab753c3d2e` ([explorer](https://explorer.arc.io/address/0x41ffdab65fca60bda9beb455285d29ab753c3d2e)) (legacy active) |
| **V4 deploy tx** | `0xb36e61207035267a2ef178bcf5daacbeb0cae53fb4e54576bed72f87645a1617` |
| **GrantFlowV3** | `0x7c2866a62e6ad73e15e243d4341219eb3995fe7d` ([explorer](https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d)) (legacy) |
| **Chain** | Arc Mainnet (chain ID 5042) |
| **Constructor** | USDC `0x3600...0000`, feeBps 100 (1%), feeRecipient `0x62628A9BB100D15494D00f6C76c22C975bBB7195` |

---

## Tech stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Arc Light design system)
- **Web3**: wagmi v2, viem v2, ConnectKit
- **Contracts**: Solidity 0.8.28, Foundry, OpenZeppelin 5.6.1 (SafeERC20, ReentrancyGuard, Ownable2Step)
- **Chain**: Arc Testnet (default) or Arc Mainnet, selected by `VITE_CHAIN`
- **Token**: USDC (same address on both chains: `0x3600000000000000000000000000000000000000`)

## Brand assets

- **Logo components**: `src/components/BrandLogo.tsx` — exports `LogoMark` (icon only) and `Logo` (icon + wordmark), both with `variant="light"` (white mark on navy) or `variant="dark"` (sky-blue mark on navy) props
- **Favicon**: `public/favicon.svg` (SVG, primary); `public/favicon-32x32.png`, `public/favicon-16x16.png` (PNG fallbacks)
- **Apple touch icon**: `public/apple-touch-icon.png` (180×180)
- **PWA icons**: `public/icon-192.png`, `public/icon-512.png`
- **PWA manifest**: `public/site.webmanifest` (name: GrantFlow, theme_color: `#1555A0`)
- **OG image**: `public/og-image.svg` (1200×630, served at `/og-image.svg`)

---

## Business model

GrantFlow charges a platform fee on each new grant program, collected at program creation in the same USDC transaction. The fee goes immediately to the `feeRecipient` address and is never mixed with the prize pool. Sponsors see a clear breakdown (prize pool + fee = total) before they sign.

| Parameter | Default | Maximum |
|---|---|---|
| Fee rate (`feeBps`) | 100 (1%) | 500 (5%) |
| Fee recipient | Deployer wallet | Updatable by owner |

The contract owner (Ownable2Step) can update the fee rate and recipient on-chain via `setFeeBps` and `setFeeRecipient`. The `totalFeesCollected` accumulator tracks all-time protocol revenue, shown publicly on the Programs page.

**Fee isolation guarantee**: `program.totalDeposited` stores only the prize pool (never the fee). Reclaim and payout math operates exclusively on `totalDeposited`, so the fee can never be accidentally returned to a sponsor or paid out to a winner.

---

## Deployed contracts

| Contract | Chain | Address | Explorer |
|---|---|---|---|
| GrantFlowV5 (**active** — team-split, push-payout) | Arc Mainnet | `0xe67ec49a6618cc205fab934fc76f8a271cc77c37` | [View](https://explorer.arc.io/address/0xe67ec49a6618cc205fab934fc76f8a271cc77c37) |
| GrantFlowV5 (testnet **active**) | Arc Testnet | `0x23d26fb2661497c1e658e8d717df8a7dea2f62c0` | [View](https://explorer.testnet.arc.io/address/0x23d26fb2661497c1e658e8d717df8a7dea2f62c0) |
| GrantFlowV4 (legacy) | Arc Mainnet | `0x41ffdab65fca60bda9beb455285d29ab753c3d2e` | [View](https://explorer.arc.io/address/0x41ffdab65fca60bda9beb455285d29ab753c3d2e) |
| GrantFlowV4 (testnet legacy) | Arc Testnet | `0x0754d3359f18be2079c6d3cea29658b464cfe946` | [View](https://explorer.testnet.arc.io/address/0x0754d3359f18be2079c6d3cea29658b464cfe946) |
| GrantFlowV3 (legacy) | Arc Mainnet | `0x7c2866a62e6ad73e15e243d4341219eb3995fe7d` | [View](https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d) |
| GrantFlowV3 (testnet legacy) | Arc Testnet | `0x3805f86f71b47480a2b31d563ce1620b490a841f` | [View](https://explorer.testnet.arc.io/address/0x3805f86f71b47480a2b31d563ce1620b490a841f) |

V5 Mainnet deploy tx: `0x5872ac6c5376700e505667170e180f8d4b92b8d07dfae506bb97d0e44b599d20`
V4 Mainnet deploy tx: `0xb36e61207035267a2ef178bcf5daacbeb0cae53fb4e54576bed72f87645a1617`
Constructor args (V5/V4/V3, all chains): `usdc=0x3600000000000000000000000000000000000000`, `feeRecipient=0x62628A9BB100D15494D00f6C76c22C975bBB7195`, `feeBps=100`

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Foundry](https://book.getfoundry.sh) (forge, cast, anvil)

---

## Install

```bash
bun install
```

---

## V5 — the active contract (GrantFlowV5)

GrantFlowV5 is the default contract for all new programs. It adds team submissions (up to 5 members, percentage split in basis points summing to 10,000), push-payout finalization (prizes are transferred directly to each winner and team member in the finalize transaction — no claim step), sponsor metadata (name, website/X, logo) stored in the description JSON envelope, and `updateProgram` (sponsor can edit name/description/deadlines before any submissions exist). Programs can be cancelled for a full sponsor refund.

V5 Mainnet: `0xe67ec49a6618cc205fab934fc76f8a271cc77c37` (deploy tx `0x5872ac6c5376700e505667170e180f8d4b92b8d07dfae506bb97d0e44b599d20`).
V5 Testnet: `0x23d26fb2661497c1e658e8d717df8a7dea2f62c0` (45/45 Foundry tests passing, 23/23 e2e on Arc Testnet).

## V4 (GrantFlowV4 — legacy)

GrantFlowV4 has ranked prizes, two-phase deadlines, conflict-of-interest guards, and a pull-claim payout model. All V4 programs remain viewable and claimable.

V4 Mainnet: `0x41ffdab65fca60bda9beb455285d29ab753c3d2e` (Arc Mainnet, deploy tx `0xb36e61207035267a2ef178bcf5daacbeb0cae53fb4e54576bed72f87645a1617`).
V4 Testnet: `0x0754d3359f18be2079c6d3cea29658b464cfe946`.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_GRANTFLOW_ADDRESS` | GrantFlow v3 contract address on Arc Testnet | Yes |
| `VITE_GRANTFLOW_ADDRESS_MAINNET` | GrantFlow v3 contract address on Arc Mainnet | Mainnet only |
| `VITE_GRANTFLOW_V4_ADDRESS` | GrantFlowV4 contract address on Arc Testnet | Yes (defaults to deployed testnet address) |
| `VITE_GRANTFLOW_V5_ADDRESS` | GrantFlowV5 contract address on Arc Testnet | No (defaults to deployed testnet address) |
| `VITE_GRANTFLOW_V5_ADDRESS_MAINNET` | GrantFlowV5 contract address on Arc Mainnet | Mainnet only (set after browser wallet deploy) |
| `VITE_GRANTFLOW_V4_ADDRESS_MAINNET` | GrantFlowV4 contract address on Arc Mainnet | Mainnet only |
| `VITE_CHAIN` | `testnet` (default) or `mainnet` | No |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for wallet connections | No (ConnectKit works without it) |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional outside Arc Studio |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy auth token | Optional outside Arc Studio |
| `RPC_PROXY_CHAINS` | Comma-separated list of chains available on the proxy | Optional outside Arc Studio |

Copy `.env.example` (or create `.env`) and fill in the values above.

---

## Run

```bash
bun run dev
```

---

## Build

```bash
bun run build
```

---

## Test

**Solidity (Foundry)**

```bash
cd contracts && forge test -vv
```

192 tests (89 v3 + 68 v4 + 35 v5) covering happy paths, reverts, fuzz, fee model, both program types, push-payout — all passing.

**i18n (EN/VI completeness)**

```bash
bun run check-i18n   # checks all EN keys exist in VI
bun run test:i18n    # verifies EN keys equal VI key count, sample translations, new keys
```

**E2E testnet (full lifecycle against Arc Testnet)**

```bash
bun run test:e2e     # create program, submit, judge, finalize, claim, reclaim, cancel
```

**Production smoke test**

```bash
bun run test:smoke   # checks live Vercel deployment: meta tags, assets, sitemaps, routes
```

---

## Deploy to Arc Testnet (Circle platform wallet)

From inside Arc Studio, simply say "deploy" — the platform handles everything.

---

## Deploy to Arc Mainnet (your own wallet)

> **Warning:** Transactions on mainnet involve real funds and are irreversible. Review all addresses, amounts, and constructor args carefully before proceeding. You are solely responsible for any loss.

**Prerequisites**

1. A funded Arc Mainnet wallet (USDC for gas on Arc).
2. Export your private key: `export PRIVATE_KEY=0x...`
3. Build the contract: `cd /home/user/app && forge build`

**Deploy**

```bash
forge create contracts/GrantFlow.sol:GrantFlow \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0x3600000000000000000000000000000000000000 \
    <YOUR_FEE_RECIPIENT_ADDRESS> \
    100 \
  --broadcast
```

Replace `<YOUR_FEE_RECIPIENT_ADDRESS>` with the wallet that will receive platform fees.

**After deployment**

1. Note the contract address printed by forge.
2. Add it to `.env`: `VITE_GRANTFLOW_ADDRESS_MAINNET=0x<your-address>`
3. Set `VITE_CHAIN=mainnet` in `.env`.
4. Restart the dev server.

**Transfer ownership (recommended)**

After deploy, the deployer wallet is the owner. To transfer to a multisig or hardware wallet:

```bash
cast send <CONTRACT_ADDRESS> "transferOwnership(address)" <NEW_OWNER> \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $PRIVATE_KEY
```

The new owner must call `acceptOwnership()` to complete the Ownable2Step transfer.
