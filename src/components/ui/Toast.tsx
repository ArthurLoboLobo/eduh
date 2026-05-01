'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastVariant = 'error' | 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  message: ReactNode;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: ReactNode, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: ReactNode, variant: ToastVariant = 'error') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const variantClass: Record<ToastVariant, string> = {
    error: 'bg-rust-danger/10 border border-rust-danger/30 text-rust-danger',
    success: 'bg-forest-success/10 border border-forest-success/30 text-forest-success',
    info: 'bg-desk-surface border border-hairline text-page-cream-muted',
    warning: 'bg-warning-amber/10 border border-warning-amber/30 text-warning-amber',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-[10px] px-5 py-3.5 font-label text-[13px] max-w-sm bg-lamp-night shadow-lg animate-fade-in-up ${variantClass[toast.variant]}`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
