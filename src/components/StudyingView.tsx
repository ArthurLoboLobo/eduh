'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Checkbox from '@/components/ui/Checkbox';
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
        <p className="font-body text-[14px] text-page-cream-muted">{t.studying.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="font-body text-[14px] text-page-cream-muted">{t.studying.errorLoading}</p>
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
        <h1 className="font-headline text-[1.75rem] text-page-cream tracking-tight">
          {t.studying.title}
        </h1>
      </div>

      {/* Progress Dashboard Widget */}
      <div className="bg-desk-surface border border-hairline rounded-[10px] p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
           <h2 className="font-label text-[12px] tracking-[0.05em] text-page-cream-muted uppercase">{t.studying.progressTitle}</h2>
           <span className="font-display text-[2rem] text-page-cream leading-none">{Math.round(progressPercent)}%</span>
        </div>
        <ProgressBar value={progressPercent} className="h-3 rounded-full" />
        <p className="font-body text-[14px] text-page-cream-muted">
          {progress.completed} <span className="opacity-70">/ {progress.total}</span> {t.studying.progressText}
        </p>
      </div>

      <div>
        <h2 className="font-title text-[1.25rem] text-page-cream mb-6 px-2">{t.studying.topicsTitle}</h2>
        
        {/* Topic Timeline */}
        <div className="relative pb-4">
          {/* Connecting Vertical Line (Desktop only) */}
          <div className="absolute left-[2.25rem] top-8 bottom-8 w-[1px] bg-hairline hidden md:block" />

          <div className="space-y-6">
            {topics.map((topic, idx) => {
              const isNextToStudy = !topic.is_completed && (idx === 0 || topics[idx - 1]?.is_completed);

              return (
                <div key={topic.id} className="relative flex items-stretch gap-4 md:gap-8 group">
                  
                  {/* Timeline Node (Desktop) */}
                  <div className="relative z-10 hidden md:flex flex-col items-center mt-6">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-lamp-night shrink-0 transition-all duration-300 shadow-sm ${
                      topic.is_completed 
                        ? 'bg-forest-success text-desk-surface' 
                        : isNextToStudy 
                          ? 'bg-desk-surface ring-[2px] ring-oxblood text-oxblood' 
                          : 'bg-lamp-night text-page-cream-faint border-hairline'
                    }`}>
                      {topic.is_completed ? <CheckIcon size={20} /> : <span className="font-bold">{idx + 1}</span>}
                    </div>
                  </div>

                  {/* Content Card */}
                  <Card
                    clickable
                    className={`flex-1 relative overflow-hidden transition-all duration-300 ${
                      topic.is_completed 
                        ? 'opacity-70 hover:opacity-100 bg-desk-surface border border-hairline' 
                        : isNextToStudy
                          ? 'bg-desk-surface ring-1 ring-oxblood hover:ring-2 hover:ring-oxblood shadow-md'
                          : 'bg-desk-surface border border-hairline hover:bg-desk-surface-hover hover:border-page-cream-faint'
                    }`}
                    onClick={() => router.push(`/sections/${sectionId}/chat/${topic.chat_id}`)}
                    style={{ padding: '1.5rem' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Mobile Node */}
                      <div className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors ${
                        topic.is_completed ? 'bg-forest-success text-desk-surface' : isNextToStudy ? 'bg-oxblood-tint text-oxblood' : 'bg-lamp-night border border-hairline text-page-cream-muted'
                      }`}>
                        {topic.is_completed ? <CheckIcon size={16} /> : <span className="font-bold text-sm">{idx + 1}</span>}
                      </div>

                      <div className="flex-1 min-w-0 pr-10 group-hover:pr-40 transition-[padding] duration-300">
                        {/* Topic Title */}
                        <h3 className={`truncate font-title text-[1.25rem] mb-3 leading-snug transition-colors ${
                          topic.is_completed ? 'text-page-cream' : isNextToStudy ? 'text-oxblood' : 'text-page-cream'
                        }`}>
                          {topic.title}
                        </h3>
                        
                        {/* Subtopics List */}
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="mb-5 space-y-2.5">
                            {topic.subtopics.map((sub) => (
                              <div key={sub.id} className="flex items-start gap-3 font-body text-[14px] text-page-cream-muted group-hover:text-page-cream transition-colors">
                                <div className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${topic.is_completed ? 'bg-forest-success/50' : 'bg-hairline'}`} />
                                <span className="leading-relaxed line-clamp-2">{sub.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactions Footer */}
                        <div className="flex items-center gap-2 font-label text-[12px] text-page-cream-muted bg-lamp-night border border-hairline inline-flex px-3 py-1.5 rounded-[6px]">
                          <ChatBubbleIcon size={14} className="opacity-70" />
                          <span>
                            {topic.message_count > 0
                              ? `${topic.message_count} ${t.studying.interactions}`
                              : t.studying.noInteractions}
                          </span>
                        </div>
                      </div>

                      {/* Checkbox Action */}
                      <div
                        className="absolute top-5 right-5 flex items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 rounded-full px-2.5 py-1.5 -mr-1 group-hover:bg-white/[0.06]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(topic.id);
                        }}
                      >
                        <span className="font-label text-[12px] text-page-cream-muted transition-all duration-300 select-none opacity-0 group-hover:opacity-70 max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap">
                          {topic.is_completed ? t.studying.completed : t.studying.markComplete}
                        </span>
                        <div className="flex items-center transition-all duration-300 group-hover:scale-110 group-hover:[&_input]:border-page-cream-faint group-hover:[&_input]:bg-desk-surface-hover">
                          <Checkbox checked={topic.is_completed} readOnly />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
            
            {/* Revision Node embedded in Timeline */}
            {revisionChatId && (
              <div className="relative flex items-stretch gap-4 md:gap-8 group">
                
                {/* Timeline Node (Desktop) */}
                <div className="relative z-10 hidden md:flex flex-col items-center mt-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-lamp-night shrink-0 transition-all duration-300 shadow-sm bg-desk-surface text-page-cream-muted border-hairline">
                    <SparklesIcon size={20} />
                  </div>
                </div>

                {/* Content Card */}
                <Card
                  clickable
                  className="flex-1 relative overflow-hidden transition-all duration-300 bg-desk-surface border border-hairline hover:bg-desk-surface-hover"
                  onClick={() => router.push(`/sections/${sectionId}/chat/${revisionChatId}`)}
                  style={{ padding: '1.5rem' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Mobile Node */}
                    <div className="md:hidden flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors bg-desk-surface border border-hairline text-page-cream-muted">
                      <SparklesIcon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="font-title text-[1.25rem] mb-2 leading-snug transition-colors text-page-cream group-hover:text-oxblood">
                        {t.studying.revision}
                      </h3>
                      
                      {/* Description */}
                      <p className="font-body text-[14px] text-page-cream-muted leading-relaxed">
                        {t.studying.revisionDescription}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
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
