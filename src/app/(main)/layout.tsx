import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { listSections } from '@/lib/db/queries/sections';
import Navbar from '@/components/Navbar';
import Breadcrumb from '@/components/Breadcrumb';

async function getSections(): Promise<{ id: string; name: string }[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ditchy_token')?.value;
    if (!token) return [];
    const result = await verifyToken(token);
    if (!result) return [];
    const sections = await listSections(result.userId);
    return sections.map((s) => ({ id: s.id, name: s.name }));
  } catch {
    return [];
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const sections = await getSections();

  return (
    <>
      <Navbar />
      <Breadcrumb sections={sections} />
      {/* pt-22 = h-12 navbar + h-10 breadcrumb */}
      <div className="pt-22 px-6">
        <div className="mx-auto max-w-7xl py-8">
          {children}
        </div>
      </div>
    </>
  );
}
