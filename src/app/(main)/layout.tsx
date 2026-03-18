import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Breadcrumb from '@/components/Breadcrumb';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <Breadcrumb />
      {/* pt-22 = h-12 navbar + h-10 breadcrumb */}
      <div className="pt-22 px-6">
        <div className="mx-auto max-w-7xl py-8">
          {children}
        </div>
      </div>
    </>
  );
}
