/**
 * Developers page — contract addresses, events, functions, viem snippets.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
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
      aria-label={t('ask.copyAddress')}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? t('ask.copied') : t('ask.copyAddress')}
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
    label: 'GrantFlowV5 — Arc Mainnet ✦ active',
    address: '0xe67ec49a6618cc205fab934fc76f8a271cc77c37',
    explorer: 'https://explorer.arc.io/address/0xe67ec49a6618cc205fab934fc76f8a271cc77c37',
  },
  {
    label: 'GrantFlowV5 — Arc Testnet',
    address: '0x23d26fb2661497c1e658e8d717df8a7dea2f62c0',
    explorer: 'https://explorer.testnet.arc.io/address/0x23d26fb2661497c1e658e8d717df8a7dea2f62c0',
  },
  {
    label: 'GrantFlowV4 — Arc Mainnet (legacy)',
    address: '0x41ffdab65fca60bda9beb455285d29ab753c3d2e',
    explorer: 'https://explorer.arc.io/address/0x41ffdab65fca60bda9beb455285d29ab753c3d2e',
  },
  {
    label: 'GrantFlowV3 — Arc Mainnet (legacy)',
    address: '0x7c2866a62e6ad73e15e243d4341219eb3995fe7d',
    explorer: 'https://explorer.arc.io/address/0x7c2866a62e6ad73e15e243d4341219eb3995fe7d',
  },
];

const EVENTS_V5 = [
  { name: 'ProgramCreated(uint256 indexed programId, address indexed sponsor, string name, uint256 totalPool, uint256 submissionDeadline, uint256 judgingDeadline)', descKey: 'dev.ev.created' as const },
  { name: 'Submitted(uint256 indexed programId, uint256 indexed submissionId, address indexed submitter, address projectContract, string metadataURI)', descKey: 'dev.ev.submitted' as const },
  { name: 'Voted(uint256 indexed programId, uint256 indexed submissionId, address indexed judge, uint256 totalVotes)', descKey: 'dev.ev.voted' as const },
  { name: 'Finalized(uint256 indexed programId, uint256 winnerCount)', descKey: 'dev.ev.finalized' as const },
  { name: 'PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)', descKey: 'dev.ev.prizeAssigned' as const },
  { name: 'Cancelled(uint256 indexed programId, address indexed sponsor, uint256 refund)', descKey: 'dev.ev.cancelled' as const },
  { name: 'FeeCollected(uint256 indexed programId, uint256 amount)', descKey: 'dev.ev.fee' as const },
];

const FUNCTIONS = [
  { name: 'createProgram(name, description, prizes[], subDeadline, judgeDeadline, judges[], type, category)', type: 'write', descKey: 'dev.fn.create' as const },
  { name: 'submit(programId, projectContract, metadataURI)', type: 'write', descKey: 'dev.fn.submit' as const },
  { name: 'vote(programId, submissionId)', type: 'write', descKey: 'dev.fn.vote' as const },
  { name: 'finalize(programId)', type: 'write', descKey: 'dev.fn.finalize' as const },
  { name: 'cancel(programId)', type: 'write', descKey: 'dev.fn.cancel' as const },
  { name: 'getProgram(programId)', type: 'read', descKey: 'dev.fn.getProgram' as const },
  { name: 'getSubmission(programId, submissionId)', type: 'read', descKey: 'dev.fn.getSub' as const },
  { name: 'getJudges(programId)', type: 'read', descKey: 'dev.fn.getJudges' as const },
  { name: 'submissionCount(programId)', type: 'read', descKey: 'dev.fn.subCount' as const },
  { name: 'programCount()', type: 'read', descKey: 'dev.fn.progCount' as const },
  { name: 'votesRemaining(programId, judge)', type: 'read', descKey: 'dev.fn.votesLeft' as const },
];

const READ_SNIPPET = `import { createPublicClient, http } from 'viem'
import { defineChain } from 'viem'

const arc = defineChain({
  id: 5042,   // Arc Mainnet; use 5042002 for testnet
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
})

// GrantFlowV5 — Arc Mainnet (push-payout model)
const V5_ADDRESS = '0xe67ec49a6618cc205fab934fc76f8a271cc77c37'

const client = createPublicClient({ chain: arc, transport: http() })

// Read program count
const count = await client.readContract({
  address: V5_ADDRESS,
  abi: [{ type: 'function', name: 'programCount',
          inputs: [], outputs: [{ type: 'uint256' }],
          stateMutability: 'view' }],
  functionName: 'programCount',
})

// Read a specific program
const program = await client.readContract({
  address: V5_ADDRESS,
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
            { name: 'finalized', type: 'bool' },
            { name: 'cancelled', type: 'bool' },
          ],
          stateMutability: 'view' }],
  functionName: 'getProgram',
  args: [0n], // program ID
})
console.log(program)`;

const LISTEN_SNIPPET = `import { parseAbiItem } from 'viem'

// V5_ADDRESS = '0xe67ec49a6618cc205fab934fc76f8a271cc77c37' (Arc Mainnet)
// V5 uses push-payout: prizes are sent in the finalize() tx, no claim() needed.

// Listen for PrizeAssigned events (fired per winner during finalize)
const unwatch = client.watchContractEvent({
  address: V5_ADDRESS,
  abi: [parseAbiItem(
    'event PrizeAssigned(uint256 indexed programId, uint256 indexed submissionId, address indexed winner, uint256 amount, uint256 rank)'
  )],
  eventName: 'PrizeAssigned',
  onLogs: logs => logs.forEach(l => {
    console.log('Winner:', l.args.winner, 'Prize:', l.args.amount, 'Rank:', l.args.rank)
  }),
})

// Fetch historical ProgramCreated events
const logs = await client.getLogs({
  address: V5_ADDRESS,
  event: parseAbiItem('event ProgramCreated(uint256 indexed programId, address indexed sponsor, string name, uint256 totalPool, uint256 submissionDeadline, uint256 judgingDeadline)'),
  fromBlock: 'earliest',
  toBlock: 'latest',
})`;

export function DevelopersPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="pt-4 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          {t('dev.title')}
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t('dev.title')}</h1>
        <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>{t('dev.sub')}</p>
      </div>

      {/* Contracts */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.contracts')}</h2>
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
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.source')}</h2>
        <div className="flex gap-3">
          <a href="https://github.com/khanhnttu/grantflow/blob/main/contracts/GrantFlowV5.sol"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <ExternalLink size={14} /> GrantFlowV5.sol
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
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.events')}</h2>
        <div className="space-y-2">
          {EVENTS_V5.map(ev => (
            <div key={ev.name} className="rounded-xl px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-2">
                <code className="font-mono text-xs flex-1 leading-relaxed break-all" style={{ color: 'var(--accent)' }}>{ev.name}</code>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{t(ev.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Functions */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.functions')}</h2>
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
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{t(fn.descKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Snippets */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.readProgram')}</h2>
        <CodeBlock code={READ_SNIPPET} />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dev.listenEvents')}</h2>
        <CodeBlock code={LISTEN_SNIPPET} />
      </section>
    </div>
  );
}
