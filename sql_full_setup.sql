-- ============================================================================
-- NETWORK PRO AI - SETUP COMPLETO E IDEMPOTENTE
-- Execute este arquivo inteiro no SQL Editor do novo projeto Supabase.
-- ============================================================================

-- 1. TABELAS PRINCIPAIS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    avatar_url TEXT,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    sponsor_id UUID REFERENCES public.profiles(id),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    pix_key TEXT,
    activated_at TIMESTAMP WITH TIME ZONE,
    active_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_until TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.matrix_rule_versions (
    id SERIAL PRIMARY KEY,
    level_1_points NUMERIC NOT NULL DEFAULT 20,
    level_2_points NUMERIC NOT NULL DEFAULT 10,
    level_3_points NUMERIC NOT NULL DEFAULT 20,
    capacity INT NOT NULL DEFAULT 155,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.matrix_rule_versions (id, level_1_points, level_2_points, level_3_points, capacity)
VALUES (1, 20, 10, 20, 155)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    matrix_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    total_members INT DEFAULT 0,
    capacity INT NOT NULL DEFAULT 155,
    rule_version_id INT NOT NULL REFERENCES public.matrix_rule_versions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(owner_user_id, matrix_number)
);

ALTER TABLE public.matrices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.matrix_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matrix_id UUID NOT NULL REFERENCES public.matrices(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    sponsor_id UUID NOT NULL REFERENCES public.profiles(id),
    parent_user_id UUID REFERENCES public.profiles(id),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    level INT NOT NULL,
    position_index INT NOT NULL,
    is_direct_referral BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matrix_id, position_index),
    UNIQUE(matrix_id, user_id)
);

ALTER TABLE public.matrix_positions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.mileage_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount NUMERIC NOT NULL,
    type VARCHAR(50) NOT NULL,
    level INT,
    source_user_id UUID REFERENCES public.profiles(id),
    matrix_id UUID REFERENCES public.matrices(id),
    description TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, matrix_id, source_user_id, level, type)
);

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    matrix_id UUID REFERENCES public.matrices(id),
    from_user_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    level_earned INTEGER NOT NULL,
    amount_miles INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'APPROVED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.financial_ledger ALTER COLUMN matrix_id DROP NOT NULL;
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED';
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_miles INTEGER NOT NULL,
    pix_key TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    saas_fee INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.system_settings (id, saas_fee)
VALUES (1, 500)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.profiles(id),
    company_name TEXT DEFAULT 'NETWORK PRO AI',
    primary_color TEXT DEFAULT '#00AEEF',
    secondary_color TEXT DEFAULT '#00E5FF',
    bg_color TEXT DEFAULT '#07111F',
    panel_color TEXT DEFAULT '#0E1B2B',
    commission_level_1 INTEGER DEFAULT 20,
    commission_level_2 INTEGER DEFAULT 10,
    commission_level_3 INTEGER DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#07111F';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS panel_color TEXT DEFAULT '#0E1B2B';

-- 2. DESABILITAR RLS NAS TABELAS DA APLICAÇÃO
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_rule_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings DISABLE ROW LEVEL SECURITY;

-- 3. VIEW DE RANKING GLOBAL
DROP VIEW IF EXISTS public.global_ranking;
CREATE OR REPLACE VIEW public.global_ranking AS
SELECT 
    p.tenant_id,
    p.id AS user_id,
    p.name,
    p.avatar_url,
    COALESCE(SUM(fl.amount_miles), 0) AS total_miles,
    (SELECT COUNT(*) FROM public.matrices m WHERE m.owner_user_id = p.id AND m.status = 'COMPLETED') AS completed_matrices,
    (SELECT COUNT(*) FROM public.profiles d WHERE d.sponsor_id = p.id) AS direct_referrals
FROM 
    public.profiles p
LEFT JOIN 
    public.financial_ledger fl ON fl.user_id = p.id AND fl.status = 'APPROVED'
GROUP BY 
    p.tenant_id, p.id, p.name, p.avatar_url
ORDER BY 
    total_miles DESC, completed_matrices DESC, direct_referrals DESC;

