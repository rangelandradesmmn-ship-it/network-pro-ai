"use client";
import Sidebar from "@/components/Sidebar";
import { usePathname } from 'next/navigation';

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/cadastro' || pathname === '/login';

  if (isPublicPage) {
    return <main className="min-h-screen bg-[#07111F] text-[#F4F7FA]">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07111F]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
