'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useTranslation } from '@/lib/i18n';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import RefreshIcon from '@/components/ui/RefreshIcon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import ChatComposer, { type ChatComposerHandle } from '@/components/ChatComposer';
import ChatMessageItem from '@/components/ChatMessageItem';
import ChatInterruptedRetry from '@/components/ChatInterruptedRetry';
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

const CHAT_FIXED_CHROME_HEIGHT = 56 + 48;
const CHAT_TOP_READING_GAP = 12;
const LONG_USER_VISIBLE_LINES = 3;
const MIN_ASSISTANT_PREVIEW_HEIGHT = 120;
const MIN_ASSISTANT_PREVIEW_HEIGHT_MOBILE = 88;
const SCROLL_CUSHION_BUFFER = 2;

function getLatestUserMessageElement() {
  const userMessages = document.querySelectorAll<HTMLElement>('[data-role="user"]');
  return userMessages[userMessages.length - 1] ?? null;
}

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getDocumentScrollHeight() {
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

function getMaxScrollY() {
  return Math.max(0, getDocumentScrollHeight() - window.innerHeight);
}

function getComposerHeight(fallbackHeight: number) {
  const composer = document.querySelector<HTMLElement>('[data-chat-composer]');
  return composer?.getBoundingClientRect().height ?? fallbackHeight;
}

function getLineHeight(el: HTMLElement | null) {
  if (!el) return 24;
  const style = window.getComputedStyle(el);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight)) return lineHeight;
  const fontSize = Number.parseFloat(style.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.55 : 24;
}

function getSendScrollTarget(messageEl: HTMLElement, fallbackComposerHeight: number) {
  const viewportHeight = getViewportHeight();
  const topOffset = CHAT_FIXED_CHROME_HEIGHT + CHAT_TOP_READING_GAP;
  const composerHeight = getComposerHeight(fallbackComposerHeight);
  const minAssistantPreview =
    viewportHeight < 720 ? MIN_ASSISTANT_PREVIEW_HEIGHT_MOBILE : MIN_ASSISTANT_PREVIEW_HEIGHT;
  const bodyEl = messageEl.querySelector<HTMLElement>('[data-user-message-body]');
  const bubbleEl = messageEl.querySelector<HTMLElement>('[data-user-message-bubble]') ?? messageEl;
  const messageRect = messageEl.getBoundingClientRect();
  const bubbleRect = bubbleEl.getBoundingClientRect();
  const bubbleStyle = window.getComputedStyle(bubbleEl);
  const lineHeight = getLineHeight(bodyEl);
  const bubbleBottomPadding = Number.parseFloat(bubbleStyle.paddingBottom) || 0;
  const visibleTailHeight = lineHeight * LONG_USER_VISIBLE_LINES + bubbleBottomPadding;
  const availableUserHeight = Math.max(
    visibleTailHeight,
    viewportHeight - topOffset - composerHeight - minAssistantPreview,
  );
  const shouldAnchorTail =
    bubbleRect.height > availableUserHeight && bubbleRect.height > visibleTailHeight;
  const anchorViewportY = shouldAnchorTail
    ? bubbleRect.bottom - visibleTailHeight
    : messageRect.top;

  return Math.max(0, window.scrollY + anchorViewportY - topOffset);
}

