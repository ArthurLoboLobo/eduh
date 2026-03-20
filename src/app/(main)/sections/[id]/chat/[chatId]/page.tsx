'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { useToast } from '@/components/ui/Toast';

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
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialMessagesRef = useRef<UIMessage[]>([]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: `/api/chats/${chatId}/messages` }),
    messages: initialMessagesRef.current,
    onError(error) {
      if (error.message?.includes('429') || error.message?.includes('RATE_LIMITED')) {
        setRateLimitMsg(t.chat.rateLimited);
        setTimeout(() => setRateLimitMsg(''), 5000);
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
        }
      } catch {
        // silent — IDs just won't be synced
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  const handleUndo = useCallback(async (messageId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/undo/${messageId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'CANNOT_UNDO_SUMMARIZED') {
          showToast(t.chat.cannotUndoSummarized, 'info');
          return;
        }
        showToast(t.chat.undoError, 'error');
        return;
      }
      const { content } = await res.json();
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex >= 0) {
        setMessages(messages.slice(0, msgIndex));
      }
      setInputValue(content);
    } catch {
      showToast(t.chat.undoError, 'error');
    }
  }, [chatId, messages, setMessages, showToast, t]);

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
    <div className="relative flex flex-col h-[calc(100vh-5.5rem)] w-full animate-fade-in-up">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-32 max-w-3xl mx-auto w-full">
        {messages.map((message) => {
          const textParts = message.parts?.filter((p) => p.type === 'text') ?? [];
          const textContent = textParts.map((p) => ('text' in p ? p.text : '')).join('');

          if (!textContent) return null;

          if (message.role === 'user') {
            return (
              <div
                key={message.id}
                className="flex justify-end group"
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {hoveredMessageId === message.id && Number(message.id) > summarizedUpToMessageId && !isLoading && (
                  <button
                    onClick={() => handleUndo(message.id)}
                    className="self-center mr-2 p-1 rounded text-muted-text hover:text-primary-text hover:bg-white/5 cursor-pointer"
                    title="Undo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                )}
                <div className="bg-surface rounded-3xl px-5 py-3 max-w-[85%] shadow-sm">
                  <p className="text-[15px] leading-relaxed text-primary-text whitespace-pre-wrap">{textContent}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[95%] text-[15px] leading-relaxed text-primary-text prose-chat">
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
                  {textContent}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <Spinner size={18} />
          </div>
        )}

        {rateLimitMsg && (
          <div className="text-center">
            <p className="text-xs text-muted-text">{rateLimitMsg}</p>
          </div>
        )}

        {chatError && !rateLimitMsg && (
          <div className="text-center">
            <p className="text-xs text-danger-red">{t.chat.streamError}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="absolute bottom-4 inset-x-0 px-4 flex justify-center pb-2 pointer-events-none">
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
    </div>
  );
}
