'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ProgressBar from '@/components/ui/ProgressBar';
import Spinner from '@/components/ui/Spinner';

interface Section {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  total_topics: number;
  completed_topics: number;
}

const statusBadgeVariant: Record<string, 'blue' | 'muted' | 'green'> = {
  uploading: 'blue',
  planning: 'muted',
  studying: 'green',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  async function fetchSections() {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections);
      }
    } catch {
      // silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter((s) => s.name.toLowerCase().includes(q));
  }, [sections, search]);

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === 'MAX_SECTIONS_REACHED') {
          setCreateError(t.dashboard.maxSectionsError);
        } else {
          setCreateError(t.errors.UNKNOWN);
        }
        return;
      }
      const data = await res.json();
      router.push(`/sections/${data.section.id}`);
    } catch {
      setCreateError(t.errors.UNKNOWN);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sections/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <>
      {/* Top bar: search + create */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder={t.dashboard.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>{t.dashboard.createSection}</Button>
      </div>

      {/* Section grid or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-primary-text text-sm">{t.dashboard.emptyTitle}</p>
          <p className="text-muted-text text-sm mt-1">{t.dashboard.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((section) => (
            <Card
              key={section.id}
              clickable
              onClick={() => router.push(`/sections/${section.id}`)}
              className="flex flex-col gap-3"
            >
              {/* Header: name + delete */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary-text truncate">{section.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(section);
                  }}
                  className="shrink-0 text-muted-text hover:text-danger-red cursor-pointer p-0.5"
                  aria-label="Delete"
                >
                  <TrashIcon />
                </button>
              </div>

              {/* Description */}
              {section.description && (
                <p className="text-xs text-muted-text line-clamp-2">{section.description}</p>
              )}

              {/* Date + badge */}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-muted-text">{formatDate(section.created_at)}</span>
                <Badge variant={statusBadgeVariant[section.status] ?? 'muted'}>
                  {t.dashboard.status[section.status as keyof typeof t.dashboard.status] ?? section.status}
                </Badge>
              </div>

              {/* Progress (studying only) */}
              {section.status === 'studying' && section.total_topics > 0 && (
                <div className="flex flex-col gap-1.5">
                  <ProgressBar
                    value={(section.completed_topics / section.total_topics) * 100}
                  />
                  <span className="text-xs text-muted-text">
                    {section.completed_topics}/{section.total_topics} {t.dashboard.topicsCompleted}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create section modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); }}
        title={t.dashboard.createModal.title}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t.dashboard.createModal.nameLabel}
            placeholder={t.dashboard.createModal.namePlaceholder}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            autoFocus
          />
          <Input
            label={t.dashboard.createModal.descriptionLabel}
            placeholder={t.dashboard.createModal.descriptionPlaceholder}
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
          />
          {createError && <p className="text-xs text-danger-red">{createError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => { setCreateOpen(false); setCreateError(''); }}
              disabled={creating}
            >
              {t.dashboard.cancel}
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!createName.trim()}
            >
              {t.dashboard.createModal.create}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t.dashboard.deleteConfirmTitle}
        message={t.dashboard.deleteConfirmMessage}
        confirmLabel={t.dashboard.confirm}
        cancelLabel={t.dashboard.cancel}
        loading={deleting}
      />
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
