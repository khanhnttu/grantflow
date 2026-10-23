/**
 * Unit tests for the GrantFlow help assistant matcher.
 * Run with: bun test src/lib/helpKb.test.ts
 *
 * Covers:
 *  - English queries → correct intent id
 *  - Vietnamese queries with diacritics → correct intent id + lang=vi
 *  - Vietnamese queries without diacritics (romanised) → correct intent id + lang=vi
 *  - No-match queries → null
 *  - Anti-regression: "phi" inside "phe" must not match fees
 */

import { test, expect, describe } from 'bun:test';
import { findEntry, detectLang, norm, tokenise } from './helpKb';

// ── Helpers ────────────────────────────────────────────────────────────────────

function expectId(query: string, expectedId: string) {
  const result = findEntry(query);
  expect(result, `query: "${query}"`).not.toBeNull();
  expect(result!.entry.id, `query: "${query}" → expected "${expectedId}" got "${result!.entry.id}"`).toBe(expectedId);
}

function expectLang(query: string, expectedLang: 'en' | 'vi') {
  expect(detectLang(query), `lang for: "${query}"`).toBe(expectedLang);
}

function expectNull(query: string) {
  const result = findEntry(query);
  expect(result, `expected null for: "${query}"`).toBeNull();
}

// ── norm() ─────────────────────────────────────────────────────────────────────

describe('norm', () => {
  test('strips Vietnamese diacritics', () => {
    expect(norm('phí')).toBe('phi');
    expect(norm('tạo')).toBe('tao');
    expect(norm('chương trình')).toBe('chuong trinh');
    expect(norm('an toàn')).toBe('an toan');
    expect(norm('phê duyệt')).toBe('phe duyet');
  });
  test('lowercases', () => {
    expect(norm('FEE')).toBe('fee');
    expect(norm('MetaMask')).toBe('metamask');
  });
});

// ── tokenise() ─────────────────────────────────────────────────────────────────

describe('tokenise', () => {
  test('splits on non-alnum', () => {
    expect(tokenise('phi bao nhieu?')).toEqual(['phi', 'bao', 'nhieu']);
    expect(tokenise('fee & cost')).toEqual(['fee', 'cost']);
  });
});

// ── detectLang() ───────────────────────────────────────────────────────────────

describe('detectLang', () => {
  test('EN queries → en', () => {
    expectLang('what are the fees', 'en');
    expectLang('how do I create a program', 'en');
    expectLang('which wallet', 'en');
  });
  test('VI with diacritics → vi', () => {
    expectLang('phí bao nhiêu vậy', 'vi');
    expectLang('làm thế nào để tạo chương trình', 'vi');
    expectLang('có an toàn không', 'vi');
  });
  test('VI without diacritics (romanised) → vi', () => {
    expectLang('phi bao nhieu', 'vi');
    expectLang('tao chuong trinh', 'vi');
    expectLang('an toan khong', 'vi');
    expectLang('hoan tien duoc khong', 'vi');
    expectLang('nhan thuong nhu the nao', 'vi');
  });
});

// ── findEntry(): ENGLISH queries ───────────────────────────────────────────────

describe('findEntry — English', () => {
  test('EN-01: fee query', () => expectId('what are the fees', 'fees'));
  test('EN-02: how much cost', () => expectId('how much does it cost', 'fees'));
  test('EN-03: 1% platform fee', () => expectId('1% platform fee', 'fees'));
  test('EN-04: create program', () => expectId('how do I create a program', 'create'));
  test('EN-05: launch program', () => expectId('launch a new program', 'create'));
  test('EN-06: wallet query', () => expectId('which wallet should I use', 'wallet'));
  test('EN-07: metamask network', () => expectId('metamask network', 'wallet'));
  test('EN-08: no winners refund', () => expectId('what if there are no winners', 'nowinners'));
  test('EN-09: reclaim funds', () => expectId('can I reclaim my funds', 'nowinners'));
  test('EN-10: how winners get paid', () => expectId('how do winners get paid', 'payout'));
  test('EN-11: claim prize', () => expectId('claim my prize', 'payout'));
  test('EN-12: safe audit', () => expectId('is it safe and audited', 'safe'));
  test('EN-13: submit entry', () => expectId('how do I submit my entry', 'submit'));
  test('EN-14: reviewer approve', () => expectId('how does reviewing work', 'review'));
  test('EN-15: approve submission', () => expectId('how do I approve a submission', 'review'));
});

