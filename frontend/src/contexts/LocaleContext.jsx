import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { translate, SUPPORTED_LOCALES } from '../i18n/dictionaries';
import api from '../services/api';

const LocaleContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  locales: SUPPORTED_LOCALES,
});

export function LocaleProvider({ children, initialLocale = 'en' }) {
  const [locale, setLocaleState] = useState(() => localStorage.getItem('codexpos_locale') || initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('codexpos_locale', locale);
  }, [locale]);

  const setLocale = async (next) => {
    setLocaleState(next);
    try {
      await api.put('/settings/locale', { locale: next });
    } catch (_) { /* optional persistence */ }
  };

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key) => translate(locale, key),
    locales: SUPPORTED_LOCALES,
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
