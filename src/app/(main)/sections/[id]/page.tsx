'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Spinner from '@/components/ui/Spinner';

interface Section {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export default function SectionPage() {
  const { t } = useTranslation();
  const params = useParams();
  const sectionId = typeof params?.id === 'string' ? params.id : null;

  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sectionId) return;
    async function fetchSection() {
      try {
        const res = await fetch(`/api/sections/${sectionId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSection(data.section);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchSection();
  }, [sectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  if (notFound || !section) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-text">{t.section.notFound}</p>
      </div>
    );
  }

  if (section.status === 'uploading') {
    return <UploadingPlaceholder label={t.section.uploadingPlaceholder} />;
  }

  if (section.status === 'planning') {
    return <PlanningPlaceholder label={t.section.planningPlaceholder} />;
  }

  return <StudyingPlaceholder label={t.section.studyingPlaceholder} />;
}

function UploadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm text-primary-text">{label}</p>
      <p className="text-xs text-muted-text mt-1">Coming in Phase 6</p>
    </div>
  );
}

function PlanningPlaceholder({ label }: { label: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm text-primary-text">{label}</p>
      <p className="text-xs text-muted-text mt-1">Coming in Phase 7</p>
    </div>
  );
}

function StudyingPlaceholder({ label }: { label: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm text-primary-text">{label}</p>
      <p className="text-xs text-muted-text mt-1">Coming in Phase 8</p>
    </div>
  );
}
