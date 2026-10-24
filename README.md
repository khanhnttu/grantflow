# GrantFlow

Onchain grant, hackathon, bounty, and referral payout platform. Sponsors create programs (Onchain Build or Open Bounty) with a category and optional description, and lock a USDC prize pool. Builders submit their work; reviewers vote; winners are paid automatically when the approval threshold is reached. Unspent funds are reclaimable by the sponsor after the deadline. A small platform fee is charged at program creation to sustain the protocol.

Built with [Arc Studio](https://studio.arc.io)

---

## Live on Arc Mainnet

| | |
|---|---|
| **App** | [grantflow-usdc.vercel.app](https://grantflow-usdc.vercel.app) |
| **Contract** | `0x7c2866a62e6ad73e15e243d4341219eb3995fe7d` |
| **Explorer** | [explorer.arc.io/address/0x7c2866...](https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d) |
| **Deploy tx** | `0x15fa390fb616c79d891f8194618b5d9e56928402f920aa5bf21363d7ba596cc9` |
| **Chain** | Arc Mainnet (chain ID 5042) |
| **Constructor** | USDC `0x3600...0000`, feeBps 100 (1%), feeRecipient = deployer wallet |

---

## Tech stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Arc Light design system)
- **Web3**: wagmi v2, viem v2, ConnectKit
- **Contracts**: Solidity 0.8.28, Foundry, OpenZeppelin 5.6.1 (SafeERC20, ReentrancyGuard, Ownable2Step)
- **Chain**: Arc Testnet (default) or Arc Mainnet, selected by `VITE_CHAIN`
- **Token**: USDC (same address on both chains: `0x3600000000000000000000000000000000000000`)

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
| GrantFlow v3 (current) | Arc **Mainnet** | `0x7c2866a62e6ad73e15e243d4341219eb3995fe7d` | [View](https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d) |
| GrantFlow v3 (testnet) | Arc Testnet | `0x3805f86f71b47480a2b31d563ce1620b490a841f` | [View](https://explorer.testnet.arc.io/address/0x3805f86f71b47480a2b31d563ce1620b490a841f) |
| GrantFlow v2 (deprecated) | Arc Testnet | `0x541e15b5a1fe75534ff355d677a5ab7428bc1e93` | [View](https://explorer.testnet.arc.io/address/0x541e15b5a1fe75534ff355d677a5ab7428bc1e93) |

Mainnet constructor args: `usdc=0x3600000000000000000000000000000000000000`, `feeRecipient=0x62628A9BB100D15494D00f6C76c22C975bBB7195`, `feeBps=100`
Mainnet deploy tx: `0x15fa390fb616c79d891f8194618b5d9e56928402f920aa5bf21363d7ba596cc9`

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

## New in V4 (GrantFlowV4)

GrantFlowV4 adds a full hackathon-contest flow with ranked prizes, two-phase deadlines (Submission then Judging), conflict-of-interest guards (sponsors/judges cannot submit), a judge vote budget per prize tier, and a pull-claim payout model.

V4 Testnet: `0x8a8d4e2378842d02690e247c9241842a30bbf7c4` (Arc Testnet, 68/68 tests passing, both auditors: no material findings).

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_GRANTFLOW_ADDRESS` | GrantFlow v3 contract address on Arc Testnet | Yes |
| `VITE_GRANTFLOW_ADDRESS_MAINNET` | GrantFlow v3 contract address on Arc Mainnet | Mainnet only |
| `VITE_GRANTFLOW_V4_ADDRESS` | GrantFlowV4 contract address on Arc Testnet | Yes (defaults to deployed testnet address) |
| `VITE_GRANTFLOW_V4_ADDRESS_MAINNET` | GrantFlowV4 contract address on Arc Mainnet | Mainnet only |
| `VITE_CHAIN` | `testnet` (default) or `mainnet` | No |
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

## Test (Solidity)

```bash
cd contracts && forge test -vv
```

89 tests covering happy paths, reverts, fuzz, fee model, and both program types (ONCHAIN_BUILD / OPEN_BOUNTY) — all passing.

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
