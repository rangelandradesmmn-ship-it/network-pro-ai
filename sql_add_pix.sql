ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
