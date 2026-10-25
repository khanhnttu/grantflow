/**
 * CreateProgramV4 — multi-step wizard.
 * When config.v5Address is set, creates on GrantFlowV5 (push-payout, sponsor meta).
 * Falls back to GrantFlowV4 when v5Address is empty.
 * Steps: 1. Basics (+ sponsor meta) → 2. Prizes → 3. Judges → 4. Review & Pay
 */
import { useState, useEffect } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { PlusCircle, Trash2, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useUsdcBalance, useUsdcAllowance, useV4Write, useFeeBps } from '@/hooks/useGrantFlowV4';
import { useDisableTx } from '@/components/NetworkUI';
import { useNetworkStore } from '@/hooks/useNetworkStore';
import {
  useTxRecovery,
  makeAllowancePoller,
  makeProgramCreatedPoller,
} from '@/hooks/useTxRecovery';
import {
  usdcToDisplay, displayToUsdc, totalPool, feeAmount,
  CATEGORY_LABELS, PROGRAM_TYPE_LABELS, ProgramType, Category,
} from '@/lib/grantflowV4';
import {
  useV5Write, useV5FeeBps, useV5UsdcAllowance,
  encodeSponsorMeta, isValidUrl, buildProgramUrl,
  GRANTFLOW_V5_ABI,
} from '@/hooks/useGrantFlowV5';
import { CreateSuccessScreen } from '@/components/ShareBox';

interface Props { onDone: (pid?: number) => void; }

type Step = 1 | 2 | 3 | 4;

/** Post-create state: show success screen with share link */
interface SuccessState {
  programId: number;
  programName: string;
  shareUrl: string;
}

