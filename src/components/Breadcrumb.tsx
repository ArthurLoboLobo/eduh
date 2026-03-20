'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface Section {
  id: string;
  name: string;
}

export default function Breadcrumb() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sectionId = typeof params?.id === 'string' ? params.id : null;
  const currentSection = sectionId ? sections.find((s) => s.id === sectionId) : null;

  useEffect(() => {
    fetch('/api/sections')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sections) setSections(data.sections);
      })
      .catch(() => {});
  }, [pathname]);

  const isOnDashboard = pathname === '/dashboard';
  const isOnSection = !!sectionId;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSectionSelect(id: string) {
    setOpen(false);
    router.push(`/sections/${id}`);
  }

  return (
    <div className="fixed top-14 inset-x-0 z-30 h-12 bg-background/80 backdrop-blur-md border-b border-border-subtle flex items-center px-8">
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        {/* Dashboard segment */}
        {isOnDashboard ? (
          <span className="text-primary-text">{t.nav.dashboard}</span>
        ) : (
          <Link href="/dashboard" className="text-muted-text hover:text-primary-text">
            {t.nav.dashboard}
          </Link>
        )}

        {/* Section segment */}
        {isOnSection && (
          <>
            <span className="text-muted-text select-none">›</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-primary-text hover:text-accent-blue cursor-pointer"
                aria-expanded={open}
              >
                <span>{currentSection?.name ?? sectionId}</span>
                <ChevronDownIcon />
              </button>

              {open && sections.length > 0 && (
                <div className="absolute left-0 top-8 min-w-56 max-w-sm bg-surface border border-border-subtle rounded-2xl p-1 shadow-2xl">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSectionSelect(s.id)}
                      className={`w-full text-left px-3 py-2 text-sm truncate cursor-pointer hover:bg-surface-hover rounded-xl transition-colors ${
                        s.id === sectionId ? 'text-accent-blue bg-accent-surface' : 'text-primary-text'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </nav>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
