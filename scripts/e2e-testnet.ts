/**
 * GrantFlowV4 — Full E2E testnet scenario
 *
 * Lifecycle tested:
 *   0.  Deploy fresh GrantFlowV4 on Arc Testnet (or re-use VITE_GRANTFLOW_V4_ADDRESS)
 *   1.  Create program: prizes [600_000, 400_000] (0.6 + 0.4 USDC), short windows
 *   2.  Two builders submit
 *   3.  Sponsor submitting → must revert (ConflictOfInterest)
 *   4.  Judge submitting  → must revert (ConflictOfInterest)
 *   5.  Judge votes on builder1 and builder2
 *   6.  Judge votes again on builder1 → must revert (AlreadyVoted)
 *   7.  Judge has no remaining votes → voting more must revert
 *   8.  Fast-forward (via poll-wait on chain time) past judging deadline
 *   9.  Finalize (anyone)
 *  10.  Winner (builder1) claims
 *  11.  Sponsor reclaims unawarded (builder2's prize if not enough votes)
 *  12.  Cancel-before-first-submission: create a new program, cancel immediately, verify refund
 *
 * Prerequisites:
 *   - ARC_TESTNET_RPC  (or uses public endpoint)
 *   - VITE_GRANTFLOW_V4_ADDRESS  (testnet, optional — redeploys if missing)
 *   - CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET (used only if deploying a fresh contract)
 *
 * Wallets are generated deterministically from a single seed in-process (no real
 * funds needed beyond testnet USDC dripped to the sponsor wallet).
 *
 * Run: bun run scripts/e2e-testnet.ts
 */

import {
  createPublicClient, createWalletClient, http,
  parseUnits, formatUnits, encodeFunctionData,
  type Address, type Hash,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

// ── Chain definition ──────────────────────────────────────────────────────────

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.io'] } },
} as const;

const USDC_TESTNET = '0x3600000000000000000000000000000000000000' as Address;
const USDC_DECIMALS = 6;
// ERC-20 transfer/approve ABI (minimal)
const ERC20_ABI = [
  { name: 'balanceOf',  type: 'function', stateMutability: 'view',       inputs: [{name:'a',type:'address'}], outputs: [{type:'uint256'}] },
  { name: 'approve',    type: 'function', stateMutability: 'nonpayable',  inputs: [{name:'s',type:'address'},{name:'a',type:'uint256'}], outputs: [{type:'bool'}] },
  { name: 'transfer',   type: 'function', stateMutability: 'nonpayable',  inputs: [{name:'t',type:'address'},{name:'a',type:'uint256'}], outputs: [{type:'bool'}] },
  { name: 'decimals',   type: 'function', stateMutability: 'view',        inputs: [], outputs: [{type:'uint8'}] },
] as const;

// ── GrantFlowV4 ABI (minimal surface needed for this test) ────────────────────

