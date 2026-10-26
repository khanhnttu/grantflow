/**
 * i18n completeness check — run with: bun run check-i18n
 * Exits 1 if any key in EN is missing from VI.
 */
import { EN } from './en';
import { VI } from './vi';

const enKeys = Object.keys(EN) as (keyof typeof EN)[];
const missing = enKeys.filter(k => !(k in VI) || VI[k] === undefined);

if (missing.length > 0) {
  console.error(`\n❌  Missing ${missing.length} VI translation(s):\n`);
  missing.forEach(k => console.error(`  ${k}`));
  process.exit(1);
} else {
  console.log(`✅  All ${enKeys.length} keys present in vi.ts`);
}
