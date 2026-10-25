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
      'Connect your wallet, switch to the Organizer role, and click "Create program". Fill in the four steps: basics (name, type, deadlines), prizes (ranked prize amounts), judges (wallet addresses), and review & pay. You approve USDC in one transaction and create the program in a second. The full prize pool is locked immediately; the 1% fee goes to the platform.',
    answerVi:
      'Kết nối ví, chuyển sang vai Nhà tài trợ và nhấn "Tạo chương trình". Điền bốn bước: cơ bản (tên, loại, thời hạn), giải thưởng (danh sách giải theo hạng), giám khảo (địa chỉ ví), xem lại & thanh toán. Bạn phê duyệt USDC một giao dịch rồi tạo chương trình giao dịch thứ hai. Toàn bộ quỹ giải thưởng khóa ngay; phí 1% vào nền tảng.',
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
      'After finalization, any prize tier with no winning submission is left unclaimed. The sponsor can reclaim those unawarded prizes via the program page (Reclaim button in the Winners tab). The 1% fee is not returned. There is no time limit on reclaiming after finalization.',
    answerVi:
      'Sau khi finalize, bất kỳ hạng giải nào không có bài thắng sẽ không được trao. Nhà tài trợ có thể lấy lại các giải chưa trao qua trang chương trình (nút Reclaim trong tab Winners). Phí 1% không hoàn lại. Không giới hạn thời gian lấy lại sau finalize.',
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
      'GrantFlow uses a pull-claim pattern. After the sponsor finalizes the program, winners are ranked by vote count. If you ranked in the top N (where N = number of prizes), go to "My submissions" (Hacker role), find the winning submission, and click "Claim USDC". This transfers the prize from the contract to your wallet. No one can push funds to you — you must claim yourself.',
    answerVi:
      'GrantFlow dùng mô hình pull-claim. Sau khi nhà tài trợ finalize, người thắng được xếp hạng theo số phiếu. Nếu bạn nằm trong top N (N = số giải), vào "My submissions" (vai Thí sinh), tìm bài thắng và nhấn "Claim USDC". Điều này chuyển giải thưởng từ hợp đồng vào ví bạn.',
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
      'Switch to the Hacker role and browse Explore. Open a program during the Submission phase. For Onchain Build programs, paste your deployed contract address. For Open Bounty programs, paste a link to your work. One submission per wallet per program. After finalization, check My submissions — if you won a ranked prize, a Claim button appears.',
    answerVi:
      'Chuyển sang vai Thí sinh và duyệt Explore. Mở chương trình đang trong pha Nộp bài. Với Onchain Build, dán địa chỉ hợp đồng đã triển khai. Với Open Bounty, dán link công việc. Một bài mỗi ví mỗi chương trình. Sau finalize, kiểm tra My submissions — nếu thắng, nút Claim sẽ hiện.',
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
      'Sponsors assign judge wallet addresses when creating a program (V4). During the Judging phase (after submission deadline), judges open a program, go to the Submissions tab, and vote. Each judge has N votes where N equals the number of prize tiers. Judges cannot vote on their own submission or vote twice on the same submission.',
    answerVi:
      'Nhà tài trợ gán địa chỉ ví giám khảo khi tạo chương trình (V4). Trong pha Chấm điểm (sau hạn nộp bài), giám khảo mở chương trình, vào tab Bài dự thi và bình chọn. Mỗi giám khảo có N phiếu (N = số giải thưởng). Không thể bầu cho bài của chính mình hoặc bầu hai lần.',
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
