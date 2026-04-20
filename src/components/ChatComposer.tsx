'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export type ChatComposerHandle = {
  setValue: (text: string) => void;
  focus: () => void;
};

type ChatComposerProps = {
  disabled: boolean;
  onSend: (text: string) => void;
  onHeightChange: (height: number) => void;
  placeholder: string;
};

const MAX_TEXTAREA_HEIGHT = 200;

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
}

const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ disabled, onSend, onHeightChange, placeholder }, ref) {
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        setValue(text: string) {
          setInputValue(text);
          setTimeout(() => {
            if (textareaRef.current) resizeTextarea(textareaRef.current);
          }, 0);
        },
        focus() {
          textareaRef.current?.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const update = () => onHeightChange(el.offsetHeight);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(el);
      window.addEventListener('resize', update);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', update);
      };
    }, [onHeightChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      resizeTextarea(e.target);
    }, []);

    const handleSend = useCallback(() => {
      const trimmed = inputValue.trim();
      if (!trimmed || disabled) return;
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onSend(trimmed);
    }, [inputValue, disabled, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend],
    );

    return (
      <div
        ref={containerRef}
        className="fixed bottom-0 inset-x-0 px-4 flex justify-center pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-40"
      >
        <div className="relative w-full max-w-3xl flex items-end bg-surface/80 backdrop-blur-xl border border-border-subtle rounded-[32px] p-2 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] focus-within:ring-1 focus-within:ring-accent-blue/40 focus-within:border-accent-blue/60 transition-all pointer-events-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 mt-2 mb-2 text-[15px] leading-relaxed text-primary-text placeholder:text-muted-text focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="p-2.5 rounded-full bg-accent-blue hover:bg-accent-blue-hover text-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-0.5 shrink-0 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    );
  },
);

export default ChatComposer;
