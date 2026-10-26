/**
 * i18n smoke test — verifies EN and VI translations load correctly
 * and that key language-switched strings differ between EN and VI.
 *
 * Run with: bun run src/lib/i18n/i18n.test.ts
 */
import { EN } from './en';
import { VI } from './vi';
import type { StringKey } from './index';

let passed = 0;
let failed = 0;

function assert(desc: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✅  ${desc}`);
    passed++;
  } else {
    console.error(`  ❌  ${desc}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// 1. Key count check
const enKeys = Object.keys(EN) as StringKey[];
const viKeys = Object.keys(VI) as StringKey[];
assert('EN has keys', enKeys.length > 0);
assert('VI has same number of keys as EN', enKeys.length === viKeys.length,
  `EN=${enKeys.length} VI=${viKeys.length}`);

// 2. All EN keys present in VI
const viSet = new Set(viKeys);
const missing = enKeys.filter(k => !viSet.has(k));
assert(`All EN keys present in VI (missing: ${missing.length})`, missing.length === 0,
  missing.slice(0, 5).join(', '));

// 3. Sample VI strings differ from EN (proves translations are not placeholders)
const sampleKeys: StringKey[] = [
  'landing.hero.headline1',
  'landing.hero.sub',
  'nav.explore',
  'hiw.title',
  'footer.tagline',
];
for (const k of sampleKeys) {
  const en = EN[k];
  const vi = VI[k];
  assert(`VI key '${k}' is non-empty`, typeof vi === 'string' && vi.length > 0);
  assert(`VI key '${k}' differs from EN`, en !== vi, `both="${en}"`);
}

// 4. Role labels differ in VI (the label change was a user requirement)
assert("VI role 'role.hacker' contains 'Thí sinh'", (VI['role.hacker'] as string).includes('Thí sinh'));
assert("VI role 'role.organizer' contains 'Nhà tài trợ'", (VI['role.organizer'] as string).includes('Nhà tài trợ'));
assert("VI role 'role.judge' contains 'Giám khảo'", (VI['role.judge'] as string).includes('Giám khảo'));

// 5. New keys added this session are present in both EN and VI
const newKeys: StringKey[] = [
  'mySubs.title', 'mySubs.claim', 'deploy.wrongNetwork',
  'slimFooter.readLive', 'topbar.collapse', 'topbar.expand',
  'help.title', 'help.inputPh', 'bvp.footer',
];
for (const k of newKeys) {
  assert(`EN has new key '${k}'`, k in EN);
  assert(`VI has new key '${k}'`, k in VI);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
