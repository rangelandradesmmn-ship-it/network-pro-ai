CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    saas_fee INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO public.system_settings (id, saas_fee) VALUES (1, 500) ON CONFLICT DO NOTHING;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
