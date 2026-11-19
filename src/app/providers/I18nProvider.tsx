import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language } from '@/types/database.types';
import { translations } from '@/lib/i18n/translations';

interface I18nContextValue {
  lang: Language;
  dir: 'rtl' | 'ltr';
  setLang: (lang: Language) => void;
  t: (typeof translations)['he'] | (typeof translations)['en'];
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = 'tc_preferred_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'he' ? saved : 'he';
  });

  const dir: 'rtl' | 'ltr' = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        dir,
        setLang,
        t: translations[lang],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
