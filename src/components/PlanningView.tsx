'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '@/lib/i18n';
import type { PlanJSON } from '@/lib/ai';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Spinner from '@/components/ui/Spinner';
import UndoIcon from '@/components/ui/UndoIcon';
import RefreshIcon from '@/components/ui/RefreshIcon';

interface PlanningViewProps {
  sectionId: string;
  onStatusChange?: (status: string) => void;
}

export default function PlanningView({ sectionId, onStatusChange }: PlanningViewProps) {
  const { t } = useTranslation();

  const [plan, setPlan] = useState<PlanJSON | null>(null);
  const [mode, setMode] = useState<'loading' | 'error' | 'editor'>('loading');
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [guidanceText, setGuidanceText] = useState('');

  const draftCountRef = useRef(1);
  const canUndo = draftCountRef.current >= 2;

  // Auto-dismiss inline errors after 4s
  useEffect(() => {
    if (!inlineError) return;
    const timer = setTimeout(() => setInlineError(null), 4000);
    return () => clearTimeout(timer);
  }, [inlineError]);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sections/${sectionId}/plan`);
        if (!res.ok) {
          setMode('error');
          return;
        }
        const data = await res.json();
        if (data.plan !== null) {
          setPlan(data.plan);
          setMode('editor');
        } else {
          setMode('error');
        }
      } catch {
        setMode('error');
      }
    }
    load();
  }, [sectionId]);

  const savePlan = useCallback(
    async (newPlan: PlanJSON): Promise<void> => {
      const previousPlan = plan;
      setPlan(newPlan);
      draftCountRef.current += 1;
      try {
        const res = await fetch(`/api/sections/${sectionId}/plan`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: newPlan }),
        });
        if (!res.ok) {
          setPlan(previousPlan);
          draftCountRef.current -= 1;
          setInlineError(t.planning.saveFailed);
        }
      } catch {
        setPlan(previousPlan);
        draftCountRef.current -= 1;
        setInlineError(t.planning.saveFailed);
      }
    },
    [sectionId, t, plan],
  );

  async function handleUndo() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}/plan/undo`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === 'NOTHING_TO_UNDO') {
          draftCountRef.current = 1;
        } else {
          setInlineError(t.planning.undoFailed);
        }
        return;
      }
      const data = await res.json();
      setPlan(data.plan);
      draftCountRef.current = Math.max(1, draftCountRef.current - 1);
    } catch {
      setInlineError(t.planning.undoFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setMode('loading');
    setShowRegenerateInput(false);
    try {
      const res = await fetch(`/api/sections/${sectionId}/plan/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidance: guidanceText }),
      });
      if (!res.ok) {
        setMode('error');
        return;
      }
      // Fetch the new draft
      const getRes = await fetch(`/api/sections/${sectionId}/plan`);
      if (!getRes.ok) {
        setMode('error');
        return;
      }
      const data = await getRes.json();
      setPlan(data.plan);
      draftCountRef.current += 1;
      setGuidanceText('');
      setMode('editor');
    } catch {
      setMode('error');
    }
  }

  async function handleStartStudying() {
    onStatusChange?.('loading-studying');
    try {
      const res = await fetch(`/api/sections/${sectionId}/start-studying`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error();
      onStatusChange?.('studying');
    } catch {
      // Server reverts to 'planning' on failure; match that client-side.
      onStatusChange?.('planning');
    }
  }

  // --- Edit operations ---

  function handleDeleteTopic(topicIdx: number) {
    if (!plan || plan.topics.length <= 1) return;
    const newPlan: PlanJSON = {
      topics: plan.topics.filter((_, i) => i !== topicIdx),
    };
    savePlan(newPlan);
  }

  function handleDeleteSubtopic(topicIdx: number, subIdx: number) {
    if (!plan || plan.topics[topicIdx].subtopics.length <= 1) return;
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx
          ? { ...topic, subtopics: topic.subtopics.filter((_, j) => j !== subIdx) }
          : topic,
      ),
    };
    savePlan(newPlan);
  }

  function handleToggleKnown(topicIdx: number) {
    if (!plan) return;
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx ? { ...topic, isKnown: !topic.isKnown } : topic,
      ),
    };
    savePlan(newPlan);
  }

  function handleAddTopic() {
    if (!plan) return;
    const newPlan: PlanJSON = {
      topics: [
        ...plan.topics,
        { title: t.planning.newTopicTitle, subtopics: [t.planning.newSubtopicText] },
      ],
    };
    savePlan(newPlan);
  }

  function handleAddSubtopic(topicIdx: number) {
    if (!plan) return;
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx
          ? { ...topic, subtopics: [...topic.subtopics, t.planning.newSubtopicText] }
          : topic,
      ),
    };
    savePlan(newPlan);
  }

  function handleEditTitle(topicIdx: number, newTitle: string) {
    if (!plan) return;
    if (newTitle === plan.topics[topicIdx].title || newTitle.trim() === '') return;
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx ? { ...topic, title: newTitle.trim() } : topic,
      ),
    };
    savePlan(newPlan);
  }

  function handleEditSubtopic(topicIdx: number, subIdx: number, newText: string) {
    if (!plan) return;
    if (newText === plan.topics[topicIdx].subtopics[subIdx] || newText.trim() === '') return;
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx
          ? {
              ...topic,
              subtopics: topic.subtopics.map((s, j) => (j === subIdx ? newText.trim() : s)),
            }
          : topic,
      ),
    };
    savePlan(newPlan);
  }

  function handleReorderTopics(event: DragEndEvent) {
    if (!plan) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt((active.id as string).replace('topic-', ''));
    const newIdx = parseInt((over.id as string).replace('topic-', ''));
    const newPlan: PlanJSON = {
      topics: arrayMove(plan.topics, oldIdx, newIdx),
    };
    savePlan(newPlan);
  }

  function handleReorderSubtopics(topicIdx: number, event: DragEndEvent) {
    if (!plan) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt((active.id as string).split('-').pop()!);
    const newIdx = parseInt((over.id as string).split('-').pop()!);
    const newPlan: PlanJSON = {
      topics: plan.topics.map((topic, i) =>
        i === topicIdx
          ? { ...topic, subtopics: arrayMove(topic.subtopics, oldIdx, newIdx) }
          : topic,
      ),
    };
    savePlan(newPlan);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // --- Loading state ---
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <p className="font-body text-[14px] text-page-cream-muted">{t.planning.loading}</p>
      </div>
    );
  }

  // --- Error state ---
  if (mode === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="font-body text-[14px] text-page-cream">{t.planning.errorMessage}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshIcon size={16} />
          {t.planning.retry}
        </Button>
      </div>
    );
  }

  // --- Editor state ---
  const topicIds = plan!.topics.map((_, i) => `topic-${i}`);

  return (
    <div className="animate-fade-in-up">
      {/* Top bar */}
      <div className="flex items-center justify-end gap-3 mb-4 min-h-[36px]">
        {inlineError && (
          <p className="font-label text-[12px] text-rust-danger mr-auto">{inlineError}</p>
        )}
        {saving && <Spinner size={16} />}
        <Button
          variant="ghost"
          disabled={!canUndo || saving}
          onClick={handleUndo}
          title={t.planning.undo}
          aria-label={t.planning.undo}
          className="px-3"
        >
          <UndoIcon size={18} />
        </Button>
      </div>

      {/* Topic list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleReorderTopics}
      >
        <SortableContext items={topicIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {plan!.topics.map((topic, topicIdx) => (
              <TopicCard
                key={`topic-${topicIdx}`}
                id={`topic-${topicIdx}`}
                topic={topic}
                topicIdx={topicIdx}
                saving={saving}
                canDelete={plan!.topics.length > 1}
                sensors={sensors}
                alreadyKnownLabel={t.planning.alreadyKnown}
                addSubtopicLabel={t.planning.addSubtopic}
                onDeleteTopic={() => handleDeleteTopic(topicIdx)}
                onToggleKnown={() => handleToggleKnown(topicIdx)}
                onEditTitle={(val) => handleEditTitle(topicIdx, val)}
                onDeleteSubtopic={(subIdx) => handleDeleteSubtopic(topicIdx, subIdx)}
                onEditSubtopic={(subIdx, val) => handleEditSubtopic(topicIdx, subIdx, val)}
                onAddSubtopic={() => handleAddSubtopic(topicIdx)}
                onReorderSubtopics={(e) => handleReorderSubtopics(topicIdx, e)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add topic */}
      <button
        className="mt-3 flex items-center gap-1.5 font-label text-[13px] text-page-cream-muted hover:text-page-cream cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={saving}
        onClick={handleAddTopic}
      >
        <PlusIcon />
        {t.planning.addTopic}
      </button>

      {/* Regenerate section */}
      <div className="mt-6 border-t border-hairline pt-4">
        {!showRegenerateInput ? (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => setShowRegenerateInput(true)}
          >
            {t.planning.regenerate}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              placeholder={t.planning.regenerateGuidancePlaceholder}
              className="flex-1 px-4 py-3 rounded-[6px] font-body text-[14px] bg-desk-surface text-page-cream border border-hairline placeholder:text-page-cream-faint focus:outline-none focus:input-focus-glow transition-all"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && guidanceText.trim()) handleRegenerate();
              }}
            />
            <Button
              disabled={saving || !guidanceText.trim()}
              onClick={handleRegenerate}
            >
              {t.planning.regenerateConfirm}
            </Button>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setShowRegenerateInput(false);
                setGuidanceText('');
              }}
            >
              {t.planning.regenerateCancel}
            </Button>
          </div>
        )}
      </div>

      {/* Start studying */}
      <div className="mt-6 flex justify-end">
        <Button disabled={saving} onClick={handleStartStudying}>
          {t.planning.startStudying}
        </Button>
      </div>
    </div>
  );
}

// --- TopicCard ---

interface TopicCardProps {
  id: string;
  topic: PlanJSON['topics'][number];
  topicIdx: number;
  saving: boolean;
  canDelete: boolean;
  sensors: ReturnType<typeof useSensors>;
  alreadyKnownLabel: string;
  addSubtopicLabel: string;
  onDeleteTopic: () => void;
  onToggleKnown: () => void;
  onEditTitle: (val: string) => void;
  onDeleteSubtopic: (subIdx: number) => void;
  onEditSubtopic: (subIdx: number, val: string) => void;
  onAddSubtopic: () => void;
  onReorderSubtopics: (event: DragEndEvent) => void;
}

function TopicCard({
  id,
  topic,
  topicIdx,
  saving,
  canDelete,
  sensors,
  alreadyKnownLabel,
  addSubtopicLabel,
  onDeleteTopic,
  onToggleKnown,
  onEditTitle,
  onDeleteSubtopic,
  onEditSubtopic,
  onAddSubtopic,
  onReorderSubtopics,
}: TopicCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const subtopicIds = topic.subtopics.map((_, i) => `sub-${topicIdx}-${i}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-desk-surface border border-hairline rounded-[10px] p-5 md:p-6 transition-colors hover:bg-desk-surface-hover ${topic.isKnown ? 'opacity-50' : ''}`}
    >
      {/* Topic header */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          className="mt-1 cursor-grab text-page-cream-muted hover:text-page-cream shrink-0 touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag"
        >
          <DragHandleIcon />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
            <InlineEdit
            value={topic.title}
            onSave={onEditTitle}
            disabled={saving}
            className="font-title text-[1.25rem] text-page-cream"
          />
        </div>

        {/* Already known checkbox */}
        <Checkbox
          label={alreadyKnownLabel}
          checked={!!topic.isKnown}
          onChange={onToggleKnown}
          disabled={saving}
          className="shrink-0 text-xs"
        />

        {/* Delete topic */}
        {canDelete && (
          <button
            onClick={onDeleteTopic}
            disabled={saving}
            className="shrink-0 text-page-cream-muted hover:text-rust-danger cursor-pointer p-0.5 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete topic"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Subtopics */}
      <div className="mt-2 ml-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorderSubtopics}
        >
          <SortableContext items={subtopicIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {topic.subtopics.map((sub, subIdx) => (
                <SubtopicItem
                  key={`sub-${topicIdx}-${subIdx}`}
                  id={`sub-${topicIdx}-${subIdx}`}
                  text={sub}
                  saving={saving}
                  canDelete={topic.subtopics.length > 1}
                  onDelete={() => onDeleteSubtopic(subIdx)}
                  onEdit={(val) => onEditSubtopic(subIdx, val)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add subtopic */}
        <button
          className="mt-1 flex items-center gap-1 font-label text-[12px] text-page-cream-muted hover:text-page-cream cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={saving}
          onClick={onAddSubtopic}
        >
          <PlusIcon size={12} />
          {addSubtopicLabel}
        </button>
      </div>
    </div>
  );
}

// --- SubtopicItem ---

interface SubtopicItemProps {
  id: string;
  text: string;
  saving: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onEdit: (val: string) => void;
}

function SubtopicItem({ id, text, saving, canDelete, onDelete, onEdit }: SubtopicItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/sub flex items-center gap-1.5 py-0.5"
    >
      {/* Drag handle */}
      <button
        className="cursor-grab text-page-cream-muted hover:text-page-cream shrink-0 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag"
      >
        <DragHandleIcon size={12} />
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={text}
          onSave={onEdit}
          disabled={saving}
          className="font-body text-[14px] text-page-cream-muted"
        />
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={onDelete}
          disabled={saving}
          className="shrink-0 text-page-cream-muted hover:text-rust-danger cursor-pointer p-0.5 opacity-0 group-hover/sub:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Delete subtopic"
        >
          <TrashIcon size={12} />
        </button>
      )}
    </div>
  );
}

// --- InlineEdit ---

interface InlineEditProps {
  value: string;
  onSave: (val: string) => void;
  disabled: boolean;
  className?: string;
}

function InlineEdit({ value, onSave, disabled, className = '' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) {
      onSave(draft.trim());
    } else {
      setDraft(value);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`w-full bg-transparent border-b border-oxblood-tint text-page-cream focus:outline-none focus:border-oxblood ${className}`}
        disabled={disabled}
      />
    );
  }

  return (
    <span
      className={`block truncate ${disabled ? '' : 'cursor-pointer hover:text-page-cream'} ${className}`}
      onClick={() => !disabled && setEditing(true)}
    >
      {value}
    </span>
  );
}

// --- SVG Icons ---

function DragHandleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="4" r="1.25" fill="currentColor" />
      <circle cx="10" cy="4" r="1.25" fill="currentColor" />
      <circle cx="6" cy="8" r="1.25" fill="currentColor" />
      <circle cx="10" cy="8" r="1.25" fill="currentColor" />
      <circle cx="6" cy="12" r="1.25" fill="currentColor" />
      <circle cx="10" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m2 0v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4h10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