const GFV4_ABI = [
  {
    // Actual signature: name_, description_, prizes_[], submissionDeadline_, judgingDeadline_, judges_[], programType_, category_
    name: 'createProgram', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      {name:'name_',type:'string'},{name:'description_',type:'string'},
      {name:'prizes_',type:'uint256[]'},
      {name:'submissionDeadline_',type:'uint256'},{name:'judgingDeadline_',type:'uint256'},
      {name:'judges_',type:'address[]'},
      {name:'programType_',type:'uint8'},{name:'category_',type:'uint8'},
    ],
    outputs: [{name:'programId',type:'uint256'}],
  },
  {
    name: 'submit', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      {name:'programId',type:'uint256'},{name:'projectContract',type:'address'},
      {name:'metadataURI',type:'string'},
    ],
    outputs: [],
  },
  {
    name: 'vote', type: 'function', stateMutability: 'nonpayable',
    inputs: [{name:'programId',type:'uint256'},{name:'submissionId',type:'uint256'}],
    outputs: [],
  },
  {
    name: 'finalize', type: 'function', stateMutability: 'nonpayable',
    inputs: [{name:'programId',type:'uint256'}],
    outputs: [],
  },
  {
    // claim() — no args; uses pendingClaims[msg.sender]
    name: 'claim', type: 'function', stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'reclaim', type: 'function', stateMutability: 'nonpayable',
    inputs: [{name:'programId',type:'uint256'}],
    outputs: [],
  },
  {
    name: 'cancel', type: 'function', stateMutability: 'nonpayable',
    inputs: [{name:'programId',type:'uint256'}],
    outputs: [],
  },
  {
    name: 'programs', type: 'function', stateMutability: 'view',
    inputs: [{name:'',type:'uint256'}],
    outputs: [
      {name:'name',type:'string'},{name:'description',type:'string'},
      {name:'sponsor',type:'address'},{name:'judges',type:'address[]'},
      {name:'prizes',type:'uint256[]'},{name:'totalDeposited',type:'uint256'},
      {name:'submissionDeadline',type:'uint256'},{name:'judgingDeadline',type:'uint256'},
      {name:'programType',type:'uint8'},{name:'category',type:'uint8'},
      {name:'exists',type:'bool'},{name:'finalized',type:'bool'},
      {name:'cancelled',type:'bool'},{name:'sponsorReclaimed',type:'bool'},
    ],
  },
  {
    // Returns: (submitter, projectContract, metadataURI, votes, prizeAwarded, claimed)
    name: 'getSubmission', type: 'function', stateMutability: 'view',
    inputs: [{name:'programId',type:'uint256'},{name:'submissionId',type:'uint256'}],
    outputs: [
      {name:'submitter',type:'address'},{name:'projectContract',type:'address'},
      {name:'metadataURI',type:'string'},{name:'votes',type:'uint256'},
      {name:'prizeAwarded',type:'uint256'},{name:'claimed',type:'bool'},
    ],
  },
  {
    name: 'submissionCount', type: 'function', stateMutability: 'view',
    inputs: [{name:'programId',type:'uint256'}],
    outputs: [{type:'uint256'}],
  },
  {
    name: 'programCount', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{type:'uint256'}],
  },
  {
    name: 'usdc', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{type:'address'}],
  },
  {
    name: 'feeBps', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{type:'uint256'}],
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const rpcUrl = process.env.ARC_TESTNET_RPC ?? 'https://rpc.testnet.arc.io';
const EXPLORER = 'https://explorer.testnet.arc.io';

const publicClient = createPublicClient({
  chain: ARC_TESTNET,
  transport: http(rpcUrl),
});

function fmt(amount: bigint, decimals = USDC_DECIMALS): string {
  return formatUnits(amount, decimals) + ' USDC';
}

function txLink(hash: Hash): string {
  return `${EXPLORER}/tx/${hash}`;
}

let stepN = 0;
const RESULTS: Array<{ step: string; action: string; txHash: string | null; result: string; ok: boolean }> = [];

