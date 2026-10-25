/**
 * ShareBox — shareable link + social share buttons for a program.
 * Used on the program success screen and program detail page.
 */
import { useState } from 'react';
import { Share2, Copy, Check, Twitter, Send } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface ShareBoxProps {
  url:         string;
  programName: string;
  /** Compact card style vs full expanded card */
  compact?:    boolean;
}

export function ShareBox({ url, programName, compact = false }: ShareBoxProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select input
    }
  };

  const xText   = encodeURIComponent(`${t('share.xText')}\n${url}`);
  const xUrl    = `https://twitter.com/intent/tweet?text=${xText}`;
  const tgUrl   = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t('share.xText'))}`;
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const nativeShare = async () => {
    try {
      await navigator.share({ title: programName, text: t('share.xText'), url });
    } catch { /* user cancelled */ }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t('share.copied') : t('share.copy')}
        </button>
        <a href={xUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
          <Twitter size={12} /> {t('share.postX')}
        </a>
        <a href={tgUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
          <Send size={12} /> {t('share.telegram')}
        </a>
        {hasNativeShare && (
          <button onClick={() => void nativeShare()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
            <Share2 size={12} /> {t('share.native')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-alt)' }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
        <Share2 size={15} style={{ color: 'var(--accent)' }} />
        {t('share.title')}
      </div>

      {/* URL row */}
      <div className="flex items-center gap-2">
        <input
          readOnly value={url}
          onClick={e => (e.target as HTMLInputElement).select()}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        />
        <button onClick={() => void copy()}
          className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          style={{ background: copied ? 'var(--accent)' : 'var(--bg)',
                   color: copied ? '#fff' : 'var(--text)',
                   border: '1px solid var(--border)' }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      {/* Social buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <a href={xUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          <Twitter size={12} /> {t('share.postX')}
        </a>
        <a href={tgUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          <Send size={12} /> {t('share.telegram')}
        </a>
        {hasNativeShare && (
          <button onClick={() => void nativeShare()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Share2 size={12} /> {t('share.native')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Success screen shown right after program creation ─────────────────────────

interface CreateSuccessScreenProps {
  programId:   number;
  programName: string;
  shareUrl:    string;
  onGoTo:      () => void;
}

export function CreateSuccessScreen({
  programId, programName, shareUrl, onGoTo
}: CreateSuccessScreenProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-4 text-center max-w-md mx-auto">
      {/* Checkmark badge */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        ✓
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          {t('share.successHeading')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          #{programId} — {programName}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('share.successSub')}
        </p>
      </div>

      <ShareBox url={shareUrl} programName={programName} />

      <button
        onClick={onGoTo}
        className="w-full py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        {t('share.goToProgram')} →
      </button>
    </div>
  );
}
