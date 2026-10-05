"use client";
import Sidebar from "@/components/Sidebar";
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/cadastro' || pathname === '/login';

  useEffect(() => {
    async function loadWhiteLabel() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
          if (profile?.tenant_id) {
            const { data: settings } = await supabase.from('tenant_settings').select('primary_color, secondary_color, bg_color, panel_color, company_name').eq('tenant_id', profile.tenant_id).single();
            if (settings) {
              document.documentElement.style.setProperty('--primary-color', settings.primary_color);
              document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);
              if (settings.bg_color) document.documentElement.style.setProperty('--bg-color', settings.bg_color);
              if (settings.panel_color) document.documentElement.style.setProperty('--panel-color', settings.panel_color);
              if (settings.company_name) {
                document.title = settings.company_name;
                localStorage.setItem('companyName', settings.company_name);
                window.dispatchEvent(new Event('companyNameChanged'));
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    // Set default fallback colors if not overridden
    if (!document.documentElement.style.getPropertyValue('--primary-color')) {
      document.documentElement.style.setProperty('--primary-color', '#00AEEF');
      document.documentElement.style.setProperty('--secondary-color', '#00E5FF');
      document.documentElement.style.setProperty('--bg-color', '#07111F');
      document.documentElement.style.setProperty('--panel-color', '#0E1B2B');
    }
    
    loadWhiteLabel();
  }, [pathname]);

  if (isPublicPage) {
    return <main className="min-h-screen bg-[var(--bg-color)] text-[#F4F7FA]">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-color)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
