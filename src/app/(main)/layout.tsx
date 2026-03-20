import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Breadcrumb from '@/components/Breadcrumb';
import { ToastProvider } from '@/components/ui/Toast';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Navbar />
      <Breadcrumb />
      {/* pt-22 = h-12 navbar + h-10 breadcrumb */}
      <div className="pt-22 px-4 md:px-6">
        <div className="mx-auto max-w-7xl py-8">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
