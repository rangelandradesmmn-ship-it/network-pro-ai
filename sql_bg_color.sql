ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#07111F';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS panel_color TEXT DEFAULT '#0E1B2B';
