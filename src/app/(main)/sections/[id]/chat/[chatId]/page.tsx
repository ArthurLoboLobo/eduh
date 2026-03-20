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

type DbMessage = {
  id: number;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const { t } = useTranslation();
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
          alert(t.chat.cannotUndoSummarized);
          return;
        }
        alert(t.chat.undoError);
        return;
      }
      const { content } = await res.json();
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex >= 0) {
        setMessages(messages.slice(0, msgIndex));
      }
      setInputValue(content);
    } catch {
      alert(t.chat.undoError);
    }
  }, [chatId, messages, setMessages, t]);

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
          {t.chat.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-3xl mx-auto w-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
                <div className="bg-surface rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm text-primary-text whitespace-pre-wrap">{textContent}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[90%] text-sm text-primary-text prose-chat">
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
                            customStyle={{ borderRadius: '0.375rem', fontSize: '0.8125rem' }}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.8125rem]" {...props}>
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
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.inputPlaceholder}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary-text placeholder:text-muted-text focus:outline-none focus:border-border-hover disabled:opacity-50"
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="p-2 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
