'use client';

import { memo } from 'react';
import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
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
  onHoverChange: (id: string | null) => void;
  onRequestUndo: (id: string) => void;
  t: Translations;
};

function ChatMessageItem({
  message,
  isHovered,
  canUndo,
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

        <div className="bg-surface rounded-3xl px-5 py-3 max-w-[85%] shadow-sm relative z-10">
          <p className="text-[15px] leading-relaxed text-primary-text whitespace-pre-wrap">{textContent}</p>
        </div>

        {canUndo && isHovered && (
          <button
            onClick={() => onRequestUndo(message.id)}
            className="absolute -bottom-8 right-2 p-1.5 rounded-full text-muted-text opacity-70 hover:opacity-100 hover:text-primary-text hover:bg-surface-hover/80 cursor-pointer animate-fade-in-up z-0 transition-all shadow-sm"
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
      <div className="max-w-[95%] min-w-0 overflow-hidden text-[15px] leading-relaxed text-primary-text prose-chat">
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
                      customStyle={{ borderRadius: '0.75rem', fontSize: '0.8125rem', margin: '1rem 0', maxWidth: '100%', overflowX: 'auto' }}
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
}

export default memo(ChatMessageItem);
