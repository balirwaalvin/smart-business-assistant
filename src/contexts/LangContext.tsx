'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { translations, TranslationKey } from '@/lib/translations';

type Lang = 'en' | 'lg';

interface LangContextType {
  lang: Lang;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
  isLuganda: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  t: (k) => k as string,
  toggleLang: () => {},
  isLuganda: false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const isLuganda = lang === 'lg';
  const toggleLang = () => setLang(l => (l === 'en' ? 'lg' : 'en'));
  const t = (key: TranslationKey): string =>
    (translations[lang][key] ?? translations['en'][key] ?? key) as string;

  return (
    <LangContext.Provider value={{ lang, t, toggleLang, isLuganda }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
