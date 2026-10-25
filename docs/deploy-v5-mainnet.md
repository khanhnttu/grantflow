# GrantFlowV5 Mainnet Deploy Guide

## Prerequisites

- Foundry installed on your machine (`forge` CLI)
- Arc Mainnet in your wallet (chain ID 5042, RPC `https://rpc.mainnet.arc.io`)
- Wallet `0x62628A9BB100D15494D00f6C76c22C975bBB7195` — needs USDC for gas (approx 5–10 USDC)
- `GrantFlowV5.sol` compiled artifact — run `forge build` in `contracts/` first

## Step 1: Build the contract

From the `contracts/` directory:

```bash
forge build
```

Confirm you see `GrantFlowV5.sol` in the `out/` directory.

## Step 2: Deploy to Arc Mainnet

```bash
forge create contracts/GrantFlowV5.sol:GrantFlowV5 \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args \
    0x3600000000000000000000000000000000000000 \
    0x62628A9BB100D15494D00f6C76c22C975bBB7195 \
    100
```

**Constructor args:**
| Arg | Value | Meaning |
|-----|-------|---------|
| `usdc_` | `0x3600000000000000000000000000000000000000` | Arc Mainnet USDC |
| `feeRecipient_` | `0x62628A9BB100D15494D00f6C76c22C975bBB7195` | Your wallet (receives 1% fee) |
| `feeBps_` | `100` | 1% platform fee |

**Note:** Export your private key as `PRIVATE_KEY` environment variable before running, e.g.:
```bash
export PRIVATE_KEY=0x...
```
Never paste your private key directly into the command. After the deploy, unset it:
```bash
unset PRIVATE_KEY
```

## Step 3: Verify the deployment

From the `forge create` output, copy the `Deployed to:` address. Verify on Arc Mainnet Explorer:
```
https://explorer.arc.io/address/<YOUR_V5_ADDRESS>
```

Read-verify:
- `usdc()` → `0x3600000000000000000000000000000000000000`
- `feeRecipient()` → `0x62628A9BB100D15494D00f6C76c22C975bBB7195`
- `feeBps()` → `100`
- `owner()` → `0x62628A9BB100D15494D00f6C76c22C975bBB7195`

## Step 4: Add the address to the app

```bash
printf 'VITE_GRANTFLOW_V5_ADDRESS_MAINNET=<YOUR_V5_ADDRESS>\n' >> /home/user/app/.env
```

Then tell Arc Studio: "The V5 mainnet address is 0x…" — it will rebuild and deploy to Vercel.

## Step 5: Tell Arc Studio the address

Once deployed, send the address in chat. The app will be updated and redeployed.

---

## Alternative: Foundry Cast (read-only verification)

```bash
cast call <YOUR_V5_ADDRESS> "owner()(address)" --rpc-url https://rpc.mainnet.arc.io
cast call <YOUR_V5_ADDRESS> "feeBps()(uint256)" --rpc-url https://rpc.mainnet.arc.io
cast call <YOUR_V5_ADDRESS> "usdc()(address)"   --rpc-url https://rpc.mainnet.arc.io
```
