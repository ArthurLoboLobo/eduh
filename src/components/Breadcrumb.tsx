'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface Section {
  id: string;
  name: string;
}

interface ChatEntry {
  id: string;
  name: string;
}

export default function Breadcrumb() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  const [sectionOpen, setSectionOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const sectionDropdownRef = useRef<HTMLDivElement>(null);
  const chatDropdownRef = useRef<HTMLDivElement>(null);

  const sectionId = typeof params?.id === 'string' ? params.id : null;
  const chatId = typeof params?.chatId === 'string' ? params.chatId : null;
  const currentSection = sectionId ? sections.find((s) => s.id === sectionId) : null;
  const currentChat = chatId ? chats.find((c) => c.id === chatId) : null;

  useEffect(() => {
    fetch('/api/sections')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sections) setSections(data.sections);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!sectionId || !chatId) return;
    fetch(`/api/sections/${sectionId}/topics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list: ChatEntry[] = [];
        if (data.topics) {
          for (const topic of data.topics) {
            if (topic.chat_id) {
              list.push({ id: topic.chat_id, name: topic.title });
            }
          }
        }
        if (data.revisionChatId) {
          list.push({ id: data.revisionChatId, name: t.studying.revision });
        }
        setChats(list);
      })
      .catch(() => {});
  }, [sectionId, chatId, t.studying.revision]);

  const isOnDashboard = pathname === '/dashboard';
  const isOnSubscription = pathname === '/subscription';
  const isOnSection = !!sectionId;
  const isOnChat = !!chatId;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setSectionOpen(false);
      }
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSectionSelect(id: string) {
    setSectionOpen(false);
    router.push(`/sections/${id}`);
  }

  function handleChatSelect(id: string) {
    setChatOpen(false);
    router.push(`/sections/${sectionId}/chat/${id}`);
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

        {/* Subscription segment */}
        {isOnSubscription && (
          <>
            <span className="text-muted-text select-none">›</span>
            <span className="text-primary-text">{t.subscription.title}</span>
          </>
        )}

        {/* Section segment */}
        {isOnSection && (
          <>
            <span className="text-muted-text select-none">›</span>
            <div className="relative" ref={sectionDropdownRef}>
              <button
                onClick={() => {
                  setSectionOpen((v) => !v);
                  setChatOpen(false);
                }}
                className={`flex items-center gap-1 min-w-0 max-w-[10rem] sm:max-w-xs hover:text-accent-blue cursor-pointer ${
                  isOnChat ? 'text-muted-text' : 'text-primary-text'
                }`}
                aria-expanded={sectionOpen}
              >
                <span className="truncate">{currentSection?.name ?? sectionId}</span>
                <ChevronDownIcon />
              </button>

              {sectionOpen && sections.length > 0 && (
                <div className="absolute left-0 top-8 min-w-56 max-w-[calc(100vw-2rem)] sm:max-w-sm bg-surface border border-border-subtle rounded-2xl p-1 shadow-2xl">
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

        {/* Chat segment */}
        {isOnChat && (
          <>
            <span className="text-muted-text select-none">›</span>
            <div className="relative" ref={chatDropdownRef}>
              <button
                onClick={() => {
                  setChatOpen((v) => !v);
                  setSectionOpen(false);
                }}
                className="flex items-center gap-1 min-w-0 max-w-[10rem] sm:max-w-xs text-primary-text hover:text-accent-blue cursor-pointer"
                aria-expanded={chatOpen}
              >
                <span className="truncate">{currentChat?.name ?? chatId}</span>
                <ChevronDownIcon />
              </button>

              {chatOpen && chats.length > 0 && (
                <div className="absolute right-0 top-8 min-w-56 max-w-[calc(100vw-2rem)] sm:max-w-sm bg-surface border border-border-subtle rounded-2xl p-1 shadow-2xl">
                  {chats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleChatSelect(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm truncate cursor-pointer hover:bg-surface-hover rounded-xl transition-colors ${
                        c.id === chatId ? 'text-accent-blue bg-accent-surface' : 'text-primary-text'
                      }`}
                    >
                      {c.name}
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
