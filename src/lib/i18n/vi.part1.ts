// vi.ts part 1 — nav, roles, landing hero, landing HIW summary, landing use cases
export const VI_1 = {
  // ── Nav ──────────────────────────────────────────────────────────────────
  'nav.explore':          'Khám phá',
  'nav.create':           'Tạo chương trình',
  'nav.myPrograms':       'Chương trình của tôi',
  'nav.submissions':      'Bài nộp của tôi',
  'nav.judge':            'Chương trình cần chấm',
  'nav.docs':             'Hướng dẫn',
  'nav.howItWorks':       'Cách hoạt động',
  'nav.compare':          'So sánh',
  'nav.developers':       'Nhà phát triển',
  'nav.builtVsPlanned':   'Đã xây - Kế hoạch',
  'nav.about':            'Giới thiệu',
  'nav.terms':            'Điều khoản & rủi ro',
  'nav.contact':          'Liên hệ',
  'nav.deploy':           'Triển khai hợp đồng',
  'nav.guide':            'Hướng dẫn',
  'nav.moreMenu':         'Thêm',

  // ── Role switcher ─────────────────────────────────────────────────────────
  'role.hacker':          'Thí sinh',
  'role.organizer':       'Nhà tài trợ',
  'role.judge':           'Giám khảo',
  'role.label':           'Vai trò',

  // ── Landing hero ─────────────────────────────────────────────────────────
  'landing.hero.headline1':   'Thanh toán grant & bounty,',
  'landing.hero.headline2':   'hoàn toàn onchain.',
  'landing.hero.sub':         'Nhà tài trợ khóa quỹ USDC vào smart contract. Giám khảo bình chọn. Khi finalize, giải thưởng được thanh toán tự động cho người thắng — bao gồm chia % cho đội nhóm. Phần chưa trao trả lại cho nhà tài trợ. Không chuyển khoản thủ công, không chờ đợi.',
  'landing.hero.cta.launch':  'Tạo chương trình',
  'landing.hero.cta.browse':  'Xem chương trình',
  'landing.hero.trust.locked':   'Quỹ khoá trước trong hợp đồng thông minh',
  'landing.hero.trust.tests':    '237 bài test Foundry (v3 + v4 + v5)',
  'landing.hero.trust.oss':      'Mã nguồn mở trên GitHub',
  'landing.hero.trust.arc':      'Arc Mainnet — USDC là phí gas',

  // ── Landing — How it works (V4 summary) ───────────────────────────────────
  'landing.hiw.label':    'Cách hoạt động',
  'landing.hiw.heading':  'Năm bước. Hoàn toàn onchain.',
  'landing.hiw.s1.title': 'Tài trợ quỹ',
  'landing.hiw.s1.body':  'Nhà tài trợ tạo chương trình với danh sách giải thưởng (giải 1, giải 2…), hai thời hạn (nộp bài và chấm điểm), và danh sách giám khảo. USDC được chuyển vào hợp đồng ngay trong cùng giao dịch. Phí nền tảng 1% được khấu trừ ngay khi tạo.',
  'landing.hiw.s2.title': 'Nhận bài dự thi',
  'landing.hiw.s2.body':  'Thí sinh nộp địa chỉ hợp đồng đã triển khai (chương trình Onchain Build) hoặc link công việc (chương trình Open Bounty) trước thời hạn nộp bài.',
  'landing.hiw.s3.title': 'Giám khảo bình chọn',
  'landing.hiw.s3.body':  'Sau thời hạn nộp bài, giám khảo bắt đầu chấm. Mỗi giám khảo có đúng N phiếu bầu, N bằng số hạng giải thưởng. Không thể bầu cho bài của chính mình, không bầu hai lần cho cùng một bài.',
  'landing.hiw.s4.title': 'Xếp hạng & kết thúc',
  'landing.hiw.s4.body':  'Sau deadline chấm điểm, bất kỳ ai có thể gọi finalize(). Hợp đồng xếp hạng theo lượt bình chọn và thanh toán giải thưởng trực tiếp cho người thắng (và từng thành viên nhóm theo % chia sẻ) trong cùng một giao dịch. Phần chưa trao được hoàn lại tự động cho nhà tài trợ.',

  // ── Landing — Use cases ───────────────────────────────────────────────────
  'landing.usecases.label':   'Ứng dụng',
  'landing.usecases.heading': 'Phù hợp với mọi loại chương trình',
  'landing.uc.hackathon.cat':      'Hackathon',
  'landing.uc.hackathon.headline': 'Chương trình Onchain Build',
  'landing.uc.hackathon.body':     'Yêu cầu người tham gia triển khai hợp đồng thông minh. Địa chỉ hợp đồng được lưu onchain như bằng chứng. Mỗi hợp đồng chỉ được nộp một lần.',
  'landing.uc.bounty.cat':         'Open Bounty',
  'landing.uc.bounty.headline':    'Chương trình Open Bounty',
  'landing.uc.bounty.body':        'Không cần triển khai hợp đồng — phù hợp cho thiết kế, nội dung, giới thiệu, và mọi công việc mà kết quả nằm ngoài chuỗi.',
  'landing.uc.contest.cat':        'Contest',
  'landing.uc.contest.headline':   'Cuộc thi',
  'landing.uc.contest.body':       'Giải thưởng xếp hạng (hạng nhất, nhì, ba…) do giám khảo bình chọn. Giải chưa trao sẽ hoàn về nhà tài trợ sau khi kết thúc.',
  'landing.uc.referral.cat':       'Referral',
  'landing.uc.referral.headline':  'Thưởng giới thiệu',
  'landing.uc.referral.body':      'Trả một khoản USDC cố định cho mỗi lượt giới thiệu hợp lệ. Giám khảo xác minh từng bài nộp. Mỗi địa chỉ ví chỉ nhận thưởng một lần.',

  // ── Landing nav ───────────────────────────────────────────────────────────
  'landing.nav.hiw':       'Cách hoạt động',
  'landing.nav.usecases':  'Ứng dụng',
  'landing.nav.fees':      'Phí',
  'landing.nav.security':  'Bảo mật',
  'landing.nav.faq':       'FAQ',
  'landing.nav.explore':   'Khám phá',
  'landing.nav.developers':'Nhà phát triển',
  'landing.nav.launch':    'Vào ứng dụng',

  // ── Landing stats strip ───────────────────────────────────────────────────
  'landing.stats.programs':  'Chương trình',
  'landing.stats.locked':    'USDC đang khoá',
  'landing.stats.paidOut':   'USDC đã trả',
  'landing.stats.loading':   '—',
} as const;
