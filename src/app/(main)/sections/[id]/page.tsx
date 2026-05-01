'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import Spinner from '@/components/ui/Spinner';
import UploadingView from '@/components/UploadingView';
import PlanningView from '@/components/PlanningView';
import StudyingView from '@/components/StudyingView';

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
        <p className="font-body text-[14px] text-page-cream-muted">{t.section.notFound}</p>
      </div>
    );
  }

  if (section.status === 'uploading') {
    return (
      <UploadingView
        sectionId={section.id}
        onStatusChange={(status) => setSection({ ...section, status })}
      />
    );
  }

  if (section.status === 'loading-planning') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <p className="font-body text-[14px] text-page-cream-muted">{t.section.loadingPlanning}</p>
      </div>
    );
  }

  if (section.status === 'planning') {
    return (
      <PlanningView
        sectionId={section.id}
        onStatusChange={(status) => setSection({ ...section, status })}
      />
    );
  }

  if (section.status === 'loading-studying') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <p className="font-body text-[14px] text-page-cream-muted">{t.section.loadingStudying}</p>
      </div>
    );
  }

  return <StudyingView sectionId={section.id} />;
}
