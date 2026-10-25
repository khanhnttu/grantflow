/**
 * EditProgramModal — sponsor can edit name, description, and deadlines
 * for a V5 program (only before first submission, before sub deadline).
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { V5Program, SponsorMeta } from '@/hooks/useGrantFlowV5';
import { encodeSponsorMeta, isValidUrl } from '@/hooks/useGrantFlowV5';

interface EditProgramModalProps {
  prog:        V5Program;
  onClose:     () => void;
  onSave:      (args: {
    name: string;
    description: string;
    submissionDeadline: bigint;
    judgingDeadline: bigint;
  }) => Promise<void>;
  busy:        boolean;
}

export function EditProgramModal({ prog, onClose, onSave, busy }: EditProgramModalProps) {
  const { t } = useI18n();
  const meta = prog.meta;

  const [name,   setName]   = useState(prog.name);
  const [desc,   setDesc]   = useState(meta.desc);
  const [spName, setSpName] = useState(meta.sponsorName);
  const [website, setWebsite] = useState(meta.website);
  const [logo,   setLogo]   = useState(meta.logo);

  const dtLocal = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toISOString().slice(0, 16);
  };
  const [subDl, setSubDl] = useState(dtLocal(prog.submissionDeadline));
  const [judDl, setJudDl] = useState(dtLocal(prog.judgingDeadline));

  const [err, setErr] = useState('');

  const validate = () => {
    if (!name.trim())              return 'Program name is required.';
    if (!isValidUrl(website))      return 'Website must be https://…';
    if (!isValidUrl(logo))         return 'Logo URL must be https://…';
    const sub = new Date(subDl).getTime() / 1000;
    const jud = new Date(judDl).getTime() / 1000;
    const now = Date.now() / 1000;
    if (sub <= now)                return 'Submission deadline must be in the future.';
    if (jud <= sub)                return 'Judging deadline must be after submission deadline.';
    return '';
  };

  const handleSave = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr('');
    const newMeta: SponsorMeta = {
      desc:        desc.trim(),
      sponsorName: spName.trim(),
      website:     website.trim(),
      logo:        logo.trim(),
    };
    await onSave({
      name:               name.trim(),
      description:        encodeSponsorMeta(newMeta),
      submissionDeadline: BigInt(Math.floor(new Date(subDl).getTime() / 1000)),
      judgingDeadline:    BigInt(Math.floor(new Date(judDl).getTime() / 1000)),
    });
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-lg rounded-3xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: 'var(--bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            {t('sponsor.editTitle')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('sponsor.editSub')}
        </p>

        {/* Name */}
        <Field label={t('sponsor.editName')}>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </Field>

        {/* Description */}
        <Field label={t('sponsor.editDesc')}>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </Field>

        {/* Sponsor profile */}
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--bg-alt)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
            {t('sponsor.section')}
          </p>
          <Field label={t('sponsor.name')}>
            <input value={spName} onChange={e => setSpName(e.target.value)}
              placeholder={t('sponsor.namePh')}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </Field>
          <Field label={t('sponsor.website')}>
            <input value={website} onChange={e => setWebsite(e.target.value)}
              placeholder={t('sponsor.websitePh')}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </Field>
          <Field label={t('sponsor.logo')}>
            <input value={logo} onChange={e => setLogo(e.target.value)}
              placeholder={t('sponsor.logoPh')}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </Field>
        </div>

        {/* Deadlines */}
        <Field label={t('sponsor.editSubDl')}>
          <input type="datetime-local" value={subDl} onChange={e => setSubDl(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </Field>
        <Field label={t('sponsor.editJudDl')}>
          <input type="datetime-local" value={judDl} onChange={e => setJudDl(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </Field>

        {err && (
          <p className="text-xs text-red-500">{err}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            Cancel
          </button>
          <button onClick={() => void handleSave()} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {busy ? t('sponsor.saving') : t('sponsor.saved')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
