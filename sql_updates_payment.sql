-- 1. Adicionar coluna de STATUS na tabela de milhas (Pendente vs Aprovado)
ALTER TABLE public.financial_ledger ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED';

-- 2. Atualizar a View de Ranking para somar apenas milhas APROVADAS
CREATE OR REPLACE VIEW public.global_ranking AS
SELECT 
    p.id as user_id,
    p.name,
    p.avatar_url,
    COALESCE(SUM(fl.amount_miles), 0) as total_miles,
    (SELECT COUNT(*) FROM public.matrices m WHERE m.owner_user_id = p.id AND m.status = 'COMPLETED') as completed_matrices,
    (SELECT COUNT(*) FROM public.profiles d WHERE d.sponsor_id = p.id) as direct_referrals
FROM 
    public.profiles p
LEFT JOIN 
    public.financial_ledger fl ON fl.user_id = p.id AND fl.status = 'APPROVED'
GROUP BY 
    p.id, p.name, p.avatar_url
ORDER BY 
    total_miles DESC, completed_matrices DESC, direct_referrals DESC;

-- 3. Atualizar o Motor da Matriz para Distribuir em 3 Níveis como PENDENTE
DROP FUNCTION IF EXISTS public.place_user_in_matrix(UUID, UUID);

CREATE OR REPLACE FUNCTION public.place_user_in_matrix(p_sponsor_id UUID, p_new_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_matrix_id UUID;
    v_parent_user_id UUID;
    v_position_index INTEGER;
    v_level INTEGER;
    v_matrix_owner_id UUID;
    v_parent_level INTEGER;
    v_capacity INTEGER;
    v_total_members INTEGER;
    v_rule_id INTEGER;
    
    -- Variáveis pro loop financeiro
    v_current_parent UUID;
    v_loop_level INTEGER;
    v_miles_to_pay INTEGER;
BEGIN
    -- Localiza a matriz do patrocinador
    SELECT id, owner_user_id, capacity, total_members, rule_version_id 
    INTO v_matrix_id, v_matrix_owner_id, v_capacity, v_total_members, v_rule_id
    FROM public.matrices WHERE owner_user_id = p_sponsor_id AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1;

    IF v_matrix_id IS NULL THEN
        SELECT id INTO v_rule_id FROM public.matrix_rule_versions ORDER BY id ASC LIMIT 1;
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id)
        VALUES (p_sponsor_id, 1, 155, v_rule_id) RETURNING id INTO v_matrix_id;
        v_matrix_owner_id := p_sponsor_id; v_capacity := 155; v_total_members := 0;
    END IF;
    
    -- Acha o primeiro buraco
    SELECT series.pos INTO v_position_index FROM generate_series(1, v_capacity) as series(pos)
    LEFT JOIN public.matrix_positions mp ON mp.matrix_id = v_matrix_id AND mp.position_index = series.pos
    WHERE mp.user_id IS NULL ORDER BY series.pos ASC LIMIT 1;

    -- Acha o Pai dessa posição
    IF v_position_index <= 5 THEN
        v_parent_user_id := v_matrix_owner_id; v_level := 1; v_parent_level := 0;
    ELSE
        DECLARE v_parent_index INTEGER; BEGIN
            v_parent_index := CEIL((v_position_index - 5)::NUMERIC / 5.0);
            SELECT user_id, level INTO v_parent_user_id, v_parent_level FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND position_index = v_parent_index;
            v_level := v_parent_level + 1;
        END;
    END IF;

    -- Senta o usuário na cadeira
    INSERT INTO public.matrix_positions (matrix_id, user_id, sponsor_id, parent_user_id, level, position_index, is_direct_referral) 
    VALUES (v_matrix_id, p_new_user_id, p_sponsor_id, v_parent_user_id, v_level, v_position_index, p_sponsor_id = v_parent_user_id);

    -- Atualiza capacidade da matriz
    UPDATE public.matrices SET total_members = total_members + 1, status = CASE WHEN total_members + 1 >= capacity THEN 'COMPLETED'::text ELSE 'ACTIVE'::text END WHERE id = v_matrix_id;

    -- Se lotou, cria a próxima
    IF v_total_members + 1 >= v_capacity THEN
        DECLARE v_next_matrix_number INTEGER; BEGIN
            SELECT COALESCE(MAX(matrix_number), 0) + 1 INTO v_next_matrix_number FROM public.matrices WHERE owner_user_id = v_matrix_owner_id;
            INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id) VALUES (v_matrix_owner_id, v_next_matrix_number, v_capacity, v_rule_id);
        END;
    END IF;

    -- ==========================================
    -- SISTEMA DE PAGAMENTO: 3 NÍVEIS (PENDENTE)
    -- ==========================================
    v_current_parent := v_parent_user_id;
    v_loop_level := 1;
    
    WHILE v_current_parent IS NOT NULL AND v_loop_level <= 3 LOOP
        -- Regra de distribuição: Nível 1 (20), Nível 2 (10), Nível 3 (20)
        IF v_loop_level = 1 THEN v_miles_to_pay := 20; END IF;
        IF v_loop_level = 2 THEN v_miles_to_pay := 10; END IF;
        IF v_loop_level = 3 THEN v_miles_to_pay := 20; END IF;

        -- Lança no extrato como PENDING
        INSERT INTO public.financial_ledger (user_id, matrix_id, from_user_id, level_earned, amount_miles, description, status) 
        VALUES (v_current_parent, v_matrix_id, p_new_user_id, v_loop_level, v_miles_to_pay, 
                CASE WHEN p_sponsor_id = v_current_parent THEN 'Indicação Direta' ELSE 'Spillover (Rede)' END, 'PENDING');

        -- Sobe 1 nível na árvore para pagar o próximo
        SELECT parent_user_id INTO v_current_parent FROM public.matrix_positions 
        WHERE matrix_id = v_matrix_id AND user_id = v_current_parent LIMIT 1;
        
        v_loop_level := v_loop_level + 1;
    END LOOP;

    RETURN json_build_object('matrix_id', v_matrix_id, 'status', 'Active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
