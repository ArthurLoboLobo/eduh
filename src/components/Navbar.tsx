'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

export default function Navbar() {
  const { t, language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowLanguages(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleClose() {
    setOpen(false);
    setShowLanguages(false);
  }

  function handleLanguageSelect(lang: Language) {
    setLanguage(lang);
    handleClose();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-40 h-14 bg-background/80 backdrop-blur-md border-b border-border-subtle flex items-center px-6 md:px-8">
      <Link
        href="/dashboard"
        className="text-base font-semibold text-primary-text hover:text-accent-blue"
      >
        Ditchy
      </Link>

      <div className="ml-auto relative" ref={dropdownRef}>
        {/* Avatar button */}
        <button
          onClick={() => { setOpen((v) => !v); setShowLanguages(false); }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 cursor-pointer"
          aria-label="Menu do perfil"
          aria-expanded={open}
        >
          <AvatarIcon />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-12 w-48 bg-surface border border-border-subtle rounded-2xl p-1 shadow-2xl">
            {!showLanguages ? (
              <>
                <button
                  onClick={() => setShowLanguages(true)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-primary-text hover:bg-surface-hover rounded-xl cursor-pointer transition-colors"
                >
                  <span>{t.nav.language}</span>
                  <ChevronRightIcon />
                </button>
                <div className="my-1 border-t border-border-subtle mx-2" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-danger-red hover:bg-surface-hover rounded-xl cursor-pointer transition-colors"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLanguages(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-text hover:text-primary-text hover:bg-surface-hover rounded-xl cursor-pointer transition-colors"
                >
                  <ChevronLeftIcon />
                  <span>{t.nav.language}</span>
                </button>
                <div className="my-1 border-t border-border-subtle mx-2" />
                {(['pt-BR', 'en'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageSelect(lang)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-surface-hover rounded-xl transition-colors ${
                      language === lang ? 'text-accent-blue bg-accent-surface' : 'text-primary-text'
                    }`}
                  >
                    <span>{lang === 'pt-BR' ? 'Português' : 'English'}</span>
                    {language === lang && <CheckIcon />}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function AvatarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
