CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.profiles(id),
    company_name TEXT DEFAULT 'NETWORK PRO AI',
    primary_color TEXT DEFAULT '#00AEEF',
    secondary_color TEXT DEFAULT '#00E5FF',
    commission_level_1 INTEGER DEFAULT 20,
    commission_level_2 INTEGER DEFAULT 10,
    commission_level_3 INTEGER DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.tenant_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings for existing Admins
INSERT INTO public.tenant_settings (tenant_id)
SELECT id FROM public.profiles WHERE role IN ('ADMIN', 'SUPER_ADMIN')
ON CONFLICT (tenant_id) DO NOTHING;
