/**
 * Vietnamese string table — must cover every key in en.ts.
 * Run `bun run check-i18n` to verify completeness.
 */
import { VI_1 } from './vi.part1';
import { VI_2 } from './vi.part2';
import { VI_3 } from './vi.part3';
import { VI_4 } from './vi.part4';
import type { EN } from './en';

export const VI: Record<keyof typeof EN, string> = {
  ...VI_1,
  ...VI_2,
  ...VI_3,
  ...VI_4,
};
