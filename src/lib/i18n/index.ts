/**
 * i18n barrel — re-exports everything pages and components need.
 */
export { EN } from './en';
export { VI } from './vi';
export type { StringKey } from './en';

export type Lang = 'en' | 'vi';

import { EN } from './en';
import { VI } from './vi';
import type { StringKey } from './en';

const TABLES: Record<Lang, Record<StringKey, string>> = {
  en: EN as Record<StringKey, string>,
  vi: VI,
};

export function translate(lang: Lang, key: StringKey): string {
  return TABLES[lang][key] ?? (EN as Record<StringKey, string>)[key] ?? key;
}
