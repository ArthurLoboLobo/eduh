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
  sendDisabled: boolean;
  onSend: (text: string) => void;
  onHeightChange: (height: number) => void;
  placeholder: string;
};

const MAX_TEXTAREA_HEIGHT = 200;

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
}

const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ sendDisabled, onSend, onHeightChange, placeholder }, ref) {
    const [inputValue, setInputValue] = useState('');
    const [isCoarsePointer, setIsCoarsePointer] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
    }, []);

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
      if (!trimmed || sendDisabled) return;
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
      onSend(trimmed);
    }, [inputValue, sendDisabled, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isCoarsePointer) {
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend, isCoarsePointer],
    );

    return (
      <div
        ref={containerRef}
        data-chat-composer
        className="fixed bottom-0 inset-x-0 px-4 flex justify-center pb-6 pt-12 bg-gradient-to-t from-lamp-night via-lamp-night/95 to-transparent pointer-events-none z-40"
      >
        <div className="relative w-full max-w-3xl flex items-end bg-desk-surface border border-hairline rounded-[14px] p-2 pr-3 modal-lift focus-within:input-focus-glow transition-all pointer-events-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none overflow-y-hidden bg-transparent px-4 mt-2 mb-2 font-body text-[14px] sm:text-[15px] leading-relaxed text-page-cream placeholder:text-page-cream-faint focus:outline-none"
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={sendDisabled || !inputValue.trim()}
            className="p-2.5 rounded-[6px] bg-oxblood hover:bg-oxblood-bright text-page-cream disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-0.5 shrink-0 transition-colors"
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
