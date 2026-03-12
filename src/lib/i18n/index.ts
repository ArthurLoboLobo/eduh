'use client';

import { useState, useCallback } from 'react';
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

export function useTranslation() {
  const [language, setLang] = useState<Language>(getLanguageFromCookie);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageCookie(lang);
    setLang(lang);
  }, []);

  return {
    t: translations[language],
    language,
    setLanguage,
  };
}
