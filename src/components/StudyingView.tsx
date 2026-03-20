'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Checkbox from '@/components/ui/Checkbox';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    if (togglingId) return;
    setTogglingId(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setTopics((prev) =>
        prev.map((topic) =>
          topic.id === topicId ? { ...topic, is_completed: data.isCompleted } : topic,
        ),
      );

      setProgress((prev) => ({
        ...prev,
        completed: prev.completed + (data.isCompleted ? 1 : -1),
      }));
    } catch {
      showToast(t.errors.UNKNOWN);
    } finally {
      setTogglingId(null);
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
          {t.studying.retry}
        </Button>
      </div>
    );
  }

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Progress area */}
      <div className="space-y-2">
        <p className="text-sm text-muted-text">
          {progress.completed}/{progress.total} {t.studying.progressText}
        </p>
        <ProgressBar value={progressPercent} />
      </div>

      {/* Topic cards */}
      {topics.map((topic) => (
        <Card
          key={topic.id}
          clickable
          className={topic.is_completed ? 'opacity-50' : ''}
          onClick={() => router.push(`/sections/${sectionId}/chat/${topic.chat_id}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-text">{topic.title}</p>
              <p className="text-xs text-muted-text mt-1">
                {topic.message_count > 0
                  ? `${topic.message_count} ${t.studying.interactions}`
                  : t.studying.noInteractions}
              </p>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(topic.id);
              }}
            >
              {togglingId === topic.id ? (
                <Spinner size={14} />
              ) : (
                <Checkbox
                  checked={topic.is_completed}
                  readOnly
                />
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Revision card */}
      {revisionChatId && (
        <Card
          clickable
          onClick={() => router.push(`/sections/${sectionId}/chat/${revisionChatId}`)}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-primary-text">{t.studying.revision}</p>
            <Badge variant="blue">{t.studying.revision}</Badge>
          </div>
          <p className="text-xs text-muted-text mt-1">{t.studying.revisionDescription}</p>
        </Card>
      )}
    </div>
  );
}
