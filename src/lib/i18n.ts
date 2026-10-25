/**
 * Legacy re-export shim — all code should import from '@/lib/i18n/index' directly.
 * Kept so any remaining import of '@/lib/i18n' still resolves.
 */
export { translate, type Lang, type StringKey } from '@/lib/i18n/index';