export default function ChatPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useParams();
  const chatId = typeof params?.chatId === 'string' ? params.chatId : '';

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [summarizedUpToMessageId, setSummarizedUpToMessageId] = useState(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [scrollCushionHeight, setScrollCushionHeight] = useState(0);
  const [sendScrollVersion, setSendScrollVersion] = useState(0);

  const { user: currentUser } = useUser();
  const composerRef = useRef<ChatComposerHandle>(null);
  const inputHeightRef = useRef(0);
  const initialMessagesRef = useRef<UIMessage[]>([]);
  const initialGreetingStartedRef = useRef(false);
  const initialBottomScrollPendingRef = useRef(false);
  const warningStateRef = useRef<string | null>(null);
  const lastFetchDataRef = useRef<{ phase: 'best' | 'degraded' | 'blocked'; usagePercent: number } | null>(null);
  const initialWarningShownRef = useRef(false);
  const userPlanRef = useRef<'free' | 'pro' | null>(null);
  const pendingSendScrollRef = useRef<{ previousLastUserId: string | null } | null>(null);

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
      pendingSendScrollRef.current = null;
      setScrollCushionHeight(0);

      // Bounce back: remove optimistic user message, restore to input
      let bouncedText = '';
      setMessages(prev => {
        const lastUserMsg = [...prev].reverse().find(m => m.role === 'user');
        bouncedText = lastUserMsg?.parts?.find(p => p.type === 'text')?.text ?? '';
        return lastUserMsg ? prev.filter(m => m.id !== lastUserMsg.id) : prev;
      });
      composerRef.current?.setValue(bouncedText);

      // Error-specific toast
      const errStr = error.message ?? '';
      if (errStr.includes('USAGE_LIMIT_REACHED')) {
        showToast(
          <span>{t.subscription.usageLimitFree}{' '}<Link href="/subscription" className="underline hover:text-page-cream">{t.subscription.subscribeToPro}</Link></span>,
          'error',
        );
      } else if (errStr.includes('RATE_LIMITED')) {
        showToast(t.chat.rateLimited, 'error');
      } else {
        showToast(t.chat.streamError, 'error');
      }
    },
    async onFinish({ isAbort, isError }) {
      if (isAbort || isError) return;

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
      } finally {
        pendingSendScrollRef.current = null;
        setScrollCushionHeight(0);
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

    if (state === 'blocked') {
      showToast(
        <span>{t.subscription.usageLimitFree}{' '}<Link href="/subscription" className="underline hover:text-primary-text">{t.subscription.subscribeToPro}</Link></span>,
        'error',
      );
      return;
    }

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
          initialBottomScrollPendingRef.current = uiMessages.length > 0;
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

  useLayoutEffect(() => {
    if (
      !initialBottomScrollPendingRef.current ||
      initialLoading ||
      messages.length === 0 ||
      inputHeight <= 0
    ) {
      return;
    }

    initialBottomScrollPendingRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: getMaxScrollY(), behavior: 'auto' });
      });
    });
  }, [initialLoading, inputHeight, messages.length]);

  // Empty chats stream their initial assistant greeting through the normal chat transport.
  useEffect(() => {
    if (initialLoading || loadError || !chatId || messages.length > 0 || initialGreetingStartedRef.current) {
      return;
    }

    initialGreetingStartedRef.current = true;
    void sendMessage(undefined, { body: { initialGreeting: true } });
  }, [chatId, initialLoading, loadError, messages.length, sendMessage]);

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

  const handleHeightChange = useCallback((h: number) => {
    inputHeightRef.current = h;
    setInputHeight(h);
  }, []);

  const armSendScroll = useCallback(() => {
    const previousLastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id ?? null;
    pendingSendScrollRef.current = { previousLastUserId };
    setSendScrollVersion((version) => version + 1);
  }, [messages]);

  useLayoutEffect(() => {
    const pendingScroll = pendingSendScrollRef.current;
    if (!pendingScroll) return;

    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!latestUserMessage || latestUserMessage.id === pendingScroll.previousLastUserId) return;

    const latestUserEl = getLatestUserMessageElement();
    if (!latestUserEl) return;

    const targetY = getSendScrollTarget(latestUserEl, inputHeightRef.current);
    const requiredCushion = Math.ceil(
      Math.max(0, targetY - getMaxScrollY() + SCROLL_CUSHION_BUFFER),
    );

    if (requiredCushion > scrollCushionHeight + SCROLL_CUSHION_BUFFER) {
      setScrollCushionHeight(requiredCushion);
      return;
    }

    pendingSendScrollRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  }, [messages, scrollCushionHeight, sendScrollVersion]);

  // Send message (called by ChatComposer)
  const handleSendMessage = useCallback((text: string) => {
    armSendScroll();
    sendMessage({ text });
  }, [armSendScroll, sendMessage]);

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
      composerRef.current?.setValue(content);
      setUndoTargetId(null);
    } catch {
      showToast(t.chat.undoError, 'error');
      setUndoTargetId(null);
    } finally {
      setIsUndoing(false);
    }
  }, [chatId, messages, setMessages, showToast, t, undoTargetId]);

  // Retry an orphan user message left behind by a mid-stream reload.
  // Reuses the undo endpoint to delete the message and recover its text,
  // then re-sends as a fresh request.
  const handleRetry = useCallback(async (messageId: string) => {
    if (isRetrying || isLoading) return;
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/undo/${messageId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'CANNOT_UNDO_SUMMARIZED') {
          showToast(t.chat.cannotUndoSummarized, 'info');
        } else {
          showToast(t.chat.streamError, 'error');
        }
        return;
      }
      const { content } = await res.json();
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex >= 0) setMessages(messages.slice(0, msgIndex));
      armSendScroll();
      sendMessage({ text: content });
    } catch {
      showToast(t.chat.streamError, 'error');
    } finally {
      setIsRetrying(false);
    }
  }, [armSendScroll, chatId, isLoading, isRetrying, messages, sendMessage, setMessages, showToast, t]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <Spinner size={28} />
        <p className="mt-3 font-body text-[14px] text-page-cream-muted">{t.chat.loading}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5.5rem)]">
        <p className="font-body text-[14px] text-page-cream-muted mb-3">{t.chat.errorLoading}</p>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          <RefreshIcon size={16} />
          {t.chat.retry}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex flex-col min-h-[calc(100vh-12rem)] w-full overflow-x-hidden animate-fade-in-up">
        {/* Messages */}
      <div className="flex-1 px-4 py-2 space-y-6 max-w-3xl mx-auto w-full">
        {messages.map((message, idx) => {
          const isLast = idx === messages.length - 1;
          const numericId = Number(message.id);
          const isOrphan =
            isLast &&
            message.role === 'user' &&
            !isLoading &&
            !isRetrying &&
            !Number.isNaN(numericId) &&
            numericId > summarizedUpToMessageId;
          const isStreaming =
            isLast && message.role === 'assistant' && status === 'streaming';
          return (
            <div key={message.id}>
              <ChatMessageItem
                message={message}
                isHovered={hoveredMessageId === message.id}
                canUndo={
                  message.role === 'user' &&
                  numericId > summarizedUpToMessageId &&
                  !isLoading &&
                  !isOrphan
                }
                isStreaming={isStreaming}
                onHoverChange={setHoveredMessageId}
                onRequestUndo={setUndoTargetId}
                t={t}
              />
              {isOrphan && (
                <ChatInterruptedRetry
                  retrying={isRetrying}
                  onRetry={() => handleRetry(message.id)}
                  t={t}
                />
              )}
            </div>
          );
        })}

        {isLoading && messages.length === 0 && (
          <div className="flex justify-start">
            <Spinner size={18} />
          </div>
        )}

        {(isLoading || isRetrying) && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <Spinner size={18} />
          </div>
        )}
      </div>
      </div>

      {/* Spacer: reserves scroll room so messages can clear the fixed composer */}
      <div aria-hidden style={{ height: Math.max(inputHeight - 16, 0) }} />

      <div aria-hidden style={{ height: scrollCushionHeight }} />

      <ChatComposer
        ref={composerRef}
        sendDisabled={isLoading}
        onSend={handleSendMessage}
        onHeightChange={handleHeightChange}
        placeholder={t.chat.inputPlaceholder}
      />

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
