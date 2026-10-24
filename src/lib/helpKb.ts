/**
 * GrantFlow Help Assistant — local knowledge base + keyword matcher.
 * No external API, no keys, no backend.
 * Supports English and Vietnamese (with full diacritic normalisation).
 *
 * Matching rules:
 *  - All text is NFD-normalised and stripped of combining diacritics before
 *    comparison, so "phí" == "phi", "tạo" == "tao", etc.
 *  - Tokenisation splits on non-alpha-numeric boundaries so "phi" will NOT
 *    match inside "phe" or "phim".
 *  - Each entry has "intent keywords" (high-weight, whole-word) and
 *    "general keywords" (lower-weight, whole-word).
 *  - Scores: intent exact-token match = 8, general exact-token match = 3,
 *    title substring match = 6.  Minimum threshold = 3.
 */

export type Lang = 'en' | 'vi';

export interface KbEntry {
  id: string;
  titleEn: string;
  titleVi: string;
  answerEn: string;
  answerVi: string;
  navTarget?: string;
  navLabelEn?: string;
  navLabelVi?: string;
  /** High-weight whole-word keywords — 8 pts each */
  intentEn: string[];
  intentVi: string[];
  /** Supplementary keywords — 3 pts each */
  keywordsEn: string[];
  keywordsVi: string[];
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/** Strip diacritics: NFD-decompose then remove combining marks (U+0300-U+036F). */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Tokenise a normalised string into whole words (alpha-numeric only). */
export function tokenise(s: string): string[] {
  return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Whole-word check: does `haystack` (already normalised) contain `needle` as a
 * whole token (not as part of a longer word)?
 */
function wholeWord(haystack: string, needle: string): boolean {
  // needle is already norm()'d by the caller
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(haystack);
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export const KB: KbEntry[] = [
  {
    id: 'create',
    titleEn: 'How do I create a program?',
    titleVi: 'Làm thế nào để tạo chương trình?',
    answerEn:
      'Connect your wallet, go to "My programs" (Sponsor tab), and click "+ Create program". Fill in the name, type (Onchain Build or Open Bounty), category, description, prize per winner, slots, deadline, reviewer addresses, and approval threshold. You approve two USDC transactions: one for the prize pool, one for the 1% platform fee. Both are locked in the contract upfront.',
    answerVi:
      'Kết nối ví, vào "My programs" (tab Sponsor) và nhấn "+ Tạo chương trình". Điền tên, loại (Onchain Build hoặc Open Bounty), danh mục, mô tả, giải thưởng mỗi slot, số slot, hạn chót, địa chỉ reviewer và ngưỡng phê duyệt. Bạn phê duyệt hai giao dịch USDC: một cho prize pool, một cho phí nền tảng 1%. Cả hai đều khóa trong hợp đồng ngay lúc tạo.',
    navTarget: 'sponsor',
    navLabelEn: 'Open Create program',
    navLabelVi: 'Mở trang Tạo chương trình',
    intentEn: ['create', 'launch', 'setup', 'start', 'new program'],
    intentVi: ['tao', 'tao chuong trinh', 'khoi tao', 'bat dau chuong trinh'],
    keywordsEn: ['program', 'sponsor', 'fund', 'pool', 'how'],
    keywordsVi: ['chuong trinh', 'sponsor', 'pool'],
  },
  {
    id: 'fees',
    titleEn: 'What are the fees?',
    titleVi: 'Phí là bao nhiêu?',
    answerEn:
      'GrantFlow charges a 1% platform fee at program creation, taken from the sponsor\'s wallet at the time of creation. It goes directly to the protocol — never mixed with the prize pool. Winners receive exactly the prize set by the sponsor. The fee is hard-capped at 5% in the contract. Gas on Arc is paid in USDC and costs a few cents.',
    answerVi:
      'GrantFlow thu phí nền tảng 1% khi tạo chương trình, lấy từ ví sponsor ngay lúc tạo. Phí vào thẳng giao thức — không trộn với prize pool. Người chiến thắng nhận đúng số tiền giải thưởng sponsor đặt. Phí bị giới hạn cứng 5% trong hợp đồng. Gas trên Arc trả bằng USDC, vài xu mỗi giao dịch.',
    navTarget: 'docs',
    navLabelEn: 'Open Docs',
    navLabelVi: 'Mở trang Docs',
    intentEn: ['fee', 'fees', 'cost', 'charge', '1%', 'how much', 'percent'],
    intentVi: ['phi', 'chi phi', 'bao nhieu', 'mat bao nhieu', 'phi nen tang', 'gia'],
    keywordsEn: ['platform', 'gas', 'price', 'payment'],
    keywordsVi: ['gas'],
  },
  {
    id: 'wallet',
    titleEn: 'Which wallet and network?',
    titleVi: 'Ví và mạng lưới nào?',
    answerEn:
      'GrantFlow runs on Arc Mainnet (chain ID 5042). Use any EVM wallet: MetaMask, Rabby, Coinbase Wallet, or any WalletConnect-compatible wallet. USDC on Arc is the native gas token — you only need one asset. Add Arc Mainnet to MetaMask: RPC https://rpc.mainnet.arc.io, Chain ID 5042, Symbol USDC.',
    answerVi:
      'GrantFlow chạy trên Arc Mainnet (chain ID 5042). Dùng ví EVM bất kỳ: MetaMask, Rabby, Coinbase Wallet hoặc ví WalletConnect. USDC trên Arc là token gas gốc — chỉ cần một loại tài sản. Thêm Arc Mainnet vào MetaMask: RPC https://rpc.mainnet.arc.io, Chain ID 5042, Symbol USDC.',
    navTarget: 'docs',
    navLabelEn: 'Open Docs',
    navLabelVi: 'Mở Docs',
    intentEn: ['wallet', 'network', 'metamask', 'walletconnect', 'chain', 'which wallet', 'what wallet'],
    intentVi: ['vi', 'mang', 'ket noi', 'vi nao', 'mang luoi'],
    keywordsEn: ['arc', 'mainnet', 'evm', 'connect', 'coinbase', 'rabby'],
    keywordsVi: ['metamask', 'arc mainnet', 'walletconnect'],
  },
  {
    id: 'nowinners',
    titleEn: 'What if there are no winners?',
    titleVi: 'Nếu không có người thắng thì sao?',
    answerEn:
      'If the deadline passes with no fully-approved submissions, the sponsor can reclaim the unspent prize pool via "Reclaim funds" on their program. The 1% fee is not returned — only the unclaimed prize pool. There is no time limit on reclaiming after the deadline.',
    answerVi:
      'Nếu hết hạn mà không có bài nộp được phê duyệt đủ ngưỡng, sponsor có thể lấy lại prize pool chưa dùng qua "Reclaim funds". Phí 1% không hoàn lại — chỉ có prize pool chưa nhận mới được lấy. Không có giới hạn thời gian lấy lại sau hạn chót.',
    navTarget: 'sponsor',
    navLabelEn: 'Open My programs',
    navLabelVi: 'Mở My programs',
    intentEn: ['reclaim', 'refund', 'no winner', 'no winners', 'nobody', 'withdraw',
               'unused', 'leftover', 'unclaimed', 'where does money go', 'what happens money'],
    intentVi: ['hoan tien', 'lay lai', 'thu hoi', 'khong co nguoi thang', 'reclaim',
               'khong ai thang', 'tien di dau', 'tien ve dau', 'con du', 'du tien',
               'tien thua', 'so tien con lai'],
    keywordsEn: ['deadline', 'expire', 'cancel', 'empty', 'return', 'leftover money'],
    keywordsVi: ['het han', 'huy', 'khong', 'thang', 'dau'],
  },
  {
    id: 'payout',
    titleEn: 'How do winners get paid?',
    titleVi: 'Người chiến thắng nhận tiền như thế nào?',
    answerEn:
      'GrantFlow uses a pull-claim pattern. Once enough reviewers approve a submission (meeting the threshold), the winner can claim. Go to "My submissions" (Builder tab), find the approved submission, and click "Claim USDC". This transfers the prize from the contract to your wallet. No one can push funds to you — you must claim yourself.',
    answerVi:
      'GrantFlow dùng mô hình pull-claim. Khi đủ reviewer phê duyệt (đạt ngưỡng), người thắng có thể nhận. Vào "My submissions" (tab Builder), tìm bài đã phê duyệt và nhấn "Claim USDC". Điều này chuyển giải thưởng từ hợp đồng vào ví bạn. Không ai đẩy tiền cho bạn — bạn phải tự nhận.',
    navTarget: 'builder',
    navLabelEn: 'Open My submissions',
    navLabelVi: 'Mở My submissions',
    intentEn: ['claim', 'payout', 'get paid', 'winner', 'prize', 'reward', 'receive'],
    intentVi: ['nhan thuong', 'nguoi thang', 'nhan tien', 'rut thuong', 'claim', 'tra thuong'],
    keywordsEn: ['paid', 'pay', 'transfer', 'usdc', 'how winners'],
    keywordsVi: ['giai thuong', 'usdc'],
  },
  {
    id: 'safe',
    titleEn: 'Is it safe?',
    titleVi: 'Có an toàn không?',
    answerEn:
      'GrantFlow uses OpenZeppelin SafeERC20, ReentrancyGuard, and Ownable2Step. It has 157 Foundry tests (89 v3 + 68 v4) including fuzz tests. Arc Studio ran automated security and functional reviews. The source is public on GitHub. It has NOT been audited by an independent third party. Use small amounts. GrantFlow never asks for your private key or seed phrase.',
    answerVi:
      'GrantFlow dùng OpenZeppelin SafeERC20, ReentrancyGuard và Ownable2Step. Có 157 bài kiểm tra Foundry (89 v3 + 68 v4) bao gồm fuzz test. Arc Studio chạy đánh giá bảo mật tự động. Mã nguồn công khai trên GitHub. CHƯA được kiểm toán bởi bên thứ ba độc lập. Hãy dùng số tiền nhỏ. GrantFlow không bao giờ yêu cầu khóa riêng tư hay seed phrase.',
    navTarget: 'about',
    navLabelEn: 'Open About / Security',
    navLabelVi: 'Mở About / Bảo mật',
    intentEn: ['safe', 'security', 'audit', 'audited', 'secure', 'risk', 'hack'],
    intentVi: ['an toan', 'bao mat', 'kiem toan', 'rui ro', 'hack'],
    keywordsEn: ['trust', 'danger', 'vulnerable', 'openzeppelin', 'test', 'reliable'],
    keywordsVi: ['tin cay', 'kiem tra'],
  },
  {
    id: 'submit',
    titleEn: 'How do I submit to a program?',
    titleVi: 'Làm thế nào để nộp bài?',
    answerEn:
      'Go to "My submissions" (Builder tab). For Onchain Build programs, paste your deployed contract address. For Open Bounty programs, paste a link to your work. Submit before the deadline. Reviewers then vote. If enough approve (meeting the threshold), you can claim your prize.',
    answerVi:
      'Vào "My submissions" (tab Builder). Với Onchain Build, dán địa chỉ hợp đồng đã triển khai. Với Open Bounty, dán link công việc. Nộp trước hạn chót. Reviewer bỏ phiếu. Nếu đủ phê duyệt, bạn có thể nhận giải.',
    navTarget: 'builder',
    navLabelEn: 'Open My submissions',
    navLabelVi: 'Mở My submissions',
    intentEn: ['submit', 'apply', 'entry', 'participate', 'join', 'builder'],
    intentVi: ['nop bai', 'tham gia', 'tham du', 'du thi', 'bai du thi'],
    keywordsEn: ['submission', 'bounty', 'build', 'project', 'contract address'],
    keywordsVi: ['apply'],
  },
  {
    id: 'review',
    titleEn: 'How does reviewing work?',
    titleVi: 'Quy trình review hoạt động như thế nào?',
    answerEn:
      'Sponsors add reviewer addresses when creating a program and set an approval threshold (e.g. 2-of-3). Reviewers go to the Review queue tab, see pending submissions, and click Approve. When the threshold is met, the winner can claim. Reviewers can only approve — they cannot transfer funds.',
    answerVi:
      'Sponsor thêm địa chỉ reviewer khi tạo và đặt ngưỡng (ví dụ 2/3). Reviewer vào tab Review queue, xem bài đang chờ và nhấn Approve. Khi đạt ngưỡng, người thắng nhận thưởng. Reviewer chỉ phê duyệt — không chuyển tiền.',
    navTarget: 'reviewer',
    navLabelEn: 'Open Review queue',
    navLabelVi: 'Mở Review queue',
    intentEn: ['review', 'reviewer', 'approve', 'approval', 'approving', 'judge', 'vote', 'queue', 'how approve'],
    intentVi: ['duyet', 'phe duyet', 'reviewer', 'bo phieu', 'hang doi', 'giam khao'],
    keywordsEn: ['threshold', 'decision'],
    keywordsVi: ['nguong'],
  },
];

// ── Matching Engine ───────────────────────────────────────────────────────────

/** Detect language: Vietnamese diacritics first, then normalised VI keywords. */
export function detectLang(input: string): Lang {
  // Presence of diacritic marks (combining chars after NFD) = Vietnamese
  if (/[\u0300-\u036f]/.test(input.normalize('NFD'))) return 'vi';
  // Normalised (no-diacritic) Vietnamese intent keywords — whole-word check
  const normInput = norm(input);
  const viSignals = [
    'phi', 'chi phi', 'bao nhieu', 'tao', 'chuong trinh',
    'hoan tien', 'lay lai', 'nhan thuong', 'tra thuong',
    'an toan', 'bao mat', 'nop bai', 'tham gia', 'phe duyet',
    'duyet', 'mang luoi', 'ket noi', 'het han', 'thu hoi',
    'giam khao', 'hang doi', 'khong ai thang', 'tien di dau',
    'tien ve dau', 'con du', 'tien thua',
  ];
  if (viSignals.some(k => wholeWord(normInput, norm(k)))) return 'vi';
  return 'en';
}

/** Score an entry against a query. */
function scoreEntry(entry: KbEntry, normQuery: string, queryToks: string[], lang: Lang): number {
  let s = 0;

  // Intent keywords (high weight = 8) — must be whole-word in normalised query
  const intents = lang === 'vi'
    ? [...entry.intentVi, ...entry.intentEn]
    : [...entry.intentEn, ...entry.intentVi];

  for (const kw of intents) {
    const normKw = norm(kw);
    if (wholeWord(normQuery, normKw)) {
      s += 8;
    } else {
      // Multi-token intent phrase: all tokens present?
      const kwToks = tokenise(kw);
      if (kwToks.length > 1 && kwToks.every(t => queryToks.includes(t))) {
        s += 6;
      }
    }
  }

  // General keywords (weight = 3) — whole-word only
  const generals = lang === 'vi'
    ? [...entry.keywordsVi, ...entry.keywordsEn]
    : [...entry.keywordsEn, ...entry.keywordsVi];

  for (const kw of generals) {
    if (wholeWord(normQuery, norm(kw))) s += 3;
  }

  // Title match bonus (6) — substring of full normalised title
  const title = norm(lang === 'vi' ? entry.titleVi : entry.titleEn);
  if (title.includes(normQuery)) s += 6;

  return s;
}

/** Minimum score threshold — avoids returning a spurious low-score match. */
const MIN_SCORE = 3;

/** Find best matching KB entry for free-text input. */
export function findEntry(query: string): { entry: KbEntry; lang: Lang } | null {
  if (!query.trim()) return null;
  const lang = detectLang(query);
  const normQuery = norm(query);
  const queryToks = tokenise(query);

  const scored = KB
    .map(e => ({ entry: e, s: scoreEntry(e, normQuery, queryToks, lang) }))
    .filter(x => x.s >= MIN_SCORE);

  if (!scored.length) return null;
  scored.sort((a, b) => b.s - a.s);
  return { entry: scored[0].entry, lang };
}
