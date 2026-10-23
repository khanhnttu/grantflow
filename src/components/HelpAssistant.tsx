/**
 * GrantFlow Help Assistant
 * Floating chat bubble — no API keys, no backend, fully local knowledge base.
 * Supports English and Vietnamese.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, ExternalLink, ChevronRight } from 'lucide-react';
import { KB, findEntry } from '@/lib/helpKb';
import type { KbEntry, Lang } from '@/lib/helpKb';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg {
  id: number;
  role: 'bot' | 'user';
  text: string;
  entry?: KbEntry;
  lang?: Lang;
}

// ── Quick-reply chips (always English, answer detects lang) ───────────────────

const CHIPS = [
  { label: 'How do I create a program?', query: 'create program' },
  { label: 'What are the fees?',         query: 'fees cost' },
  { label: 'Which wallet and network?',  query: 'wallet network' },
  { label: 'What if there are no winners?', query: 'no winners reclaim' },
  { label: 'How do winners get paid?',   query: 'winners paid claim' },
  { label: 'Is it safe?',                query: 'safe security audit' },
];

const GREET_EN =
  "Hi! I'm the GrantFlow help assistant. I answer questions from the GrantFlow docs. I never ask for private keys, seed phrases, or wallet signatures.\n\nPick a topic or type your question:";
const GREET_VI =
  'Xin chào! Tôi là trợ lý hỗ trợ GrantFlow. Tôi trả lời câu hỏi từ tài liệu GrantFlow. Tôi không bao giờ yêu cầu khóa riêng tư, cụm từ seed hay chữ ký ví.\n\nChọn chủ đề hoặc nhập câu hỏi của bạn:';

const NO_MATCH_EN =
  "I couldn't find a specific answer for that. Try rephrasing, or check the Docs and GitHub repo for more detail.";
const NO_MATCH_VI =
  'Tôi không tìm thấy câu trả lời cụ thể cho điều đó. Thử diễn đạt lại, hoặc xem Docs và GitHub để biết thêm chi tiết.';

let msgId = 0;
const nextId = () => ++msgId;

function mkBot(text: string, entry?: KbEntry, lang?: Lang): Msg {
  return { id: nextId(), role: 'bot', text, entry, lang };
}
function mkUser(text: string): Msg {
  return { id: nextId(), role: 'user', text };
}

// ── Answer bubble ─────────────────────────────────────────────────────────────

function AnswerBubble({ msg, onNav }: { msg: Msg; onNav: (t: string) => void }) {
  const isBot = msg.role === 'bot';
  const lang = msg.lang ?? 'en';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[88%] text-sm leading-relaxed whitespace-pre-wrap ${
          isBot
            ? 'rounded-tl-sm'
            : 'rounded-tr-sm text-white'
        }`}
        style={
          isBot
            ? { background: 'var(--ha-bot)', color: 'var(--ha-ink)', border: '1px solid var(--ha-border)' }
            : { background: 'var(--accent)', color: '#fff' }
        }
      >
        {msg.text}
        {/* Deep-link button */}
        {isBot && msg.entry?.navTarget && (
          <button
            onClick={() => onNav(msg.entry!.navTarget!)}
            className="flex items-center gap-1 mt-2 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
            style={{ background: 'var(--ha-chip)', color: 'var(--accent)' }}
          >
            <ChevronRight size={12} />
            {lang === 'vi' ? msg.entry.navLabelVi : msg.entry.navLabelEn}
          </button>
        )}
        {/* No-match links */}
        {isBot && !msg.entry && msg.text !== GREET_EN && msg.text !== GREET_VI && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <a
              href="#docs"
              onClick={() => onNav('docs')}
              className="flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: 'var(--ha-chip)', color: 'var(--accent)' }}
            >
              <ChevronRight size={12} />
              {lang === 'vi' ? 'Mở Docs' : 'Open Docs'}
            </a>
            <a
              href="https://github.com/khanhnttu/grantflow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: 'var(--ha-chip)', color: 'var(--accent)' }}
            >
              <ExternalLink size={12} />
              GitHub
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HelpAssistant({ onNav }: { onNav: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([mkBot(GREET_EN)]);
  const [input, setInput] = useState('');
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const handleQuery = useCallback((query: string) => {
    const userMsg = mkUser(query);
    const result = findEntry(query);
    const lang = result?.lang ?? 'en';
    let botMsg: Msg;
    if (result) {
      const { entry } = result;
      const answer = lang === 'vi' ? entry.answerVi : entry.answerEn;
      botMsg = mkBot(answer, entry, lang);
      // Update greeting to match detected language
      if (lang === 'vi' && msgs[0]?.text === GREET_EN) {
        setMsgs(prev => [{ ...prev[0], text: GREET_VI }, ...prev.slice(1)]);
      }
    } else {
      const lang2 = query.toLowerCase().includes('phi') ||
        query.toLowerCase().includes('tao') ||
        query.toLowerCase().includes('vi ') ? 'vi' : 'en';
      botMsg = mkBot(lang2 === 'vi' ? NO_MATCH_VI : NO_MATCH_EN, undefined, lang2);
    }
    setMsgs(prev => [...prev, userMsg, botMsg]);
    setShowChips(false);
    setInput('');
  }, [msgs]);

  const handleSend = useCallback(() => {
    const q = input.trim();
    if (!q) return;
    handleQuery(q);
  }, [input, handleQuery]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleNav = useCallback((target: string) => {
    onNav(target);
    setOpen(false);
  }, [onNav]);

  const handleReset = useCallback(() => {
    setMsgs([mkBot(GREET_EN)]);
    setShowChips(true);
    setInput('');
  }, []);

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            bottom: '5.5rem',
            left: '1.25rem',
            width: 'min(380px, calc(100vw - 2.5rem))',
            height: 'min(520px, calc(100dvh - 8rem))',
            background: 'var(--ha-bg)',
            border: '1px solid var(--ha-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'var(--ha-header)', borderBottom: '1px solid var(--ha-border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                G
              </div>
              <div>
                <p className="text-sm font-semibold leading-none" style={{ color: 'var(--ha-ink)' }}>
                  GrantFlow Assistant
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ha-muted)' }}>
                  Help assistant — answers from GrantFlow docs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{ color: 'var(--ha-muted)' }}
                title="Reset conversation"
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--ha-muted)' }}
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
            {msgs.map(m => (
              <AnswerBubble key={m.id} msg={m} onNav={handleNav} />
            ))}

            {/* Quick-reply chips */}
            {showChips && (
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleQuery(chip.query)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'var(--ha-chip)',
                      color: 'var(--accent)',
                      border: '1px solid var(--ha-border)',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
                {/* All topics shortcut */}
                <button
                  onClick={() => {
                    const lang = 'en';
                    const list = KB.map(e => `• ${e.titleEn}`).join('\n');
                    setMsgs(prev => [...prev, mkBot(`Topics I can help with:\n\n${list}`, undefined, lang)]);
                    setShowChips(false);
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: 'transparent',
                    color: 'var(--ha-muted)',
                    border: '1px dashed var(--ha-border)',
                  }}
                >
                  Show all topics
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 flex items-center gap-2 flex-shrink-0"
            style={{ borderTop: '1px solid var(--ha-border)', background: 'var(--ha-header)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask in English or Vietnamese…"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none transition-all"
              style={{
                background: 'var(--ha-input)',
                color: 'var(--ha-ink)',
                border: '1px solid var(--ha-border)',
              }}
              maxLength={300}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bubble trigger ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-50 flex items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: '1.5rem',
          left: '1.25rem',
          width: '3.25rem',
          height: '3.25rem',
          background: 'var(--accent)',
          color: '#fff',
        }}
        aria-label={open ? 'Close help assistant' : 'Open help assistant'}
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