export function CreateProgramV4({ onDone }: Props) {
  const { t } = useI18n();
  const [step, setStep]  = useState<Step>(1);
  const [busy, setBusy]  = useState(false);
  const [txErr, setTxErr] = useState('');
  const [txOk, setTxOk]  = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Step 1 fields — core
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [pType, setPType]       = useState<number>(ProgramType.OPEN_BOUNTY);
  const [category, setCategory] = useState<number>(Category.Hackathon);
  const [subDeadline, setSubDeadline]     = useState('');
  const [judgeDeadline, setJudgeDeadline] = useState('');

  // Step 1 fields — sponsor metadata (V5 only, optional)
  const [sponsorName, setSponsorName] = useState('');
  const [website, setWebsite]         = useState('');
  const [logo, setLogo]               = useState('');
  const [websiteErr, setWebsiteErr]   = useState('');
  const [logoErr, setLogoErr]         = useState('');

  // Step 2 fields
  const [prizesUsd, setPrizesUsd] = useState<string[]>(['100', '50', '25']);

  // Step 3 fields
  const [judgeInput, setJudgeInput] = useState('');
  const [judgeAddrErr, setJudgeAddrErr] = useState('');
  const [judges, setJudges]         = useState<string[]>([]);

  const { address: account }      = useAccount();
  const { appClient, config }     = useNetworkStore();
  const disableTx                 = useDisableTx();
  const useV5                     = !!config.v5Address;

  // V4 hooks (fallback)
  const { data: bal }                              = useUsdcBalance();
  const { data: allowed, refetch: refetchAllowance } = useUsdcAllowance();
  const { data: feeBpsRaw }                        = useFeeBps();
  const { approveUsdc: approveV4, createProgram: createV4 } = useV4Write();
  const { sendWithRecovery }                       = useTxRecovery();

  // V5 hooks (preferred when v5Address exists)
  const { feeBps: feeBpsV5 }                          = useV5FeeBps();
  const { allowance: allowedV5, refetch: refetchV5 }  = useV5UsdcAllowance(account);
  const {
    busy: v5Busy, txErr: v5TxErr,
    approveUsdc: approveV5, createProgram: createV5,
  } = useV5Write();

  const feeBps   = useV5 ? feeBpsV5 : (feeBpsRaw ?? 0n);
  const prizesRaw = prizesUsd.map(p => { try { return displayToUsdc(p || '0'); } catch { return 0n; } });
  const pool  = totalPool(prizesRaw);
  const fee   = feeAmount(pool, feeBps);
  const total = pool + fee;

  const effectiveAllowed = useV5 ? allowedV5 : (allowed ?? 0n);
  const hasAllowance = effectiveAllowed >= total && total > 0n;
  const hasBalance   = (bal ?? 0n) >= total;

  const addPrize    = () => setPrizesUsd(prev => [...prev, '']);
  const removePrize = (i: number) => setPrizesUsd(prev => prev.filter((_, j) => j !== i));
  const setPrize    = (i: number, v: string) => setPrizesUsd(prev => prev.map((x, j) => j === i ? v : x));

  const isValidAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

  const addJudge = () => {
    const addr = judgeInput.trim();
    if (!addr) return;
    if (!isValidAddress(addr)) {
      setJudgeAddrErr('Invalid address — must be 0x followed by 40 hex characters.');
      return;
    }
    if (judges.includes(addr)) {
      setJudgeAddrErr('Address already added.');
      return;
    }
    setJudgeAddrErr('');
    setJudges(prev => [...prev, addr]);
    setJudgeInput('');
  };

  // Re-read allowance on entering review step
  useEffect(() => {
    if (step === 4) {
      if (useV5) void refetchV5();
      else void refetchAllowance();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const step1Valid = !!name && !!subDeadline && !!judgeDeadline &&
    new Date(subDeadline).getTime() > 0 &&
    new Date(judgeDeadline).getTime() > new Date(subDeadline).getTime() &&
    !websiteErr && !logoErr;
  const step2Valid = prizesRaw.every(p => p > 0n) && prizesRaw.length > 0;
  const step3Valid = judges.length > 0;

  const validateSponsorUrls = () => {
    let ok = true;
    if (website && !isValidUrl(website)) { setWebsiteErr('Must be https://…'); ok = false; }
    else setWebsiteErr('');
    if (logo && !isValidUrl(logo)) { setLogoErr('Must be https://…'); ok = false; }
    else setLogoErr('');
    return ok;
  };

  // ── Approve ──────────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!account) return;
    setBusy(true); setTxErr(''); setTxOk('');

    if (useV5) {
      const hash = await approveV5(total);
      if (hash) {
        await refetchV5();
        setTxOk(t('create.review.approved'));
      } else {
        setTxErr(v5TxErr || 'Approve failed.');
      }
      setBusy(false);
      return;
    }

    // V4 path
    const poller = makeAllowancePoller(
      appClient, config.usdcAddress, account, config.v4Address, total,
    );
    const ok = await sendWithRecovery(
      () => approveV4(total),
      poller,
      {
        setStatus: msg => { if (msg) setTxOk(msg); },
        setError:  msg => setTxErr(msg),
        onSuccess: () => {
          void refetchAllowance();
          setTxOk(t('create.review.approved'));
        },
      },
    );
    if (ok) void refetchAllowance();
    setBusy(false);
  };

  // ── Create V5 ────────────────────────────────────────────────────────────────

  const handleCreateV5 = async () => {
    if (!account || !config.v5Address) return;
    setBusy(true); setTxErr(''); setTxOk('');

    const subTs   = BigInt(Math.floor(new Date(subDeadline).getTime() / 1000));
    const judgeTs = BigInt(Math.floor(new Date(judgeDeadline).getTime() / 1000));
    const validJudges = judges.filter(isValidAddress) as `0x${string}`[];

    const description = encodeSponsorMeta({
      desc:        desc,
      sponsorName: sponsorName.trim(),
      website:     website.trim(),
      logo:        logo.trim(),
    });

    setTxOk(t('create.review.creating'));

    const hash = await createV5({
      name, description, prizes: prizesRaw,
      submissionDeadline: subTs, judgingDeadline: judgeTs,
      judges: validJudges, programType: pType, category,
    });

    if (!hash) {
      setTxErr(v5TxErr || 'Create failed.');
      setBusy(false);
      return;
    }

    // Read programId from ProgramCreated event in the receipt
    let newPid: number | null = null;
    try {
      const receipt = await appClient.getTransactionReceipt({ hash });
      // keccak256('ProgramCreated(uint256,address,string,uint256,uint256,uint256)')
      const PROGRAM_CREATED_TOPIC =
        '0x1b704f21c8477c61a4c32b2172edd9ace05df067737ac30e0f4c221b50dda976' as const;
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === config.v5Address.toLowerCase() &&
          log.topics[0] === PROGRAM_CREATED_TOPIC &&
          log.topics[1]
        ) {
          newPid = Number(BigInt(log.topics[1]));
          break;
        }
      }
      // Fallback: read programCount - 1
      if (newPid === null) {
        const cnt = await appClient.readContract({
          address: config.v5Address,
          abi: GRANTFLOW_V5_ABI,
          functionName: 'programCount',
        });
        newPid = Number(cnt) - 1;
      }
    } catch { newPid = 0; }

    const shareUrl = buildProgramUrl(config.name, newPid ?? 0, 'v5');
    setSuccess({ programId: newPid ?? 0, programName: name, shareUrl });
    setBusy(false);
  };

  // ── Create V4 (fallback) ──────────────────────────────────────────────────────

  const handleCreateV4 = async () => {
    if (!account) return;
    setBusy(true); setTxErr(''); setTxOk('');

    const subTs   = BigInt(Math.floor(new Date(subDeadline).getTime() / 1000));
    const judgeTs = BigInt(Math.floor(new Date(judgeDeadline).getTime() / 1000));
    const validJudges = judges.filter(j => j.startsWith('0x') && j.length === 42) as `0x${string}`[];
    const args = [name, desc, prizesRaw, subTs, judgeTs, validJudges, pType, category] as const;

    let prevCount = 0n;
    try {
      const { GRANTFLOW_V4_ABI } = await import('@/lib/grantflowV4');
      prevCount = await appClient.readContract({
        address: config.v4Address, abi: GRANTFLOW_V4_ABI, functionName: 'programCount',
      });
    } catch { /* proceed */ }

    const poller = makeProgramCreatedPoller(appClient, config.v4Address, prevCount);
    const ok = await sendWithRecovery(
      () => createV4(args),
      poller,
      {
        setStatus: msg => { if (msg) setTxOk(msg); },
        setError:  msg => setTxErr(msg),
        onSuccess: (_hash, newPid) => {
          setTxOk(t('create.review.created'));
          setTimeout(() => onDone(typeof newPid === 'number' ? newPid : undefined), 1500);
        },
      },
    );
    if (!ok) setBusy(false);
  };

  const handleCreate = () => {
    if (useV5) void handleCreateV5();
    else void handleCreateV4();
  };

  // ── Success screen ────────────────────────────────────────────────────────────

  if (success) {
    return (
      <CreateSuccessScreen
        programId={success.programId}
        programName={success.programName}
        shareUrl={success.shareUrl}
        onGoTo={() => {
          // Navigate to V5 program detail via path URL
          window.history.pushState({}, '', success.shareUrl.replace(window.location.origin, ''));
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />
    );
  }

  const steps = [t('create.step.basics'), t('create.review.prizes'), t('create.judges.title'), t('create.step.review')];
  const isBusy = busy || (useV5 && v5Busy);
  const effectiveErr = txErr || (useV5 ? v5TxErr : '');

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      {/* Contract version badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: useV5 ? 'var(--accent)' : 'var(--surface)',
                   color: useV5 ? '#fff' : 'var(--text-muted)',
                   border: useV5 ? 'none' : '1px solid var(--border)' }}>
          {useV5 ? t('create.v5badge') : 'V4'}
        </span>
        {useV5 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('create.v5desc')}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const n = i + 1;
          const done   = step > n;
          const active = step === n;
          return (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={done   ? { background: '#10b981', color: '#fff' }
                    : active    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {done ? <CheckCircle2 size={12} /> : n}
                </div>
                <span className="text-xs hidden sm:block"
                  style={{ color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 600 : undefined }}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-6 h-px mx-2" style={{ background: 'var(--border)' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* ── Step 1: Basics ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{t('create.basics.title')}</h2>
            <Field label={t('create.basics.name')} value={name} onChange={setName} placeholder={t('create.basics.namePh')} />
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Description</label>
              <textarea rows={3} className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={desc} onChange={e => setDesc(e.target.value)}
                placeholder={t('create.basics.descPh')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label={t('create.basics.type')} value={String(pType)} onChange={v => setPType(Number(v))}>
                {Object.entries(PROGRAM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Select label={t('create.basics.cat')} value={String(category)} onChange={v => setCategory(Number(v))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('create.basics.subDl')} type="datetime-local" value={subDeadline} onChange={setSubDeadline} />
              <Field label={t('create.basics.judDl')} type="datetime-local" value={judgeDeadline} onChange={setJudgeDeadline} />
            </div>
            {judgeDeadline && subDeadline && new Date(judgeDeadline).getTime() < new Date(subDeadline).getTime() && (
              <p className="text-xs text-red-400">{t('create.basics.dlErr')}</p>
            )}

            {/* Sponsor metadata — V5 only, optional */}
            {useV5 && (
              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t('sponsor.metaHeading')} <span className="font-normal">({t('common.optional')})</span>
                </p>
                <Field
                  label={t('sponsor.nameLabel')}
                  value={sponsorName}
                  onChange={setSponsorName}
                  placeholder={t('sponsor.namePh')}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('sponsor.websiteLabel')}</label>
                  <input
                    className="px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--bg)', border: `1px solid ${websiteErr ? '#f87171' : 'var(--border)'}`, color: 'var(--text)' }}
                    value={website}
                    onChange={e => { setWebsite(e.target.value); setWebsiteErr(''); }}
                    onBlur={() => { if (website && !isValidUrl(website)) setWebsiteErr('Must be https://…'); }}
                    placeholder="https://example.com"
                  />
                  {websiteErr && <p className="text-xs text-red-400">{websiteErr}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('sponsor.logoLabel')}</label>
                  <input
                    className="px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--bg)', border: `1px solid ${logoErr ? '#f87171' : 'var(--border)'}`, color: 'var(--text)' }}
                    value={logo}
                    onChange={e => { setLogo(e.target.value); setLogoErr(''); }}
                    onBlur={() => { if (logo && !isValidUrl(logo)) setLogoErr('Must be https://…'); }}
                    placeholder="https://example.com/logo.png"
                  />
                  {logoErr && <p className="text-xs text-red-400">{logoErr}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Prizes ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{t('create.prizes.title')}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('create.prizes.sub')}</p>
            {prizesUsd.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-lg w-8 text-center">{['🥇','🥈','🥉'][i] ?? `#${i+1}`}</span>
                <div className="flex-1">
                  <Field label="" value={p} onChange={v => setPrize(i, v)} placeholder="100" type="number" min="0" />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>USDC</span>
                {i > 0 && (
                  <button onClick={() => removePrize(i)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {prizesUsd.length < 20 && (
              <button onClick={addPrize} className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent)' }}>
                <PlusCircle size={14} /> Add prize tier
              </button>
            )}
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <Row label="Prize pool"                      value={`${usdcToDisplay(pool)} USDC`} />
              <Row label={`Platform fee (${Number(feeBps)/100}%)`} value={`${usdcToDisplay(fee)} USDC`} />
              <Row label="Total to approve"                value={`${usdcToDisplay(total)} USDC`} strong />
            </div>
          </div>
        )}

        {/* ── Step 3: Judges ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Judges</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('create.judges.sub')}</p>
            <div className="flex gap-2">
              <Field label="" value={judgeInput}
                onChange={v => { setJudgeInput(v); setJudgeAddrErr(''); }}
                placeholder={t('create.judges.addPh')} />
              <button onClick={addJudge}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Add
              </button>
            </div>
            {judgeAddrErr && (
              <p className="text-xs text-red-400">{judgeAddrErr}</p>
            )}
            {judges.map(j => (
              <div key={j} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <code style={{ color: 'var(--text)' }}>{j}</code>
                <button onClick={() => setJudges(prev => prev.filter(x => x !== j))} style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {judges.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('create.judges.empty')}</p>
            )}
          </div>
        )}

        {/* ── Step 4: Review & Pay ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{t('create.review.title')}</h2>

            <div className="rounded-lg p-3 text-xs flex flex-col gap-1.5"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <Row label="Name"                  value={name} />
              {useV5 && sponsorName && <Row label={t('sponsor.nameLabel')}   value={sponsorName} />}
              {useV5 && website     && <Row label={t('sponsor.websiteLabel')} value={website} />}
              <Row label="Type"                  value={PROGRAM_TYPE_LABELS[pType as 0|1]} />
              <Row label={t('create.basics.cat')} value={CATEGORY_LABELS[category as 0|1|2|3]} />
              <Row label="Prizes"                value={prizesUsd.filter(p => Number(p) > 0).map((p, i) => `#${i+1}: ${p}`).join(', ')} />
              <Row label="Judges"                value={`${judges.length} address${judges.length !== 1 ? 'es' : ''}`} />
              <Row label="Sub deadline"          value={subDeadline} />
              <Row label="Judge deadline"        value={judgeDeadline} />
              <div className="pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                <Row label="Prize pool" value={`${usdcToDisplay(pool)} USDC`} />
                <Row label="Fee"        value={`${usdcToDisplay(fee)} USDC`} />
                <Row label="Total"      value={`${usdcToDisplay(total)} USDC`} strong />
              </div>
              {useV5 && (
                <p className="text-xs pt-1" style={{ color: 'var(--accent)' }}>
                  {t('create.v5payoutNote')}
                </p>
              )}
            </div>

            {!hasBalance && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg">
                <AlertTriangle size={13} />
                {t('create.review.lowBal')} {usdcToDisplay(total)} {t('create.review.have')} {usdcToDisplay(bal ?? 0n)}).
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!hasAllowance && (
                <button onClick={() => void handleApprove()} disabled={isBusy || !hasBalance || disableTx}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                  title={disableTx ? 'Switch to the correct network first' : undefined}>
                  {isBusy ? t('create.review.approving') : `Approve ${usdcToDisplay(total)} USDC`}
                </button>
              )}
              <button onClick={() => void handleCreate()} disabled={isBusy || !hasAllowance || !hasBalance || disableTx}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
                title={disableTx ? 'Switch to the correct network first' : undefined}>
                {isBusy ? t('create.review.creating') : t('create.review.createBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {step > 1 ? (
            <button onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-1 text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={14} /> Back
            </button>
          ) : <div />}
          {step < 4 && (
            <button
              disabled={
                (step === 1 && (!step1Valid || !validateSponsorUrls())) ||
                (step === 2 && !step2Valid) ||
                (step === 3 && !step3Valid)
              }
              onClick={() => { if (step === 1 && !validateSponsorUrls()) return; setStep((step + 1) as Step); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {(effectiveErr || txOk) && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${txOk ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {txOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {txOk || effectiveErr}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', min }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; min?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <input type={type} min={min}
        className="px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select className="px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: strong ? 600 : undefined }}>{value}</span>
    </div>
  );
}
