/**
 * useI18n — language context + translate helper.
 * Wrap the app root with <I18nProvider>; consume with useI18n().
 */
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { translate, type Lang, type StringKey } from '@/lib/i18n';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
}

const I18nContext = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('gf-lang');
      return saved === 'vi' ? 'vi' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('gf-lang', l); } catch {}
  }, []);

  const t = useCallback((key: StringKey) => translate(lang, key), [lang]);

  return createElement(I18nContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}
