'use client';

import { useState, useCallback, useEffect } from 'react';
import ptBR from './pt-BR';
import type { Translations } from './pt-BR';
import en from './en';

export type Language = 'pt-BR' | 'en';

const COOKIE_NAME = 'ditchy_language';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const translations: Record<Language, Translations> = {
  'pt-BR': ptBR,
  en,
};

export function getLanguageFromCookie(): Language {
  if (typeof document === 'undefined') return 'pt-BR';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match?.[1];
  return value === 'en' ? 'en' : 'pt-BR';
}

export function setLanguageCookie(language: Language): void {
  document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

const LANGUAGE_EVENT = 'ditchy:language-change';

export function useTranslation() {
  // Always start with 'pt-BR' so SSR and client initial render match.
  // Sync to the actual cookie value after hydration.
  const [language, setLang] = useState<Language>('pt-BR');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration sync: start with 'pt-BR' for SSR match, then update to cookie value after mount
    setLang(getLanguageFromCookie());

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

  return {
    t: translations[language],
    language,
    setLanguage,
  };
}
