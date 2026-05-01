'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';

export default function Navbar() {
  const { t, language, setLanguage } = useTranslation();
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasPromo, setHasPromo] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    // Fetch promotions silently
    fetch('/api/promotions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const hasEligible = data.some((p: { eligible: boolean; claimed: boolean }) => p.eligible && !p.claimed);
          setHasPromo(hasEligible);
        }
      })
      .catch(() => {});
  }, [user, loading]);

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

  function handleDismissPromo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPromoDismissed(true);
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
    <nav className="fixed top-0 inset-x-0 z-40 h-[56px] bg-lamp-night border-b border-hairline flex items-center px-6 md:px-8 font-label">
      <Link
        href="/dashboard"
        className="font-headline text-[1.25rem] text-page-cream hover:opacity-80 transition-opacity"
      >
        Eduh
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {!loading && (
          <div className="relative flex items-center justify-center">
            <Link
              href="/subscription"
              className="font-label text-[13px] text-page-cream-muted hover:text-page-cream transition-colors"
            >
              {t.nav.subscription}
            </Link>
            {hasPromo && !promoDismissed && pathname === '/dashboard' && (
              <div className="absolute top-[120%] right-0 mt-3 w-56 p-4 rounded-[14px] bg-desk-surface border border-hairline modal-lift animate-[fade-in-up_0.4s_ease-out_forwards] z-50">
                <div className="absolute -top-[5px] right-6 w-[10px] h-[10px] bg-desk-surface border-t border-l border-hairline transform rotate-45" />
                <div className="flex items-start justify-between gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-oxblood-tint flex items-center justify-center text-oxblood shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <span className="font-body text-[13px] text-page-cream leading-snug">{t.promotions.claimTooltipNavbar}</span>
                  <button onClick={handleDismissPromo} className="shrink-0 text-page-cream-muted hover:text-page-cream transition-colors mt-0.5 cursor-pointer" aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="relative" ref={dropdownRef}>
        {/* Avatar button */}
        <button
          onClick={() => { setOpen((v) => !v); setShowLanguages(false); }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-desk-surface text-page-cream hover:bg-desk-surface-hover cursor-pointer"
          aria-label={t.nav.profileMenu}
          aria-expanded={open}
        >
          <AvatarIcon />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-12 w-48 bg-desk-surface border border-hairline rounded-[10px] p-1 shadow-2xl">
            {!showLanguages ? (
              <>
                <button
                  onClick={() => setShowLanguages(true)}
                  className="w-full flex items-center justify-between px-3 py-2 font-label text-[13px] text-page-cream hover:bg-desk-surface-hover rounded-[6px] cursor-pointer transition-colors"
                >
                  <span>{t.nav.language}</span>
                  <ChevronRightIcon />
                </button>
                <div className="my-1 border-t border-hairline mx-2" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 font-label text-[13px] text-rust-danger hover:bg-desk-surface-hover rounded-[6px] cursor-pointer transition-colors"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLanguages(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 font-label text-[13px] text-page-cream-muted hover:text-page-cream hover:bg-desk-surface-hover rounded-[6px] cursor-pointer transition-colors"
                >
                  <ChevronLeftIcon />
                  <span>{t.nav.language}</span>
                </button>
                <div className="my-1 border-t border-hairline mx-2" />
                {(['pt-BR', 'en'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageSelect(lang)}
                    className={`w-full flex items-center justify-between px-3 py-2 font-label text-[13px] cursor-pointer hover:bg-desk-surface-hover rounded-[6px] transition-colors ${
                      language === lang ? 'text-oxblood-bright bg-oxblood-tint' : 'text-page-cream'
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