// ── findEntry(): VIETNAMESE with diacritics ────────────────────────────────────

describe('findEntry — Vietnamese with diacritics', () => {
  test('VI-D-01: phí bao nhiêu', () => {
    const r = findEntry('phí bao nhiêu vậy');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('fees');
    expect(r!.lang).toBe('vi');
  });
  test('VI-D-02: tạo chương trình', () => {
    const r = findEntry('làm sao để tạo chương trình');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('create');
    expect(r!.lang).toBe('vi');
  });
  test('VI-D-03: an toàn không', () => {
    const r = findEntry('có an toàn không');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('safe');
  });
  test('VI-D-04: hoàn tiền', () => {
    const r = findEntry('hoàn tiền được không');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('nowinners');
  });
  test('VI-D-05: nhận thưởng', () => {
    const r = findEntry('nhận thưởng như thế nào');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('payout');
  });
});

// ── findEntry(): VIETNAMESE without diacritics (romanised) ───────────────────

describe('findEntry — Vietnamese romanised (no diacritics)', () => {
  test('VI-R-01: phi bao nhieu', () => expectId('phi bao nhieu vay', 'fees'));
  test('VI-R-02: tao chuong trinh', () => expectId('tao chuong trinh nhu the nao', 'create'));
  test('VI-R-03: an toan khong', () => expectId('an toan khong', 'safe'));
  test('VI-R-04: hoan tien', () => expectId('hoan tien duoc khong', 'nowinners'));
  test('VI-R-05: nhan thuong', () => expectId('nhan thuong nhu the nao', 'payout'));
  test('VI-R-06: nop bai', () => expectId('nop bai thi nhu the nao', 'submit'));
  test('VI-R-07: phe duyet (reviewer)', () => expectId('quy trinh phe duyet nhu the nao', 'review'));
  test('VI-R-08: chi phi', () => expectId('chi phi het bao nhieu', 'fees'));
  test('VI-R-09: bao mat', () => expectId('bao mat co tot khong', 'safe'));
  test('VI-R-10: lay lai tien', () => expectId('co lay lai tien duoc khong', 'nowinners'));
});

// ── Anti-regression: "phi" must not match "phe" (review entry) ───────────────

describe('Anti-regression', () => {
  test('AR-01: "phe" alone should NOT match fees', () => {
    // "phe duyet" is a reviewer keyword; make sure a query with only "phe"
    // does not accidentally score the fees entry
    const r = findEntry('phe duyet la gi');
    // Must match review, not fees
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('review');
  });

  test('AR-02: "phi" as whole word matches fees, not review', () => {
    expectId('phi la bao nhieu', 'fees');
  });

  test('AR-03: "phim" (movie) should not match fees', () => {
    // "phim" contains "phi" as a substring — must not match fees
    const r = findEntry('phim hay nhat nam nay');
    // No relevant match expected (score < MIN_SCORE)
    if (r !== null) {
      expect(r.entry.id).not.toBe('fees');
    }
  });

  test('AR-04: "phat" should not match payout', () => {
    // "phat" is not a known keyword
    const r = findEntry('phat bieu y kien');
    if (r !== null) {
      expect(r.entry.id).not.toBe('payout');
    }
  });
});

// ── No-match queries ──────────────────────────────────────────────────────────

describe('findEntry — no match', () => {
  test('NM-01: completely off-topic', () => expectNull('best pizza near me'));
  test('NM-02: gibberish', () => expectNull('xyzzy foo bar qux'));
});

// ── Regression: reported live failures ────────────────────────────────────────

describe('Regression — live failures', () => {
  test('RF-01: "không ai thắng thì tiền đi đâu" → nowinners (not fees)', () => {
    const r = findEntry('không ai thắng thì tiền đi đâu');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('nowinners');
    expect(r!.lang).toBe('vi');
  });

  test('RF-02: romanised "khong ai thang thi tien di dau" → nowinners', () => {
    expectId('khong ai thang thi tien di dau', 'nowinners');
  });

  test('RF-03: "what happens to leftover money" → nowinners', () => {
    expectId('what happens to leftover money', 'nowinners');
  });

  test('RF-04: "tien di dau" alone → nowinners', () => {
    expectId('tien di dau', 'nowinners');
  });

  test('RF-05: "tiền dư còn lại" (unused funds) → nowinners', () => {
    const r = findEntry('tiền dư còn lại đi đâu');
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBe('nowinners');
  });
});
