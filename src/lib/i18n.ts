/**
 * GrantFlow i18n — EN/VI string table.
 * Usage: const t = useI18n(); t('explore.title')
 */

export type Lang = 'en' | 'vi';

const EN = {
  // Nav
  'nav.explore':      'Explore',
  'nav.create':       'Create program',
  'nav.submissions':  'My submissions',
  'nav.judge':        'Programs to judge',
  'nav.docs':         'Guide',
  'nav.howItWorks':   'How it works',
  'nav.compare':      'Compare',
  'nav.developers':   'Developers',
  'nav.builtVsPlanned': 'Built vs planned',
  'nav.about':        'About',
  'nav.terms':        'Terms & risk',
  'nav.contact':      'Contact',
  'nav.deploy':       'Deploy contract',

  // Explore
  'explore.title':    'Programs, paid onchain',
  'explore.all':      'All',
  'explore.subOpen':  'Submissions open',
  'explore.judging':  'Judging',
  'explore.finalized':'Finalized',
  'explore.empty':    'No programs found',
  'explore.search':   'Search programs…',
  'explore.sort.newest':   'Newest',
  'explore.sort.endingSoon': 'Ending soon',
  'explore.sort.biggestPool': 'Biggest pool',
  'explore.page':     'Page',
  'explore.of':       'of',
  'explore.prev':     'Previous',
  'explore.next':     'Next',

  // Phases
  'phase.submission': 'Submissions open',
  'phase.judging':    'Judging',
  'phase.finalized':  'Finalized',
  'phase.cancelled':  'Cancelled',
  'phase.ended':      'Ended · winners announced',

  // Actions
  'action.connect':     'Connect wallet',
  'action.submit':      'Submit project',
  'action.vote':        'Vote',
  'action.finalize':    'Finalize',
  'action.claim':       'Claim prize',
  'action.reclaim':     'Reclaim unawarded',
  'action.share':       'Share results',
  'action.copied':      'Link copied!',
  'action.retry':       'Retry',
  'action.create':      'Create program',

  // Status
  'status.claimed':         'Claimed',
  'status.unclaimed':       'Unclaimed — winner can claim',
  'status.pending':         'Pending…',
  'status.confirmed':       'Confirmed',
  'status.failed':          'Failed',
  'status.loading':         'Loading…',
  'status.noWallet':        'Connect a wallet to take action.',
  'status.wrongNetwork':    'Wrong network.',
  'status.switchNetwork':   'Switch to Arc',
  'status.lastUpdated':     'Last updated',

  // Trust bar
  'trust.mainnet':    'Arc mainnet',
  'trust.testnet':    'Arc testnet',
  'trust.block':      'block',
  'trust.healthy':    'RPC healthy',
  'trust.slow':       'RPC slow',
  'trust.down':       'RPC down',

  // Errors
  'error.rpc':              'Could not reach the network. Retrying…',
  'error.loadFailed':       'Failed to load. Please retry.',
  'error.txRejected':       'Transaction rejected.',
  'error.insufficientUsdc': 'Insufficient USDC balance.',
  'error.wrongNetwork':     'Please switch to Arc to continue.',
  'error.unknown':          'Something went wrong. Try again.',

  // Footer
  'footer.tagline':   'Grant and bounty payouts — locked onchain, paid in USDC.',
  'footer.live':      'Every number on this site is read live from Arc mainnet in your browser. Reading needs no wallet.',
  'footer.product':   'Product',
  'footer.build':     'Build',
  'footer.company':   'Company',
  'footer.source':    'Source and tests',
  'footer.explorer':  'Contract on explorer.arc.io',
  'footer.contact':   'Contact via GitHub issues',
} satisfies Record<string, string>;

