'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import TrashIcon from '@/components/ui/TrashIcon';
import RefreshIcon from '@/components/ui/RefreshIcon';
import { useToast } from '@/components/ui/Toast';

interface UploadingViewProps {
  sectionId: string;
  onStatusChange?: (status: string) => void;
}

interface LocalFile {
  id: string;
  tempId: string;
  name: string;
  status: 'uploading' | 'processing' | 'processed' | 'error';
  blobUrl: string;
  fileType: string;
  localError?: string;
}

const STATUS_BADGE_VARIANT: Record<string, 'blue' | 'muted' | 'green' | 'red'> = {
  uploading: 'blue',
  processing: 'muted',
  processed: 'green',
  error: 'red',
};

const UPLOAD_ERROR_MAP: Record<string, string> = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  SIZE_LIMIT_EXCEEDED: 'SIZE_LIMIT_EXCEEDED',
};

export default function UploadingView({ sectionId, onStatusChange }: UploadingViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [files, setFiles] = useState<LocalFile[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<LocalFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load — fetch existing files
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sections/${sectionId}/files`);
        if (res.ok) {
          const data = await res.json();
          const mapped: LocalFile[] = data.files.map((f: Record<string, string>) => ({
            id: f.id,
            tempId: f.id,
            name: f.original_name,
            status: f.status as LocalFile['status'],
            blobUrl: f.blob_url,
            fileType: f.file_type,
          }));
          setFiles(mapped);
        }
      } catch {
        // silently fail — empty list shown
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [sectionId]);

  // Polling — update statuses every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sections/${sectionId}/files/status`);
        if (!res.ok) return;
        const data = await res.json();
        const statusMap = new Map<string, string>();
        for (const s of data.statuses) {
          statusMap.set(s.id, s.status);
        }
        setFiles((prev) =>
          prev.map((f) => {
            if (!f.id || !statusMap.has(f.id)) return f;
            const newStatus = statusMap.get(f.id) as LocalFile['status'];
            if (f.status === newStatus) return f;
            return { ...f, status: newStatus };
          }),
        );
      } catch {
        // silently fail
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sectionId]);

  const handleFilesSelected = useCallback(
    (fileList: FileList) => {
      Array.from(fileList).forEach(async (file) => {
        const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

        setFiles((prev) => [
          ...prev,
          {
            id: '',
            tempId,
            name: file.name,
            status: 'uploading',
            blobUrl: '',
            fileType: file.type,
          },
        ]);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sectionId', sectionId);

        try {
          const res = await fetch('/api/files', { method: 'POST', body: formData });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            const errorKey = data?.error && UPLOAD_ERROR_MAP[data.error]
              ? UPLOAD_ERROR_MAP[data.error] as keyof typeof t.uploading.errors
              : 'UPLOAD_FAILED';
            setFiles((prev) =>
              prev.map((f) =>
                f.tempId === tempId
                  ? { ...f, status: 'error', localError: t.uploading.errors[errorKey as keyof typeof t.uploading.errors] }
                  : f,
              ),
            );
            return;
          }

          const data = await res.json();
          const dbFile = data.file;

          setFiles((prev) =>
            prev.map((f) =>
              f.tempId === tempId
                ? {
                    ...f,
                    id: dbFile.id,
                    blobUrl: dbFile.blob_url,
                    fileType: dbFile.file_type,
                    status: 'processing',
                  }
                : f,
            ),
          );

          // Fire-and-forget: trigger processing
          fetch(`/api/files/${dbFile.id}/process`, { method: 'POST' }).catch(() => {
            // polling will pick up error status
          });
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.tempId === tempId
                ? { ...f, status: 'error', localError: t.uploading.errors.UPLOAD_FAILED }
                : f,
            ),
          );
        }
      });
    },
    [sectionId, t],
  );

  function handleRetry(fileId: string) {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: 'processing' as const } : f)),
    );
    fetch(`/api/files/${fileId}/process`, { method: 'POST' }).catch(() => {
      // polling will pick up error status
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const deletedFile = deleteTarget;

    setFiles((prev) => prev.filter((f) => f.tempId !== deletedFile.tempId));
    setDeleteTarget(null);

    if (deletedFile.id) {
      try {
        const res = await fetch(`/api/files/${deletedFile.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } catch {
        setFiles((prev) => [...prev, deletedFile]);
        showToast(t.errors.UNKNOWN);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  const allProcessed =
    files.length > 0 && files.every((f) => f.status === 'processed');

  return (
    <div className="animate-fade-in-up">
      {/* Upload drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-[14px] p-12 cursor-pointer bg-desk-surface transition-all duration-300
          ${isDragOver ? 'border-oxblood bg-oxblood-tint scale-[1.02]' : 'border-hairline hover:border-oxblood/50 hover:bg-desk-surface-hover hover:shadow-md'}
        `}
      >
        <UploadIcon />
        <p className="font-body text-[14px] text-page-cream-muted">
          {isDragOver ? t.uploading.dropZoneActive : t.uploading.dropZoneLabel}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.heif,.heic"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* File list */}
      {initialLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size={24} />
        </div>
      ) : files.length === 0 ? (
        <p className="font-body text-[14px] text-page-cream-muted text-center py-8">
          {t.uploading.emptyFiles}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {files.map((file) => (
            <div
              key={file.tempId}
              className="flex items-center gap-4 bg-desk-surface border border-hairline rounded-[10px] px-5 py-4 transition-all hover:bg-desk-surface-hover"
            >
              {/* File name — clickable for preview */}
              <button
                onClick={() => file.blobUrl ? setPreviewFile(file) : undefined}
                className={`font-label text-[14px] truncate text-left flex-1 ${
                  file.blobUrl
                    ? 'text-page-cream hover:text-oxblood cursor-pointer'
                    : 'text-page-cream-muted cursor-default'
                }`}
                disabled={!file.blobUrl}
              >
                {file.name}
              </button>

              {/* Status badge */}
              <Badge variant={STATUS_BADGE_VARIANT[file.status] ?? 'muted'}>
                {file.localError ?? t.uploading.fileStatus[file.status]}
              </Badge>

              {/* Retry button — only for server-side extraction errors */}
              {file.status === 'error' && file.id && !file.localError && (
                <button
                  onClick={() => handleRetry(file.id!)}
                  className="text-page-cream-muted hover:text-oxblood cursor-pointer shrink-0 p-0.5 transition-colors"
                  title={t.uploading.retry}
                  aria-label={t.uploading.retry}
                >
                  <RefreshIcon size={16} />
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(file);
                }}
                className="shrink-0 text-page-cream-muted hover:text-rust-danger cursor-pointer p-0.5"
                aria-label="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Start Planning button */}
      <div className="mt-6 flex justify-end">
        <Button
          disabled={!allProcessed}
          onClick={async () => {
            onStatusChange?.('loading-planning');
            try {
              const res = await fetch(`/api/sections/${sectionId}/start-planning`, {
                method: 'POST',
              });
              if (!res.ok) throw new Error();
              onStatusChange?.('planning');
            } catch {
              try {
                const r = await fetch(`/api/sections/${sectionId}`);
                if (r.ok) {
                  const data = await r.json();
                  onStatusChange?.(data.section.status);
                } else {
                  onStatusChange?.('uploading');
                }
              } catch {
                onStatusChange?.('uploading');
              }
              showToast(t.errors.UNKNOWN);
            }
          }}
        >
          {t.uploading.startPlanning}
        </Button>
      </div>

      {/* Preview modal */}
      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={t.uploading.previewTitle}
        className="max-w-[95vw] w-full"
      >
        {previewFile && (
          <FilePreview file={previewFile} noPreviewLabel={t.uploading.noPreview} />
        )}
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t.uploading.deleteConfirmTitle}
        message={t.uploading.deleteConfirmMessage}
        confirmLabel={t.uploading.confirm}
        cancelLabel={t.uploading.cancel}
      />
    </div>
  );
}

function FilePreview({
  file,
  noPreviewLabel,
}: {
  file: LocalFile;
  noPreviewLabel: string;
}) {
  const [textFetch, setTextFetch] = useState<{ url: string; content: string | null; error: boolean } | null>(null);

  useEffect(() => {
    if (file.fileType !== 'text/plain') return;
    let cancelled = false;
    fetch(file.blobUrl)
      .then((res) => res.text())
      .then((content) => { if (!cancelled) setTextFetch({ url: file.blobUrl, content, error: false }); })
      .catch(() => { if (!cancelled) setTextFetch({ url: file.blobUrl, content: null, error: true }); });
    return () => { cancelled = true; };
  }, [file.blobUrl, file.fileType]);

  if (file.fileType === 'application/pdf') {
    return (
      <iframe
        src={file.blobUrl}
        className="w-full h-[70vh] rounded-md"
        title={file.name}
      />
    );
  }
  if (file.fileType.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blobUrl is a runtime Vercel Blob URL; domain unknown at build time
      <img
        src={file.blobUrl}
        alt={file.name}
        className="max-w-full max-h-[70vh] mx-auto rounded-md"
      />
    );
  }
  if (file.fileType === 'text/plain') {
    const current = textFetch?.url === file.blobUrl ? textFetch : null;
    if (current === null) return <div className="flex justify-center py-8"><Spinner size={24} /></div>;
    if (current.error || current.content === null) return <p className="font-body text-[14px] text-page-cream-muted text-center py-8">{noPreviewLabel}</p>;
    return (
      <pre className="font-body text-[14px] text-page-cream whitespace-pre-wrap break-words overflow-y-auto max-h-[70vh] font-mono p-4 bg-lamp-night rounded-[6px]">
        {current.content}
      </pre>
    );
  }
  return (
    <p className="font-body text-[14px] text-page-cream-muted text-center py-8">{noPreviewLabel}</p>
  );
}

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-page-cream-muted"
    >
      <path
        d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

