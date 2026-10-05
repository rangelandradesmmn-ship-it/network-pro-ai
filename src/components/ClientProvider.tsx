"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadWhiteLabel() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
          if (profile?.tenant_id) {
            const { data: settings } = await supabase.from('tenant_settings').select('primary_color, secondary_color, company_name').eq('tenant_id', profile.tenant_id).single();
            if (settings) {
              document.documentElement.style.setProperty('--primary-color', settings.primary_color);
              document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);
              if (settings.company_name) {
                document.title = settings.company_name;
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    }
    loadWhiteLabel();
  }, []);

  // Set default fallback colors if not overridden
  useEffect(() => {
    if (!document.documentElement.style.getPropertyValue('--primary-color')) {
      document.documentElement.style.setProperty('--primary-color', '#00AEEF');
      document.documentElement.style.setProperty('--secondary-color', '#00E5FF');
    }
  }, []);

  return <>{children}</>;
}