const VI: Partial<typeof EN> = {
  'nav.explore':      'Khám phá',
  'nav.create':       'Tạo chương trình',
  'nav.submissions':  'Bài nộp của tôi',
  'nav.judge':        'Chương trình cần chấm',
  'nav.docs':         'Hướng dẫn',
  'nav.howItWorks':   'Cách hoạt động',
  'nav.compare':      'So sánh',
  'nav.developers':   'Nhà phát triển',
  'nav.builtVsPlanned': 'Đã xây - Kế hoạch',
  'nav.about':        'Giới thiệu',
  'nav.terms':        'Điều khoản & rủi ro',
  'nav.contact':      'Liên hệ',

  'explore.title':    'Chương trình, thanh toán onchain',
  'explore.all':      'Tất cả',
  'explore.subOpen':  'Đang mở nộp bài',
  'explore.judging':  'Đang chấm',
  'explore.finalized':'Đã xong',
  'explore.empty':    'Không tìm thấy chương trình',
  'explore.search':   'Tìm chương trình…',
  'explore.sort.newest':    'Mới nhất',
  'explore.sort.endingSoon':'Sắp kết thúc',
  'explore.sort.biggestPool':'Giải lớn nhất',

  'phase.submission': 'Đang mở nộp bài',
  'phase.judging':    'Đang chấm',
  'phase.finalized':  'Đã xong',
  'phase.cancelled':  'Đã huỷ',
  'phase.ended':      'Đã kết thúc · đã có người thắng',

  'action.connect':   'Kết nối ví',
  'action.submit':    'Nộp dự án',
  'action.vote':      'Bình chọn',
  'action.finalize':  'Kết thúc',
  'action.claim':     'Nhận thưởng',
  'action.reclaim':   'Lấy lại tiền thưởng chưa trao',
  'action.share':     'Chia sẻ kết quả',
  'action.copied':    'Đã sao chép!',
  'action.retry':     'Thử lại',
  'action.create':    'Tạo chương trình',

  'status.claimed':         'Đã nhận',
  'status.unclaimed':       'Chưa nhận — người thắng có thể claim',
  'status.pending':         'Đang xử lý…',
  'status.confirmed':       'Đã xác nhận',
  'status.failed':          'Thất bại',
  'status.loading':         'Đang tải…',
  'status.noWallet':        'Kết nối ví để thực hiện hành động.',
  'status.wrongNetwork':    'Sai mạng.',
  'status.switchNetwork':   'Chuyển sang Arc',
  'status.lastUpdated':     'Cập nhật lúc',

  'trust.mainnet':    'Arc mainnet',
  'trust.testnet':    'Arc testnet',
  'trust.block':      'block',
  'trust.healthy':    'RPC ổn định',
  'trust.slow':       'RPC chậm',
  'trust.down':       'RPC lỗi',

  'error.rpc':              'Không thể kết nối mạng. Đang thử lại…',
  'error.loadFailed':       'Tải thất bại. Vui lòng thử lại.',
  'error.txRejected':       'Giao dịch bị từ chối.',
  'error.insufficientUsdc': 'Số dư USDC không đủ.',
  'error.wrongNetwork':     'Vui lòng chuyển sang Arc để tiếp tục.',
  'error.unknown':          'Đã có lỗi xảy ra. Thử lại.',

  'footer.tagline':   'Thanh toán grant và bounty — khoá onchain, trả bằng USDC.',
  'footer.live':      'Mọi con số trên trang này được đọc trực tiếp từ Arc mainnet trên trình duyệt của bạn. Đọc không cần ví.',
  'footer.product':   'Sản phẩm',
  'footer.build':     'Xây dựng',
  'footer.company':   'Công ty',
  'footer.source':    'Mã nguồn và kiểm thử',
  'footer.explorer':  'Hợp đồng trên explorer.arc.io',
  'footer.contact':   'Liên hệ qua GitHub issues',
};

export type StringKey = keyof typeof EN;

const TABLES: Record<Lang, Partial<typeof EN>> = { en: EN, vi: VI };

export function translate(lang: Lang, key: StringKey): string {
  return TABLES[lang][key] ?? EN[key];
}