-- 4. FUNÇÕES RPC
CREATE OR REPLACE FUNCTION public.place_user_in_matrix(p_sponsor_id UUID, p_new_user_id UUID, p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
    v_matrix_id UUID;
    v_matrix_owner_id UUID;
    v_capacity INTEGER;
    v_total_members INTEGER;
    v_rule_id INTEGER;
    v_parent_id UUID;
    v_new_level INTEGER;
    v_current_parent UUID;
    v_loop_level INTEGER;
    v_miles_to_pay INTEGER;
    v_c1 INTEGER := 20;
    v_c2 INTEGER := 10;
    v_c3 INTEGER := 20;
BEGIN
    SELECT commission_level_1, commission_level_2, commission_level_3 
    INTO v_c1, v_c2, v_c3 
    FROM public.tenant_settings WHERE tenant_id = p_tenant_id;
    
    IF v_c1 IS NULL THEN v_c1 := 20; END IF;
    IF v_c2 IS NULL THEN v_c2 := 10; END IF;
    IF v_c3 IS NULL THEN v_c3 := 20; END IF;

    SELECT id, owner_user_id, capacity, total_members, rule_version_id 
    INTO v_matrix_id, v_matrix_owner_id, v_capacity, v_total_members, v_rule_id
    FROM public.matrices WHERE owner_user_id = p_tenant_id AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1;

    IF v_matrix_id IS NULL THEN
        SELECT id INTO v_rule_id FROM public.matrix_rule_versions ORDER BY id DESC LIMIT 1;
        IF v_rule_id IS NULL THEN v_rule_id := 1; END IF;
        
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id, tenant_id)
        VALUES (p_tenant_id, 1, 155, v_rule_id, p_tenant_id) RETURNING id INTO v_matrix_id;
        v_matrix_owner_id := p_tenant_id;
        v_capacity := 155;
        v_total_members := 0;
    END IF;

    IF v_total_members >= v_capacity THEN
        RETURN json_build_object('success', false, 'error', 'A matriz da empresa já está cheia (155 membros).');
    END IF;

    SELECT coalesce(min(expected.index), 1) INTO v_total_members
    FROM generate_series(1, 155) expected(index)
    LEFT JOIN public.matrix_positions mp ON mp.matrix_id = v_matrix_id AND mp.position_index = expected.index
    WHERE mp.user_id IS NULL;

    IF v_total_members <= 5 THEN
        v_parent_id := p_sponsor_id;
        v_new_level := 1;
    ELSIF v_total_members <= 30 THEN
        SELECT user_id INTO v_parent_id FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND position_index = ceil((v_total_members - 5) / 5.0);
        v_new_level := 2;
    ELSE
        SELECT user_id INTO v_parent_id FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND position_index = ceil((v_total_members - 5) / 5.0);
        v_new_level := 3;
    END IF;

    IF v_parent_id IS NULL THEN v_parent_id := p_sponsor_id; END IF;

    INSERT INTO public.matrix_positions (matrix_id, user_id, parent_user_id, level, position_index, sponsor_id, tenant_id)
    VALUES (v_matrix_id, p_new_user_id, v_parent_id, COALESCE(v_new_level, 1), v_total_members, p_sponsor_id, p_tenant_id);

    UPDATE public.matrices SET total_members = total_members + 1 WHERE id = v_matrix_id;

    v_current_parent := v_parent_id;
    v_loop_level := 1;
    
    WHILE v_current_parent IS NOT NULL AND v_loop_level <= 3 LOOP
        IF v_loop_level = 1 THEN v_miles_to_pay := v_c1; END IF;
        IF v_loop_level = 2 THEN v_miles_to_pay := v_c2; END IF;
        IF v_loop_level = 3 THEN v_miles_to_pay := v_c3; END IF;

        INSERT INTO public.financial_ledger (user_id, matrix_id, from_user_id, level_earned, amount_miles, description, status, tenant_id) 
        VALUES (v_current_parent, v_matrix_id, p_new_user_id, v_loop_level, v_miles_to_pay, 
                CASE WHEN v_current_parent = p_sponsor_id THEN 'Indicação Direta' ELSE 'Spillover (Derramamento)' END, 
                'PENDING', p_tenant_id);

        SELECT parent_user_id INTO v_current_parent FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND user_id = v_current_parent LIMIT 1;
        v_loop_level := v_loop_level + 1;
    END LOOP;

    IF v_total_members + 1 >= v_capacity THEN
        UPDATE public.matrices SET status = 'COMPLETED' WHERE id = v_matrix_id;
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id, tenant_id)
        SELECT owner_user_id, matrix_number + 1, capacity, rule_version_id, tenant_id FROM public.matrices WHERE id = v_matrix_id;
    END IF;

    RETURN json_build_object('success', true, 'matrix_id', v_matrix_id, 'parent_id', v_parent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_matrices_progress(p_user_id UUID)
RETURNS TABLE (
    matrix_id UUID,
    matrix_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    total_members INTEGER,
    capacity INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as matrix_id,
        m.matrix_number,
        m.created_at,
        (
            WITH RECURSIVE downline AS (
                SELECT mp.user_id, mp.level, mp.matrix_id 
                FROM public.matrix_positions mp 
                WHERE mp.user_id = p_user_id AND mp.matrix_id = m.id
                UNION ALL
                SELECT mp.user_id, mp.level, mp.matrix_id 
                FROM public.matrix_positions mp
                INNER JOIN downline d ON mp.parent_user_id = d.user_id AND mp.matrix_id = d.matrix_id
                WHERE mp.level < d.level + 3
            )
            SELECT (COUNT(*) - 1)::INTEGER FROM downline
        ) as total_members,
        155 as capacity,
        CASE 
            WHEN (
                WITH RECURSIVE downline AS (
                    SELECT mp.user_id, mp.level, mp.matrix_id FROM public.matrix_positions mp WHERE mp.user_id = p_user_id AND mp.matrix_id = m.id
                    UNION ALL
                    SELECT mp.user_id, mp.level, mp.matrix_id FROM public.matrix_positions mp
                    INNER JOIN downline d ON mp.parent_user_id = d.user_id AND mp.matrix_id = d.matrix_id
                    WHERE mp.level < d.level + 3
                )
                SELECT (COUNT(*) - 1) FROM downline
            ) >= 155 THEN 'COMPLETED'
            ELSE 'ACTIVE'
        END as status
    FROM public.matrices m
    INNER JOIN public.matrix_positions pos ON pos.matrix_id = m.id
    WHERE pos.user_id = p_user_id
    ORDER BY m.matrix_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.renew_user_subscription(p_user_id UUID, p_days INTEGER)
RETURNS VOID AS $$
DECLARE
    v_current_active_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT active_until INTO v_current_active_until FROM public.profiles WHERE id = p_user_id;
    
    IF v_current_active_until IS NULL OR v_current_active_until < NOW() THEN
        UPDATE public.profiles SET activated_at = COALESCE(activated_at, NOW()), active_until = NOW() + (p_days || ' days')::INTERVAL WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles SET active_until = active_until + (p_days || ' days')::INTERVAL WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_renewal_commissions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_matrix_id UUID;
    v_parent_user_id UUID;
    v_current_parent UUID;
    v_loop_level INTEGER;
    v_miles_to_pay INTEGER;
    v_tenant_id UUID;
    v_c1 INTEGER := 20;
    v_c2 INTEGER := 10;
    v_c3 INTEGER := 20;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;

    SELECT commission_level_1, commission_level_2, commission_level_3 
    INTO v_c1, v_c2, v_c3 
    FROM public.tenant_settings WHERE tenant_id = v_tenant_id;
    
    IF v_c1 IS NULL THEN v_c1 := 20; END IF;
    IF v_c2 IS NULL THEN v_c2 := 10; END IF;
    IF v_c3 IS NULL THEN v_c3 := 20; END IF;

    SELECT matrix_id, parent_user_id INTO v_matrix_id, v_parent_user_id 
    FROM public.matrix_positions WHERE user_id = p_user_id LIMIT 1;

    IF v_parent_user_id IS NOT NULL THEN
        v_current_parent := v_parent_user_id;
        v_loop_level := 1;
        
        WHILE v_current_parent IS NOT NULL AND v_loop_level <= 3 LOOP
            IF v_loop_level = 1 THEN v_miles_to_pay := v_c1; END IF;
            IF v_loop_level = 2 THEN v_miles_to_pay := v_c2; END IF;
            IF v_loop_level = 3 THEN v_miles_to_pay := v_c3; END IF;

            INSERT INTO public.financial_ledger (user_id, matrix_id, from_user_id, level_earned, amount_miles, description, status, tenant_id) 
            VALUES (v_current_parent, v_matrix_id, p_user_id, v_loop_level, v_miles_to_pay, 'Renovação de Mensalidade', 'PENDING', v_tenant_id);

            SELECT parent_user_id INTO v_current_parent FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND user_id = v_current_parent LIMIT 1;
            v_loop_level := v_loop_level + 1;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. STORAGE (BUCKET DE AVATARES)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Permitir Uploads no Avatar" ON storage.objects;
CREATE POLICY "Permitir Uploads no Avatar"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 6. RECARREGAR CACHE DA API
NOTIFY pgrst, 'reload schema';
