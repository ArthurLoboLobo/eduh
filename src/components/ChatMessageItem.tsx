'use client';

import { memo, useMemo } from 'react';
import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import type { Translations } from '@/lib/i18n/pt-BR';

type ChatMessageItemProps = {
  message: UIMessage;
  isHovered: boolean;
  canUndo: boolean;
  isStreaming?: boolean;
  onHoverChange: (id: string | null) => void;
  onRequestUndo: (id: string) => void;
  t: Translations;
};

type StreamingMarkdownProps = {
  content: string;
};

function StreamingMarkdown({ content }: StreamingMarkdownProps) {
  return (
    <ReactMarkdown
      components={{
        code({ children, ...props }) {
          return (
            <code className="bg-page-cream/[0.08] px-1.5 py-0.5 rounded-md font-body text-[0.7556em]" {...props}>
              {children}
            </code>
          );
        },
        pre({ children }) {
          return (
            <pre className="my-4 overflow-x-auto rounded-md border border-hairline bg-code-surface p-4 font-mono text-[0.875rem] leading-relaxed">
              {children}
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ChatMessageItem({
  message,
  isHovered,
  canUndo,
  isStreaming = false,
  onHoverChange,
  onRequestUndo,
  t,
}: ChatMessageItemProps) {
  const textParts = message.parts?.filter((p) => p.type === 'text') ?? [];
  const textContent = textParts.map((p) => ('text' in p ? p.text : '')).join('');
  const hasToolCall =
    message.role === 'assistant' &&
    message.parts?.some((p) => typeof p.type === 'string' && p.type.startsWith('tool-'));
  const showToolIndicator = hasToolCall && !textContent;

  const renderedMarkdown = useMemo(() => {
    if (!textContent || isStreaming) return null;
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table({ children }) {
            return (
              <div className="markdown-table-scroll">
                <table>{children}</table>
              </div>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: '0.75rem', fontSize: '0.7222em', margin: '1rem 0', maxWidth: '100%', overflowX: 'auto' }}
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className="bg-page-cream/[0.08] px-1.5 py-0.5 rounded-md font-body text-[0.7556em]" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {textContent.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => `\n$$\n${content.trim()}\n$$\n`)}
      </ReactMarkdown>
    );
  }, [textContent, isStreaming]);

  if (!textContent && !showToolIndicator) return null;

  if (message.role === 'user') {
    return (
      <div
        data-role="user"
        className="flex flex-col items-end group relative mb-10 scroll-mt-24"
        onMouseEnter={() => onHoverChange(message.id)}
        onMouseLeave={() => onHoverChange(null)}
      >
        {canUndo && isHovered && (
          <div className="absolute top-0 -bottom-8 left-0 right-0 z-0" />
        )}

        <div
          data-user-message-bubble
          className="bg-desk-surface rounded-[14px] px-[20px] py-[14px] max-w-[85%] shadow-sm relative z-10"
        >
          <p
            data-user-message-body
            className="font-body text-[14px] sm:text-[15px] leading-relaxed text-page-cream whitespace-pre-wrap"
          >
            {textContent}
          </p>
        </div>

        {canUndo && isHovered && (
          <button
            onClick={() => onRequestUndo(message.id)}
            className="absolute -bottom-8 right-2 p-1.5 rounded-full text-page-cream-muted opacity-70 hover:opacity-100 hover:text-page-cream hover:bg-desk-surface-hover cursor-pointer animate-fade-in-up z-0 transition-all shadow-sm"
            title={t.chat.undo}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] min-w-0 overflow-hidden font-body-prose text-[14px] sm:text-[16px] leading-[1.65] text-page-cream prose-chat">
        {textContent && (
          isStreaming
            ? <StreamingMarkdown content={textContent} />
            : renderedMarkdown
        )}
        {showToolIndicator && (
          <div className="flex items-center gap-2.5 text-page-cream-muted font-label text-[13px] mt-2 mb-1 animate-fade-in-up w-fit pl-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-oxblood opacity-80">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="font-medium tracking-wide opacity-90">{t.chat.searchingMaterials}</span>
            <span className="flex gap-1 ml-0.5 items-center">
              <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-oxblood opacity-80" />
              <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-oxblood opacity-80" />
              <span className="jumping-dot w-1.5 h-1.5 rounded-full bg-oxblood opacity-80" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessageItem);