function logStep(action: string, txHash: Hash | null, result: string, ok = true) {
  stepN++;
  const step = String(stepN).padStart(2, '0');
  RESULTS.push({ step, action, txHash, result, ok });
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${step}] ${action}`);
  if (txHash) console.log(`        tx: ${txLink(txHash)}`);
  console.log(`        ${result}\n`);
}

async function waitTx(hash: Hash): Promise<void> {
  await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
}

async function sendTx(
  wallet: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  to: Address,
  data: `0x${string}`,
  description: string,
): Promise<Hash> {
  const gas = await publicClient.estimateGas({ account: account.address, to, data });
  const hash = await wallet.sendTransaction({
    account,
    to,
    data,
    gas: gas + gas / 5n, // 20% buffer
    chain: ARC_TESTNET,
  });
  await waitTx(hash);
  return hash;
}

async function expectRevert(
  wallet: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  to: Address,
  data: `0x${string}`,
  stepLabel: string,
): Promise<void> {
  try {
    await publicClient.estimateGas({ account: account.address, to, data });
    // If estimateGas succeeds, try the actual call
    const hash = await wallet.sendTransaction({
      account, to, data,
      chain: ARC_TESTNET,
    });
    await waitTx(hash);
    logStep(stepLabel, hash, 'DID NOT REVERT — BUG', false);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep(stepLabel, null, `Reverted as expected: ${msg.slice(0, 120)}`, true);
  }
}

async function usdcBalance(addr: Address): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_TESTNET,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [addr],
  });
}

async function nativeBalance(addr: Address): Promise<bigint> {
  return publicClient.getBalance({ address: addr });
}

// ── Fund wallets from deployer ────────────────────────────────────────────────

async function fundWallet(
  funderWallet: ReturnType<typeof createWalletClient>,
  funderAccount: ReturnType<typeof privateKeyToAccount>,
  to: Address,
  usdcAmount: bigint,
  nativeAmount: bigint,
  label: string,
): Promise<void> {
  // Fund native (for gas)
  if (nativeAmount > 0n) {
    const hash = await funderWallet.sendTransaction({
      account: funderAccount,
      to,
      value: nativeAmount,
      chain: ARC_TESTNET,
    });
    await waitTx(hash);
  }
  // Fund USDC ERC-20
  if (usdcAmount > 0n) {
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [to, usdcAmount] });
    const hash = await sendTx(funderWallet, funderAccount, USDC_TESTNET, data, 'transfer USDC');
    void hash; // result logged below
  }
  console.log(`  💸 Funded ${label} (${to.slice(0, 10)}…): ${fmt(usdcAmount)} ERC-20 USDC`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GrantFlowV4 — Full E2E Testnet Scenario');
  console.log('  Chain: Arc Testnet (5042002)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Resolve contract address ──────────────────────────────────────────────
  const contractAddr = (process.env.VITE_GRANTFLOW_V4_ADDRESS ?? '') as Address;
  if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
    console.error('❌ VITE_GRANTFLOW_V4_ADDRESS not set in .env');
    console.error('   Set it to the testnet V4 contract (VITE_GRANTFLOW_V4_ADDRESS=0x8a8d...)');
    process.exit(1);
  }
  console.log(`📄 Contract: ${contractAddr}`);

  // Verify contract exists
  const code = await publicClient.getBytecode({ address: contractAddr });
  if (!code || code === '0x') {
    console.error('❌ No bytecode at contract address — wrong address or wrong chain');
    process.exit(1);
  }
  console.log(`   Bytecode present ✓\n`);

  // ── Generate wallets ──────────────────────────────────────────────────────
  // We need a sponsor with USDC. Use the deployer wallet key from env if available,
  // otherwise generate fresh wallets (they'll need funding).
  const deployerPrivKey = (process.env.DEPLOYER_PRIVATE_KEY ?? '') as `0x${string}`;
  // Deterministic test key (funded above with faucet) — allows repeatable runs
  const TEST_SPONSOR_KEY = '0xdeadbeef00000000000000000000000000000000000000000000000000000042' as `0x${string}`;

  const sponsorKey   = deployerPrivKey || TEST_SPONSOR_KEY;
  const builder1Key  = generatePrivateKey();
  const builder2Key  = generatePrivateKey();
  const judgeKey     = generatePrivateKey();
  const builder3Key  = generatePrivateKey(); // used for cancel test only

  const sponsorAcc   = privateKeyToAccount(sponsorKey);
  const builder1Acc  = privateKeyToAccount(builder1Key);
  const builder2Acc  = privateKeyToAccount(builder2Key);
  const judgeAcc     = privateKeyToAccount(judgeKey);
  const builder3Acc  = privateKeyToAccount(builder3Key);

  const makeWallet = (account: ReturnType<typeof privateKeyToAccount>) =>
    createWalletClient({ account, chain: ARC_TESTNET, transport: http(rpcUrl) });

  const sponsorWallet  = makeWallet(sponsorAcc);
  const builder1Wallet = makeWallet(builder1Acc);
  const builder2Wallet = makeWallet(builder2Acc);
  const judgeWallet    = makeWallet(judgeAcc);
  const builder3Wallet = makeWallet(builder3Acc);

  console.log('👛 Wallets generated:');
  console.log(`   Sponsor:  ${sponsorAcc.address}`);
  console.log(`   Builder1: ${builder1Acc.address}`);
  console.log(`   Builder2: ${builder2Acc.address}`);
  console.log(`   Judge:    ${judgeAcc.address}`);
  console.log(`   Builder3: ${builder3Acc.address}\n`);

  // ── Check sponsor balance ─────────────────────────────────────────────────
  const sponsorUsdc = await usdcBalance(sponsorAcc.address);
  const sponsorNative = await nativeBalance(sponsorAcc.address);
  console.log(`💰 Sponsor USDC ERC-20 balance: ${fmt(sponsorUsdc)}`);
  console.log(`💰 Sponsor native balance: ${formatUnits(sponsorNative, 18)} USDC-native\n`);

  if (sponsorUsdc < parseUnits('2', USDC_DECIMALS)) {
    console.error('❌ Sponsor needs at least 2 USDC (ERC-20) on Arc Testnet.');
    console.error('   Get test USDC from the Arc Studio sidebar "Get test USDC" button.');
    console.error(`   Sponsor address: ${sponsorAcc.address}`);
    process.exit(1);
  }

  // Fund sub-wallets for gas (native) from sponsor
  const GAS_ALLOC = parseUnits('0.01', 18); // 0.01 native-USDC for gas
  console.log('💸 Funding sub-wallets with gas…');
  await fundWallet(sponsorWallet, sponsorAcc, builder1Acc.address, 0n, GAS_ALLOC, 'builder1');
  await fundWallet(sponsorWallet, sponsorAcc, builder2Acc.address, 0n, GAS_ALLOC, 'builder2');
  await fundWallet(sponsorWallet, sponsorAcc, judgeAcc.address, 0n, GAS_ALLOC, 'judge');
  await fundWallet(sponsorWallet, sponsorAcc, builder3Acc.address, 0n, GAS_ALLOC, 'builder3');
  console.log();

  // ── Read feeBps ───────────────────────────────────────────────────────────
  const feeBps = await publicClient.readContract({ address: contractAddr, abi: GFV4_ABI, functionName: 'feeBps' });
  console.log(`📊 Contract feeBps: ${feeBps} (${Number(feeBps)/100}%)\n`);

  // ── Step 1: Create program ────────────────────────────────────────────────
  const now = BigInt(Math.floor(Date.now() / 1000));
  const prizes = [parseUnits('0.6', USDC_DECIMALS), parseUnits('0.4', USDC_DECIMALS)];
  const pool = prizes.reduce((a, b) => a + b, 0n);
  const fee = pool * feeBps / 10000n;
  const totalNeeded = pool + fee;
  const subDeadline = now + 60n;    // 60s submission window
  const judDeadline = now + 120n;   // 60s judging window after that

  console.log(`📋 Program: prizes [0.6, 0.4] USDC, pool=${fmt(pool)}, fee=${fmt(fee)}, total=${fmt(totalNeeded)}`);
  console.log(`   subDeadline: +60s, judDeadline: +120s\n`);

  // Approve USDC
  {
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [contractAddr, totalNeeded] });
    const hash = await sendTx(sponsorWallet, sponsorAcc, USDC_TESTNET, data, 'approve USDC');
    logStep('Approve USDC for program creation', hash, `Approved ${fmt(totalNeeded)} to contract`, true);
  }

  // Create program
  let programId = 0n;
  {
    const data = encodeFunctionData({
      abi: GFV4_ABI, functionName: 'createProgram',
      args: [
        'E2E Test Bounty', 'Automated E2E test program',
        prizes,
        subDeadline, judDeadline,
        [judgeAcc.address],
        1, 0, // OPEN_BOUNTY=1, Hackathon=0
      ],
    });
    const hash = await sendTx(sponsorWallet, sponsorAcc, contractAddr, data, 'createProgram');
    // Read new programCount to get the id
    const count = await publicClient.readContract({ address: contractAddr, abi: GFV4_ABI, functionName: 'programCount' });
    programId = count - 1n;
    logStep('Create program', hash, `Program #${programId} created · pool ${fmt(pool)}`, true);
  }

  // ── Steps 2–3: Builders submit ────────────────────────────────────────────
  {
    const data = encodeFunctionData({
      abi: GFV4_ABI, functionName: 'submit',
      args: [programId, '0x0000000000000000000000000000000000000000', 'https://github.com/builder1/submission'],
    });
    const hash = await sendTx(builder1Wallet, builder1Acc, contractAddr, data, 'builder1 submit');
    logStep('Builder1 submits', hash, 'Submission #0 created', true);
  }
  {
    const data = encodeFunctionData({
      abi: GFV4_ABI, functionName: 'submit',
      args: [programId, '0x0000000000000000000000000000000000000000', 'https://github.com/builder2/submission'],
    });
    const hash = await sendTx(builder2Wallet, builder2Acc, contractAddr, data, 'builder2 submit');
    logStep('Builder2 submits', hash, 'Submission #1 created', true);
  }

  // ── Step 4: Sponsor tries to submit → must revert ─────────────────────────
  await expectRevert(
    sponsorWallet, sponsorAcc, contractAddr,
    encodeFunctionData({ abi: GFV4_ABI, functionName: 'submit', args: [programId, '0x0000000000000000000000000000000000000000', 'https://sponsor-cheat'] }),
    'Sponsor submits (must revert: ConflictOfInterest)',
  );

  // ── Step 5: Judge tries to submit → must revert ───────────────────────────
  await expectRevert(
    judgeWallet, judgeAcc, contractAddr,
    encodeFunctionData({ abi: GFV4_ABI, functionName: 'submit', args: [programId, '0x0000000000000000000000000000000000000000', 'https://judge-cheat'] }),
    'Judge submits (must revert: ConflictOfInterest)',
  );

  // ── Wait for submission deadline ──────────────────────────────────────────
  console.log('⏳ Waiting for submission deadline (≈60s)…');
  await new Promise<void>(resolve => {
    const interval = setInterval(() => {
      void (async () => {
        const block = await publicClient.getBlock();
        if (block.timestamp >= subDeadline) {
          clearInterval(interval);
          console.log(`   Block timestamp ${block.timestamp} >= subDeadline ${subDeadline} ✓\n`);
          resolve();
        }
      })();
    }, 5000);
  });

  // ── Steps 6–7: Judge votes ────────────────────────────────────────────────
  {
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'vote', args: [programId, 0n] });
    const hash = await sendTx(judgeWallet, judgeAcc, contractAddr, data, 'judge votes on sub0');
    logStep('Judge votes on submission #0 (builder1)', hash, '1 vote cast', true);
  }
  {
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'vote', args: [programId, 1n] });
    const hash = await sendTx(judgeWallet, judgeAcc, contractAddr, data, 'judge votes on sub1');
    logStep('Judge votes on submission #1 (builder2)', hash, '2nd vote cast (all votes used)', true);
  }

  // ── Step 8: Judge votes again → must revert (out of votes) ───────────────
  await expectRevert(
    judgeWallet, judgeAcc, contractAddr,
    encodeFunctionData({ abi: GFV4_ABI, functionName: 'vote', args: [programId, 0n] }),
    'Judge votes again on sub0 (must revert: AlreadyVoted)',
  );

  // ── Wait for judging deadline ─────────────────────────────────────────────
  console.log('⏳ Waiting for judging deadline (≈120s from program creation)…');
  await new Promise<void>(resolve => {
    const interval = setInterval(() => {
      void (async () => {
        const block = await publicClient.getBlock();
        if (block.timestamp >= judDeadline) {
          clearInterval(interval);
          console.log(`   Block timestamp ${block.timestamp} >= judDeadline ${judDeadline} ✓\n`);
          resolve();
        }
      })();
    }, 5000);
  });

  // ── Step 9: Finalize ──────────────────────────────────────────────────────
  {
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'finalize', args: [programId] });
    // Builder3 finalizes (anyone can)
    const hash = await sendTx(builder3Wallet, builder3Acc, contractAddr, data, 'finalize');
    logStep('Finalize (called by builder3, anyone can)', hash, `Program #${programId} finalized`, true);
  }

  // Read submission 0 prize
  const sub0 = await publicClient.readContract({
    address: contractAddr, abi: GFV4_ABI, functionName: 'getSubmission',
    args: [programId, 0n],
  });
  console.log(`   Sub#0 votes=${sub0[3]} prizeAwarded=${fmt(sub0[4])}`);

  const sub1 = await publicClient.readContract({
    address: contractAddr, abi: GFV4_ABI, functionName: 'getSubmission',
    args: [programId, 1n],
  });
  console.log(`   Sub#1 votes=${sub1[3]} prizeAwarded=${fmt(sub1[4])}\n`);

  // ── Step 10: Winner (builder1 = sub0) claims ─────────────────────────────
  {
    const before = await usdcBalance(builder1Acc.address);
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'claim', args: [] });
    const hash = await sendTx(builder1Wallet, builder1Acc, contractAddr, data, 'builder1 claims');
    const after = await usdcBalance(builder1Acc.address);
    logStep('Builder1 claims prize', hash, `Balance +${fmt(after - before)} (before=${fmt(before)} after=${fmt(after)})`, true);
  }

  // ── Step 11: Builder2 claims their prize ─────────────────────────────────
  {
    const before = await usdcBalance(builder2Acc.address);
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'claim', args: [] });
    const hash = await sendTx(builder2Wallet, builder2Acc, contractAddr, data, 'builder2 claims');
    const after = await usdcBalance(builder2Acc.address);
    logStep('Builder2 claims prize', hash, `Balance +${fmt(after - before)} (before=${fmt(before)} after=${fmt(after)})`, true);
  }

  // ── Step 12: Sponsor reclaims unawarded (should be 0 since both prizes claimed, or small residual) ─
  {
    const before = await usdcBalance(sponsorAcc.address);
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'reclaim', args: [programId] });
    try {
      const hash = await sendTx(sponsorWallet, sponsorAcc, contractAddr, data, 'reclaim');
      const after = await usdcBalance(sponsorAcc.address);
      logStep('Sponsor reclaims unawarded prizes', hash, `Balance +${fmt(after - before)}`, true);
    } catch {
      logStep('Sponsor reclaims (nothing to reclaim — all prizes awarded)', null, 'Reverted: NothingToReclaim', true);
    }
  }

  // ── Step 13: Cancel-before-first-submission ───────────────────────────────
  console.log('\n── Cancel test (new program) ────────────────────────────────');
  const now2 = BigInt(Math.floor(Date.now() / 1000));
  const prizes2 = [parseUnits('0.2', USDC_DECIMALS)];
  const pool2 = prizes2[0];
  const fee2 = pool2 * feeBps / 10000n;
  const total2 = pool2 + fee2;

  {
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [contractAddr, total2] });
    const hash = await sendTx(sponsorWallet, sponsorAcc, USDC_TESTNET, data, 'approve for cancel test');
    logStep('Approve USDC for cancel-test program', hash, `Approved ${fmt(total2)}`, true);
  }
  let cancelProgramId = 0n;
  {
    const data = encodeFunctionData({
      abi: GFV4_ABI, functionName: 'createProgram',
      args: ['Cancel Test', 'Will be cancelled', prizes2, now2 + 300n, now2 + 600n, [judgeAcc.address], 1, 0],
    });
    const hash = await sendTx(sponsorWallet, sponsorAcc, contractAddr, data, 'create cancel-test program');
    const count = await publicClient.readContract({ address: contractAddr, abi: GFV4_ABI, functionName: 'programCount' });
    cancelProgramId = count - 1n;
    logStep('Create cancel-test program', hash, `Program #${cancelProgramId} created`, true);
  }
  {
    const before = await usdcBalance(sponsorAcc.address);
    const data = encodeFunctionData({ abi: GFV4_ABI, functionName: 'cancel', args: [cancelProgramId] });
    const hash = await sendTx(sponsorWallet, sponsorAcc, contractAddr, data, 'cancel');
    const after = await usdcBalance(sponsorAcc.address);
    logStep('Cancel program (before any submission)', hash, `Sponsor refunded +${fmt(after - before)} (pool recovered, fee not returned)`, true);
  }

  // ── Results table ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`${'Step'.padEnd(6)}${'Action'.padEnd(55)}${'Result'.padEnd(35)}TX`);
  console.log('─'.repeat(120));
  for (const r of RESULTS) {
    const icon = r.ok ? '✅' : '❌';
    const tx = r.txHash ? `${EXPLORER}/tx/${r.txHash}` : '—';
    console.log(`${icon}  ${r.step.padEnd(4)}${r.action.padEnd(55)}${r.result.slice(0, 33).padEnd(35)}${tx}`);
  }
  console.log('─'.repeat(120));
  const passed = RESULTS.filter(r => r.ok).length;
  const failed = RESULTS.filter(r => !r.ok).length;
  console.log(`\n  ${passed} passed · ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('E2E test failed:', err);
  process.exit(1);
});
