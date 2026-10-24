/**
 * Developers page — contract addresses, events, functions, viem snippets.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
      style={{ background: copied ? 'rgba(34,197,94,0.1)' : 'var(--surface)', color: copied ? '#22c55e' : 'var(--text-muted)', border: '1px solid var(--border)' }}
      aria-label="Copy">
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="absolute top-2 right-2"><CopyBtn text={code} /></div>
      <pre className="text-xs p-4 pr-20 overflow-x-auto leading-relaxed"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface ContractRow { label: string; address: string; explorer: string; }
const CONTRACTS: ContractRow[] = [
  {
    label: 'GrantFlowV3 — Arc Mainnet',
    address: '0x7c2866a62e6ad73e15e243d4341219eb3995fe7d',
    explorer: 'https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d',
  },
  {
    label: 'GrantFlowV3 — Arc Testnet',
    address: '0x3805f86f71b47480a2b31d563ce1620b490a841f',
    explorer: 'https://explorer.testnet.arc.io/address/0x3805f86f71b47480a2b31d563ce1620b490a841f',
  },
  {
    label: 'GrantFlowV4 — Arc Testnet',
    address: '0x8a8d4e2378842d02690e247c9241842a30bbf7c4',
    explorer: 'https://explorer.testnet.arc.io/address/0x8a8d4e2378842d02690e247c9241842a30bbf7c4',
  },
];

const EVENTS = [
  { name: 'ProgramCreated(uint256 indexed programId, address indexed sponsor, string name, uint256 totalPool, uint256 submissionDeadline, uint256 judgingDeadline)', desc: 'Emitted when a program is created.' },
  { name: 'Submitted(uint256 indexed programId, uint256 indexed submissionId, address indexed submitter, address projectContract, string metadataURI)', desc: 'Emitted when a builder submits.' },
  { name: 'Voted(uint256 indexed programId, uint256 indexed submissionId, address indexed judge, uint256 totalVotes)', desc: 'Emitted when a judge votes.' },
  { name: 'Finalized(uint256 indexed programId, uint256 winnerCount)', desc: 'Emitted when a program is finalized.' },
  { name: 'PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)', desc: 'Emitted once per winner on finalize.' },
  { name: 'Claimed(address indexed recipient, uint256 amount)', desc: 'Emitted when a winner claims their prize.' },
  { name: 'Reclaimed(uint256 indexed programId, address indexed sponsor, uint256 amount)', desc: 'Emitted when sponsor reclaims unawarded pool.' },
  { name: 'Cancelled(uint256 indexed programId, address indexed sponsor, uint256 refund)', desc: 'Emitted when a program is cancelled.' },
  { name: 'FeeCollected(uint256 indexed programId, uint256 amount)', desc: 'Emitted when the platform fee is transferred on creation.' },
];

const FUNCTIONS = [
  { name: 'createProgram(name, description, prizes[], subDeadline, judgeDeadline, judges[], type, category)', type: 'write', desc: 'Create a program. USDC approve first.' },
  { name: 'submit(programId, projectContract, metadataURI)', type: 'write', desc: 'Submit during submission phase.' },
  { name: 'vote(programId, submissionId)', type: 'write', desc: 'Cast a judge vote during judging phase.' },
  { name: 'finalize(programId)', type: 'write', desc: 'Finalize after judging deadline (anyone).' },
  { name: 'claim()', type: 'write', desc: 'Pull-claim your pending prizes.' },
  { name: 'reclaim(programId)', type: 'write', desc: 'Sponsor reclaims unawarded pool post-finalize.' },
  { name: 'cancel(programId)', type: 'write', desc: 'Cancel before first submission (sponsor only).' },
  { name: 'getProgram(programId)', type: 'read', desc: 'Returns full program metadata and state.' },
  { name: 'getSubmission(programId, submissionId)', type: 'read', desc: 'Returns submission data including votes and claimed status.' },
  { name: 'getJudges(programId)', type: 'read', desc: 'Returns the judge address array.' },
  { name: 'submissionCount(programId)', type: 'read', desc: 'Number of submissions for a program.' },
  { name: 'getPhase(programId)', type: 'read', desc: '0=Submission 1=Judging 2=Finalized 3=Cancelled.' },
  { name: 'pendingClaims(address)', type: 'read', desc: 'Pending USDC claimable by an address.' },
  { name: 'programCount()', type: 'read', desc: 'Total programs created.' },
  { name: 'votesRemaining(programId, judge)', type: 'read', desc: 'Votes left for a judge in a program.' },
];

const READ_SNIPPET = `import { createPublicClient, http } from 'viem'
import { defineChain } from 'viem'

const arc = defineChain({
  id: 5042002, // testnet; use 5042 for mainnet
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.io'] } },
})

const V4_ADDRESS = '0x8a8d4e2378842d02690e247c9241842a30bbf7c4'

const client = createPublicClient({ chain: arc, transport: http() })

// Read program count
const count = await client.readContract({
  address: V4_ADDRESS,
  abi: [{ type: 'function', name: 'programCount',
          inputs: [], outputs: [{ type: 'uint256' }],
          stateMutability: 'view' }],
  functionName: 'programCount',
})

// Read a specific program
const program = await client.readContract({
  address: V4_ADDRESS,
  abi: [{ type: 'function', name: 'getProgram',
          inputs: [{ name: 'programId', type: 'uint256' }],
          outputs: [
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'sponsor', type: 'address' },
            { name: 'prizes', type: 'uint256[]' },
            { name: 'totalDeposited', type: 'uint256' },
            { name: 'submissionDeadline', type: 'uint256' },
            { name: 'judgingDeadline', type: 'uint256' },
            { name: 'programType', type: 'uint8' },
            { name: 'category', type: 'uint8' },
            { name: 'exists', type: 'bool' },
            { name: 'finalized', type: 'bool' },
            { name: 'cancelled', type: 'bool' },
          ],
          stateMutability: 'view' }],
  functionName: 'getProgram',
  args: [0n], // program ID
})
console.log(program)`;

const LISTEN_SNIPPET = `import { parseAbiItem } from 'viem'

// Listen for PrizeAssigned events (winners on finalize)
const unwatch = client.watchContractEvent({
  address: V4_ADDRESS,
  abi: [parseAbiItem(
    'event PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)'
  )],
  eventName: 'PrizeAssigned',
  onLogs: logs => logs.forEach(l => {
    console.log('Winner:', l.args.winner, 'Prize:', l.args.amount, 'Rank:', l.args.rank)
  }),
})

// Fetch historical Claimed events
const logs = await client.getLogs({
  address: V4_ADDRESS,
  event: parseAbiItem('event Claimed(address indexed recipient, uint256 amount)'),
  fromBlock: 'earliest',
  toBlock: 'latest',
})`;

export function DevelopersPage() {
  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="pt-4 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          For builders
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Developers</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
          Contract addresses, events, functions, and copy-paste viem snippets.
        </p>
      </div>

      {/* Contracts */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Contract addresses</h2>
        <div className="space-y-3">
          {CONTRACTS.map(c => (
            <div key={c.address} className="rounded-xl px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                <a href={c.explorer} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                  Explorer <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{c.address}</code>
                <CopyBtn text={c.address} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>USDC — Arc Mainnet and Testnet</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>0x3600000000000000000000000000000000000000</code>
            <CopyBtn text="0x3600000000000000000000000000000000000000" />
          </div>
        </div>
      </section>

      {/* Source */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Source and tests</h2>
        <div className="flex gap-3">
          <a href="https://github.com/khanhnttu/grantflow/blob/main/contracts/GrantFlowV4.sol"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <ExternalLink size={14} /> GrantFlowV4.sol
          </a>
          <a href="https://github.com/khanhnttu/grantflow/blob/main/contracts/test"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <ExternalLink size={14} /> Test suite (Foundry)
          </a>
        </div>
      </section>

      {/* Events */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Events</h2>
        <div className="space-y-2">
          {EVENTS.map(ev => (
            <div key={ev.name} className="rounded-xl px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-2">
                <code className="font-mono text-xs flex-1 leading-relaxed break-all" style={{ color: 'var(--accent)' }}>{ev.name}</code>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{ev.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Functions */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Key functions</h2>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs" style={{ color: 'var(--text)' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Function</th>
                <th className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                <th className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {FUNCTIONS.map((fn, i) => (
                <tr key={fn.name} style={{ borderBottom: i < FUNCTIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--accent)' }}>{fn.name.split('(')[0]}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: fn.type === 'write' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: fn.type === 'write' ? '#ef4444' : '#22c55e',
                      }}>
                      {fn.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{fn.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Snippets */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Read a program (viem)</h2>
        <CodeBlock code={READ_SNIPPET} />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Listen for PrizeAssigned / Claimed</h2>
        <CodeBlock code={LISTEN_SNIPPET} />
      </section>
    </div>
  );
}
