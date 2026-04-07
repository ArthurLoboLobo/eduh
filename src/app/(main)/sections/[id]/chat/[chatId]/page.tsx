'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { useTranslation } from '@/lib/i18n';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import RefreshIcon from '@/components/ui/RefreshIcon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';
import { getWarningState, getWarningSeverity } from '@/lib/usage-warnings';
import { USAGE_WARNING_THRESHOLDS } from '@/config/ai';

type DbMessage = {
  id: number;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useParams();
  const chatId = typeof params?.chatId === 'string' ? params.chatId : '';

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [summarizedUpToMessageId, setSummarizedUpToMessageId] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const { user: currentUser } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessagesRef = useRef<UIMessage[]>([]);
  const userScrolledUpRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const warningStateRef = useRef<string | null>(null);
  const lastFetchDataRef = useRef<{ phase: 'best' | 'degraded' | 'blocked'; usagePercent: number } | null>(null);
  const initialWarningShownRef = useRef(false);
  const userPlanRef = useRef<'free' | 'pro' | null>(null);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: `/api/chats/${chatId}/messages` }),
    messages: initialMessagesRef.current,
    onError(error) {
      // Bounce back: remove optimistic user message, restore to input
      let bouncedText = '';
      setMessages(prev => {
        const lastUserMsg = [...prev].reverse().find(m => m.role === 'user');
        bouncedText = lastUserMsg?.parts?.find(p => p.type === 'text')?.text ?? '';
        return lastUserMsg ? prev.filter(m => m.id !== lastUserMsg.id) : prev;
      });
      setInputValue(bouncedText);

      // Auto-resize textarea (same pattern as undo handler)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
      }, 0);

      // Error-specific toast
      const errStr = error.message ?? '';
      if (errStr.includes('USAGE_LIMIT_REACHED')) {
        showToast(
          <span>{t.subscription.usageLimitFree}{' '}<Link href="/subscription" className="underline hover:text-primary-text">{t.subscription.subscribeToPro}</Link></span>,
          'error',
        );
      } else if (errStr.includes('RATE_LIMITED')) {
        showToast(t.chat.rateLimited, 'error');
      } else {
        showToast(t.chat.streamError, 'error');
      }
    },
    async onFinish() {
      // Refetch messages to sync DB IDs for undo
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`);
        if (res.ok) {
          const data = await res.json();
          const dbMessages = data.messages as DbMessage[];
          setSummarizedUpToMessageId(data.summarizedUpToMessageId ?? 0);
          setMessages(
            dbMessages.map((m) => ({
              id: String(m.id),
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            })),
          );

          // Usage warning check
          if (userPlanRef.current) {
            const newState = getWarningState(data.usagePercent, userPlanRef.current, data.phase);
            if (getWarningSeverity(newState) > getWarningSeverity(warningStateRef.current)) {
              showWarningToast(newState, userPlanRef.current);
            }
            warningStateRef.current = newState;
          }
        }
      } catch {
        // silent — IDs just won't be synced
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Keep userPlanRef in sync (avoids stale closure in onFinish)
  useEffect(() => {
    if (currentUser) {
      userPlanRef.current = currentUser.plan;
    }
  }, [currentUser]);

  function showWarningToast(state: string | null, plan: 'free' | 'pro') {
    if (!state) return;

    if (state === 'degraded') {
      showToast(plan === 'free' ? t.subscription.freeDegraded : t.subscription.proDegraded, 'warning');
      return;
    }

    const [phase, thresholdStr] = state.split(':');
    const threshold = Number(thresholdStr);
    const sorted = [...USAGE_WARNING_THRESHOLDS].sort((a, b) => a - b);
    const isHighest = threshold === sorted[sorted.length - 1];

    let template: string;
    if (plan === 'pro') {
      template = t.subscription.usageWarningPro;
    } else if (phase === 'best') {
      template = t.subscription.usageWarningFreeBest;
    } else if (isHighest) {
      template = t.subscription.usageWarningFreeDegradedFinal;
    } else {
      template = t.subscription.usageWarningFreeDegraded;
    }
    showToast(template.replace('{percent}', String(threshold)), 'warning');
  }

  // Initial fetch
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const dbMessages = data.messages as DbMessage[];
        setSummarizedUpToMessageId(data.summarizedUpToMessageId ?? 0);

        const uiMessages: UIMessage[] = dbMessages.map((m) => ({
          id: String(m.id),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          parts: [{ type: 'text' as const, text: m.content }],
        }));

        if (!cancelled) {
          initialMessagesRef.current = uiMessages;
          setMessages(uiMessages);
          lastFetchDataRef.current = { phase: data.phase, usagePercent: data.usagePercent };
          setInitialLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setInitialLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [chatId, setMessages]);

  // Show warning toast on initial load (once both user data and messages are ready)
  useEffect(() => {
    if (initialLoading || !currentUser || initialWarningShownRef.current) return;
    if (lastFetchDataRef.current) {
      const { phase, usagePercent } = lastFetchDataRef.current;
      const state = getWarningState(usagePercent, currentUser.plan, phase);
      warningStateRef.current = state;
      if (state !== null) {
        showWarningToast(state, currentUser.plan);
      }
      initialWarningShownRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading, currentUser]);

  // Auto-scroll: scroll to bottom on new messages, but stop if user scrolls up
  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessage) {
      userScrolledUpRef.current = false;
    }

    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Detect user scrolling up during streaming
  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (scrollBottom > 100) {
        userScrolledUpRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  // Send message
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    userScrolledUpRef.current = false;
    sendMessage({ text: trimmed });
  }, [inputValue, isLoading, sendMessage]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Undo
  const handleUndo = useCallback(async () => {
    if (!undoTargetId) return;
    setIsUndoing(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/undo/${undoTargetId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'CANNOT_UNDO_SUMMARIZED') {
          showToast(t.chat.cannotUndoSummarized, 'info');
        } else {
          showToast(t.chat.undoError, 'error');
        }
        setUndoTargetId(null);
        return;
      }
      const { content } = await res.json();
      const msgIndex = messages.findIndex((m) => m.id === undoTargetId);
      if (msgIndex >= 0) {
        setMessages(messages.slice(0, msgIndex));
      }
      setInputValue(content);
      setUndoTargetId(null);
      
      // Auto-resize textarea after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
      }, 0);
    } catch {
      showToast(t.chat.undoError, 'error');
      setUndoTargetId(null);
    } finally {
      setIsUndoing(false);
    }
  }, [chatId, messages, setMessages, showToast, t, undoTargetId]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <Spinner size={28} />
        <p className="mt-3 text-sm text-muted-text">{t.chat.loading}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <p className="text-sm text-muted-text mb-3">{t.chat.errorLoading}</p>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          <RefreshIcon size={16} />
          {t.chat.retry}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex flex-col min-h-[calc(100vh-12rem)] w-full animate-fade-in-up">
        {/* Messages */}
      <div className="flex-1 px-4 py-2 space-y-6 pb-32 max-w-3xl mx-auto w-full">
        {messages.map((message) => {
          const textParts = message.parts?.filter((p) => p.type === 'text') ?? [];
          const textContent = textParts.map((p) => ('text' in p ? p.text : '')).join('');
          const hasToolCall = message.role === 'assistant' && message.parts?.some(
            (p) => typeof p.type === 'string' && p.type.startsWith('tool-'),
          );
          const showToolIndicator = hasToolCall && !textContent;

          if (!textContent && !showToolIndicator) return null;

          if (message.role === 'user') {
            const canUndo = Number(message.id) > summarizedUpToMessageId && !isLoading;
            
            return (
              <div
                key={message.id}
                className="flex flex-col items-end group relative mb-10"
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {/* Invisible bridge to keep hover active between bubble and undo button */}
                {canUndo && hoveredMessageId === message.id && (
                  <div className="absolute top-0 -bottom-8 left-0 right-0 z-0" />
                )}
                
                <div className="bg-surface rounded-3xl px-5 py-3 max-w-[85%] shadow-sm relative z-10">
                  <p className="text-[15px] leading-relaxed text-primary-text whitespace-pre-wrap">{textContent}</p>
                </div>
                
                {canUndo && hoveredMessageId === message.id && (
                  <button
                    onClick={() => setUndoTargetId(message.id)}
                    className="absolute -bottom-8 right-2 p-1.5 rounded-full text-muted-text opacity-70 hover:opacity-100 hover:text-primary-text hover:bg-surface-hover/80 cursor-pointer animate-fade-in-up z-0 transition-all shadow-sm"
                    title={t.chat.undo}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14 4 9l5-5"/>
                      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          }

          return (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[95%] text-[15px] leading-relaxed text-primary-text prose-chat">
                {textContent && (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        if (match) {
                          return (
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ borderRadius: '0.75rem', fontSize: '0.8125rem', margin: '1rem 0' }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          );
                        }
                        return (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-[0.8125rem]" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {textContent.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => `\n$$\n${content.trim()}\n$$\n`)}
                  </ReactMarkdown>
                )}
                {showToolIndicator && (
                  <div className="flex items-center gap-2.5 text-muted-text text-[13px] mt-2 mb-1 animate-fade-in-up w-fit pl-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent-blue opacity-80">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span className="font-medium tracking-wide opacity-90">{t.chat.searchingMaterials}</span>
                    <span className="flex gap-1 ml-0.5 items-center">
                      <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-accent-blue opacity-80" />
                      <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-accent-blue opacity-80" />
                      <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-accent-blue opacity-80" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <Spinner size={18} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 inset-x-0 px-4 flex justify-center pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-40">
        <div className="relative w-full max-w-3xl flex items-end bg-surface/80 backdrop-blur-xl border border-border-subtle rounded-[32px] p-2 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] focus-within:ring-1 focus-within:ring-accent-blue/40 focus-within:border-accent-blue/60 transition-all pointer-events-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.inputPlaceholder}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 mt-2 mb-2 text-[15px] leading-relaxed text-primary-text placeholder:text-muted-text focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="p-2.5 rounded-full bg-accent-blue hover:bg-accent-blue-hover text-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-0.5 shrink-0 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!undoTargetId}
        onClose={() => setUndoTargetId(null)}
        onConfirm={handleUndo}
        title={t.chat.undoConfirmTitle}
        message={t.chat.undoConfirmMessage}
        confirmLabel={t.chat.undoConfirmButton}
        cancelLabel={t.chat.undoCancelButton}
        loading={isUndoing}
      />
    </>
  );
}
