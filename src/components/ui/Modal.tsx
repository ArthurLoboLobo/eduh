'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-lamp-night/85 backdrop-blur-[2px] animate-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`
          relative z-10 w-full m-auto
          bg-desk-surface rounded-[14px] p-[28px] modal-lift animate-modal-pop
          ${className || 'max-w-md'}
        `}
      >
        <div className="flex items-start justify-between mb-4">
          {title && <h2 className="font-title text-[1.25rem] text-page-cream">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto text-page-cream-muted hover:text-page-cream cursor-pointer"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {title && <hr className="w-full border-0 border-t border-hairline mb-5 -mt-1" />}
        <div className="text-page-cream font-body text-[15px]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
