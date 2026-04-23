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
        <h2 className="text-xl font-bold text-primary-text mb-6 px-2">{t.studying.topicsTitle}</h2>
        
        {/* Topic Timeline */}
        <div className="relative pb-4">
          {/* Connecting Vertical Line (Desktop only) */}
          <div className="absolute left-[2.25rem] top-8 bottom-8 w-[2px] bg-border-subtle hidden md:block" />

          <div className="space-y-6">
            {topics.map((topic, idx) => {
              const isNextToStudy = !topic.is_completed && (idx === 0 || topics[idx - 1]?.is_completed);

              return (
                <div key={topic.id} className="relative flex items-stretch gap-4 md:gap-8 group">
                  
                  {/* Timeline Node (Desktop) */}
                  <div className="relative z-10 hidden md:flex flex-col items-center mt-6">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shrink-0 transition-all duration-300 shadow-sm ${
                      topic.is_completed 
                        ? 'bg-accent-blue text-background' 
                        : isNextToStudy 
                          ? 'bg-surface border-accent-blue/30 text-accent-blue shadow-[0_0_15px_rgba(49,130,206,0.25)]' 
                          : 'bg-surface text-muted-text border-border-subtle/40'
                    }`}>
                      {topic.is_completed ? <CheckIcon size={20} /> : <span className="font-bold">{idx + 1}</span>}
                    </div>
                  </div>

                  {/* Content Card */}
                  <Card
                    clickable
                    className={`flex-1 relative overflow-hidden transition-all duration-300 ${
                      topic.is_completed 
                        ? 'opacity-70 hover:opacity-100 bg-surface/40' 
                        : isNextToStudy
                          ? 'bg-surface border-accent-blue/40 shadow-md hover:shadow-lg hover:border-accent-blue/60'
                          : 'bg-surface hover:shadow-md hover:border-border-subtle/80'
                    }`}
                    onClick={() => router.push(`/sections/${sectionId}/chat/${topic.chat_id}`)}
                    style={{ padding: '1.5rem' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Mobile Node */}
                      <div className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors ${
                        topic.is_completed ? 'bg-accent-blue text-background' : isNextToStudy ? 'bg-accent-blue/10 text-accent-blue' : 'bg-surface border border-border-subtle text-muted-text'
                      }`}>
                        {topic.is_completed ? <CheckIcon size={16} /> : <span className="font-bold text-sm">{idx + 1}</span>}
                      </div>

                      <div className="flex-1 min-w-0 pr-10 group-hover:pr-40 transition-[padding] duration-300">
                        {/* Topic Title */}
                        <h3 className={`truncate text-lg font-bold mb-3 leading-snug transition-colors ${
                          topic.is_completed ? 'text-primary-text' : isNextToStudy ? 'text-accent-blue' : 'text-primary-text'
                        }`}>
                          {topic.title}
                        </h3>
                        
                        {/* Subtopics List */}
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="mb-5 space-y-2.5">
                            {topic.subtopics.map((sub) => (
                              <div key={sub.id} className="flex items-start gap-3 text-sm text-muted-text group-hover:text-primary-text/80 transition-colors">
                                <div className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${topic.is_completed ? 'bg-accent-blue/50' : 'bg-border-subtle'}`} />
                                <span className="leading-relaxed line-clamp-2 font-medium">{sub.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactions Footer */}
                        <div className="flex items-center gap-2 text-xs text-muted-text font-semibold bg-background/60 inline-flex px-3 py-1.5 rounded-full">
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
                        <span className="text-xs font-medium text-muted-text transition-all duration-300 select-none opacity-0 group-hover:opacity-70 max-w-0 group-hover:max-w-[100px] overflow-hidden whitespace-nowrap">
                          {topic.is_completed ? t.studying.completed : t.studying.markComplete}
                        </span>
                        <div className="flex items-center transition-all duration-300 group-hover:scale-110 group-hover:[&_input]:border-white/40 group-hover:[&_input]:bg-white/10">
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
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shrink-0 transition-all duration-300 shadow-sm bg-surface text-muted-text border-border-subtle/40">
                    <SparklesIcon size={20} />
                  </div>
                </div>

                {/* Content Card */}
                <Card
                  clickable
                  className="flex-1 relative overflow-hidden transition-all duration-300 bg-surface hover:shadow-md hover:border-border-subtle/80"
                  onClick={() => router.push(`/sections/${sectionId}/chat/${revisionChatId}`)}
                  style={{ padding: '1.5rem' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Mobile Node */}
                    <div className="md:hidden flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors bg-surface border border-border-subtle text-muted-text">
                      <SparklesIcon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-lg font-bold mb-2 leading-snug transition-colors text-primary-text group-hover:text-accent-blue">
                        {t.studying.revision}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-sm text-muted-text leading-relaxed">
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
