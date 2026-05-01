'use client';

import { useState, useEffect } from 'react';
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
import TrashIcon from '@/components/ui/TrashIcon';
import { useToast } from '@/components/ui/Toast';

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
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- fetch once on mount; fetchSections is stable within the lifetime of this component

  async function fetchSections() {
    try {
      const res = await fetch('/api/sections');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSections(data.sections);
    } catch {
      showToast(t.errors.UNKNOWN);
    } finally {
      setLoading(false);
    }
  }

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
      if (!res.ok) throw new Error();
      setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      showToast(t.errors.UNKNOWN);
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US');
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
      {/* Page header: title + create */}
      <div className="flex items-end justify-between gap-4 pb-4 mb-6 border-b border-hairline">
        <h1 className="font-title text-[1.75rem] font-medium leading-[1.2] tracking-[-0.005em] text-page-cream">
          {t.dashboard.title}
        </h1>
        <Button onClick={() => setCreateOpen(true)}>{t.dashboard.createSection}</Button>
      </div>

      {/* Section grid or empty state */}
      {sections.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-title text-[1.25rem] text-page-cream">{t.dashboard.emptyTitle}</p>
          <hr className="w-12 border-0 border-t border-hairline my-3 mx-auto" />
          <p className="font-body text-[15px] text-page-cream-muted">{t.dashboard.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Card
              key={section.id}
              clickable
              onClick={() => router.push(`/sections/${section.id}`)}
              className="group flex flex-col gap-3"
            >
              {/* Header: name + delete */}
              <div className="flex items-start justify-between gap-2 -mr-2">
                <h3 className="font-title text-[1.25rem] leading-[1.3] text-page-cream truncate">{section.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(section);
                  }}
                  className="shrink-0 -mt-0.5 p-2 rounded-[6px] text-page-cream-muted hover:text-rust-danger cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-oxblood-tint"
                  aria-label={t.dashboard.deleteConfirmTitle}
                >
                  <TrashIcon />
                </button>
              </div>

              {/* Description */}
              {section.description && (
                <p className="font-body text-[14px] text-page-cream-muted line-clamp-2 mt-[-4px]">{section.description}</p>
              )}

              {/* Date + badge */}
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="font-body text-[13px] text-page-cream-faint">{formatDate(section.created_at)}</span>
                <Badge variant={statusBadgeVariant[section.status] ?? 'muted'}>
                  {t.dashboard.status[section.status as keyof typeof t.dashboard.status] ?? section.status}
                </Badge>
              </div>

              {/* Progress (studying only) */}
              {section.status === 'studying' && section.total_topics > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <ProgressBar
                    value={(section.completed_topics / section.total_topics) * 100}
                  />
                  <span className="font-label text-[12px] text-page-cream-faint">
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
          {createError && <p className="font-label text-[13px] text-rust-danger">{createError}</p>}
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
