'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Checkbox from '@/components/ui/Checkbox';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import RefreshIcon from '@/components/ui/RefreshIcon';
import { useToast } from '@/components/ui/Toast';

interface TopicWithChatInfo {
  id: string;
  title: string;
  order: number;
  is_completed: boolean;
  chat_id: string;
  message_count: number;
  subtopics: { id: string; text: string; order: number }[];
}

interface StudyingViewProps {
  sectionId: string;
}

export default function StudyingView({ sectionId }: StudyingViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();

  const [topics, setTopics] = useState<TopicWithChatInfo[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [revisionChatId, setRevisionChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const inFlightToggles = useRef<Set<string>>(new Set());

  async function fetchTopics() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/sections/${sectionId}/topics`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTopics(data.topics);
      setProgress(data.progress);
      setRevisionChatId(data.revisionChatId);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTopics();
  }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(topicId: string) {
    if (inFlightToggles.current.has(topicId)) return;

    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    const optimisticCompleted = !topic.is_completed;
    inFlightToggles.current.add(topicId);

    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, is_completed: optimisticCompleted } : t)),
    );
    setProgress((prev) => ({
      ...prev,
      completed: prev.completed + (optimisticCompleted ? 1 : -1),
    }));

    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, is_completed: topic.is_completed } : t)),
      );
      setProgress((prev) => ({
        ...prev,
        completed: prev.completed + (optimisticCompleted ? -1 : 1),
      }));
      showToast(t.errors.UNKNOWN);
    } finally {
      inFlightToggles.current.delete(topicId);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <p className="text-sm text-muted-text">{t.studying.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-text">{t.studying.errorLoading}</p>
        <Button variant="ghost" onClick={fetchTopics}>
          <RefreshIcon size={16} />
          {t.studying.retry}
        </Button>
      </div>
    );
  }

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-10 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-br from-primary-text to-muted-text bg-clip-text text-transparent tracking-tight">
          {t.studying.title}
        </h1>
      </div>

      {/* Progress Dashboard Widget */}
      <div className="bg-surface/60 backdrop-blur-md border border-border-subtle rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
           <h2 className="text-base font-semibold text-primary-text">{t.studying.progressTitle}</h2>
           <span className="text-sm font-bold text-accent-blue">{Math.round(progressPercent)}%</span>
        </div>
        <ProgressBar value={progressPercent} className="h-3 rounded-full" />
        <p className="text-sm text-muted-text font-medium">
          {progress.completed} <span className="opacity-70">/ {progress.total}</span> {t.studying.progressText}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary-text mb-4 px-1">{t.studying.topicsTitle}</h2>
        {/* Topic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic, idx) => (
            <Card
              key={topic.id}
              clickable
              className={`relative overflow-hidden group transition-all duration-300 ${
                topic.is_completed ? 'opacity-60 hover:opacity-100 bg-surface/40' : 'bg-surface hover:shadow-md'
              }`}
              onClick={() => router.push(`/sections/${sectionId}/chat/${topic.chat_id}`)}
              style={{ padding: '1.25rem' }}
            >
              <div className="flex items-start gap-4">
                {/* Number/Icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors ${topic.is_completed ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-muted-text group-hover:bg-white/10 group-hover:text-primary-text'}`}>
                  {topic.is_completed ? <CheckIcon size={20} /> : <span className="font-semibold text-sm">{idx + 1}</span>}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className={`text-[15px] font-semibold mb-1.5 leading-snug transition-colors ${topic.is_completed ? 'text-muted-text' : 'text-primary-text group-hover:text-accent-blue'}`}>
                    {topic.title}
                  </h3>
                  
                  {/* Interactions */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-text">
                    <ChatBubbleIcon size={14} className="opacity-70" />
                    <span className="font-medium">
                      {topic.message_count > 0
                        ? `${topic.message_count} ${t.studying.interactions}`
                        : t.studying.noInteractions}
                    </span>
                  </div>
                </div>

                {/* Checkbox wrapper */}
                <div
                  className="absolute top-4 right-4 p-1 cursor-pointer transition-transform active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(topic.id);
                  }}
                >
                  <Checkbox checked={topic.is_completed} readOnly />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Revision Card */}
      {revisionChatId && (
        <Card
          clickable
          className="relative overflow-hidden border-accent-blue/30 bg-gradient-to-br from-surface via-surface to-accent-blue/10 hover:border-accent-blue/60 transition-all duration-300 shadow-sm"
          onClick={() => router.push(`/sections/${sectionId}/chat/${revisionChatId}`)}
          style={{ padding: '1.5rem', marginTop: '3rem' }}
        >
          <div className="flex items-center gap-5">
             <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-blue/10 text-accent-blue shrink-0 shadow-[0_0_20px_rgba(49,130,206,0.15)] overflow-hidden relative">
               <div className="absolute inset-0 bg-accent-blue/20 animate-pulse"></div>
               <SparklesIcon size={24} className="relative z-10" />
             </div>
             <div>
               <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                 <h3 className="text-[17px] font-bold text-primary-text">{t.studying.revision}</h3>
               </div>
               <p className="text-sm text-muted-text leading-relaxed">{t.studying.revisionDescription}</p>
             </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ChatBubbleIcon({ size = 16, className }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SparklesIcon({ size = 16, className }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}

function CheckIcon({ size = 16, className }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
