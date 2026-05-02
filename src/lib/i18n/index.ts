'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import ptBR from './pt-BR';
import type { Translations } from './pt-BR';
import en from './en';

export type Language = 'pt-BR' | 'en';

const COOKIE_NAME = 'eduh_language';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const translations: Record<Language, Translations> = {
  'pt-BR': ptBR,
  en,
};

type I18nContextValue = {
  t: Translations;
  language: Language;
  setLanguage: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function getLanguageFromCookie(): Language {
  if (typeof document === 'undefined') return 'pt-BR';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match?.[1];
  return value === 'en' ? 'en' : 'pt-BR';
}

export function setLanguageCookie(language: Language): void {
  document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

const LANGUAGE_EVENT = 'eduh:language-change';

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: ReactNode;
}) {
  const [language, setLang] = useState<Language>(initialLanguage);

  useEffect(() => {
    function handleChange(e: Event) {
      setLang((e as CustomEvent<Language>).detail);
    }
    window.addEventListener(LANGUAGE_EVENT, handleChange);
    return () => window.removeEventListener(LANGUAGE_EVENT, handleChange);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageCookie(lang);
    setLang(lang);
    window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: lang }));
  }, []);

  return createElement(
    I18nContext.Provider,
    {
      value: {
        t: translations[language],
        language,
        setLanguage,
      },
    },
    children,
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context) return context;

  const language = getLanguageFromCookie();
  return {
    t: translations[language],
    language,
    setLanguage: setLanguageCookie,
  };
}
