-- Atualiza a função de entrada na matriz para usar as comissões dinâmicas
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
    
    -- Variaveis de comissao
    v_c1 INTEGER := 20;
    v_c2 INTEGER := 10;
    v_c3 INTEGER := 20;
BEGIN
    -- Busca as configurações de comissão do tenant
    SELECT commission_level_1, commission_level_2, commission_level_3 
    INTO v_c1, v_c2, v_c3 
    FROM public.tenant_settings WHERE tenant_id = p_tenant_id;
    
    IF v_c1 IS NULL THEN v_c1 := 20; END IF;
    IF v_c2 IS NULL THEN v_c2 := 10; END IF;
    IF v_c3 IS NULL THEN v_c3 := 20; END IF;

    -- Localiza a matriz do TENANT (A Empresa)
    SELECT id, owner_user_id, capacity, total_members, rule_version_id 
    INTO v_matrix_id, v_matrix_owner_id, v_capacity, v_total_members, v_rule_id
    FROM public.matrices WHERE owner_user_id = p_tenant_id AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1;

    IF v_matrix_id IS NULL THEN
        SELECT id INTO v_rule_id FROM public.matrix_rule_versions ORDER BY id DESC LIMIT 1;
        IF v_rule_id IS NULL THEN v_rule_id := 1; END IF;
        
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id)
        VALUES (p_tenant_id, 1, 155, v_rule_id) RETURNING id INTO v_matrix_id;
        v_matrix_owner_id := p_tenant_id;
        v_capacity := 155;
        v_total_members := 0;
    END IF;

    IF v_total_members >= v_capacity THEN
        RETURN json_build_object('success', false, 'error', 'A matriz da empresa já está cheia (155 membros).');
    END IF;

    -- Lógica de Posicionamento (BFS - Esquerda para Direita)
    SELECT coalesce(min(expected.index), 1) INTO v_total_members
    FROM generate_series(1, 155) expected(index)
    LEFT JOIN public.matrix_positions mp ON mp.matrix_id = v_matrix_id AND mp.position_index = expected.index
    WHERE mp.user_id IS NULL; -- onde não tem registro

    -- Determina o Parent (Upline) e o Level baseado na posição
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

    -- Previne erro caso o Upliner não seja encontrado (fallback)
    IF v_parent_id IS NULL THEN v_parent_id := p_sponsor_id; END IF;

    INSERT INTO public.matrix_positions (matrix_id, user_id, parent_user_id, level, position_index, sponsor_id)
    VALUES (v_matrix_id, p_new_user_id, v_parent_id, COALESCE(v_new_level, 1), v_total_members, p_sponsor_id);

    UPDATE public.matrices SET total_members = total_members + 1 WHERE id = v_matrix_id;

    -- Distribuir Comissões (Nível 1 a 3) usando os valores dinâmicos
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
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id)
        SELECT owner_user_id, matrix_number + 1, capacity, rule_version_id FROM public.matrices WHERE id = v_matrix_id;
    END IF;

    RETURN json_build_object('success', true, 'matrix_id', v_matrix_id, 'parent_id', v_parent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atualiza a função de renovação de mensalidade
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
    -- Descobre o tenant_id do usuário logado
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;

    -- Busca as configurações de comissão do tenant
    SELECT commission_level_1, commission_level_2, commission_level_3 
    INTO v_c1, v_c2, v_c3 
    FROM public.tenant_settings WHERE tenant_id = v_tenant_id;
    
    IF v_c1 IS NULL THEN v_c1 := 20; END IF;
    IF v_c2 IS NULL THEN v_c2 := 10; END IF;
    IF v_c3 IS NULL THEN v_c3 := 20; END IF;

    -- Busca onde o usuário está posicionado
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
