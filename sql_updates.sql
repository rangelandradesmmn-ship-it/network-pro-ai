-- 1. Visão de Ranking Global
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
    public.financial_ledger fl ON fl.user_id = p.id
GROUP BY 
    p.id, p.name, p.avatar_url
ORDER BY 
    total_miles DESC, completed_matrices DESC, direct_referrals DESC;

-- 2. Atualização do Algoritmo de Matriz (Spillover + Comissões)
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
    v_points INTEGER;
    v_level_relative INTEGER;
BEGIN
    -- 1. Achar a matriz ATUAL (em andamento) do patrocinador
    SELECT id, owner_user_id, capacity, total_members, rule_version_id 
    INTO v_matrix_id, v_matrix_owner_id, v_capacity, v_total_members, v_rule_id
    FROM public.matrices
    WHERE owner_user_id = p_sponsor_id AND status = 'IN_PROGRESS'
    ORDER BY created_at DESC LIMIT 1;

    -- Se não tiver matriz (patrocinador = ROOT ou recém cadastrado), criar nova matriz
    IF v_matrix_id IS NULL THEN
        -- Pegar regra padrão (ID 1)
        SELECT id INTO v_rule_id FROM public.matrix_rule_versions ORDER BY id ASC LIMIT 1;
        
        INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id)
        VALUES (p_sponsor_id, 1, 155, v_rule_id)
        RETURNING id INTO v_matrix_id;
        
        v_matrix_owner_id := p_sponsor_id;
        v_capacity := 155;
        v_total_members := 0;
    END IF;

    -- 2. Lógica BFS (Busca em Largura) para achar a primeira posição vazia da esquerda pra direita
    -- Para matriz 5x3, cada nó pode ter até 5 filhos.
    
    -- Pegar todas as posições já ocupadas nesta matriz ordenadas por index
    -- O dono da matriz é considerado index 0 (mas não fica na tabela matrix_positions)
    -- Os filhos diretos do dono são index 1, 2, 3, 4, 5.
    
    -- Achar o menor position_index livre de 1 até v_capacity
    SELECT series.pos INTO v_position_index
    FROM generate_series(1, v_capacity) as series(pos)
    LEFT JOIN public.matrix_positions mp ON mp.matrix_id = v_matrix_id AND mp.position_index = series.pos
    WHERE mp.user_id IS NULL
    ORDER BY series.pos ASC LIMIT 1;

    -- Descobrir quem é o Pai desta posição
    IF v_position_index <= 5 THEN
        -- Primeiro nível, o pai é o dono da matriz
        v_parent_user_id := v_matrix_owner_id;
        v_level := 1;
        v_parent_level := 0;
    ELSE
        -- Fórmula para achar o pai: teto((index - 5) / 5) = index do pai na geração anterior
        -- Exemplo: pos 6, o pai é pos 1. Pos 10, o pai é pos 1. Pos 11, pai é pos 2.
        DECLARE
            v_parent_index INTEGER;
        BEGIN
            v_parent_index := CEIL((v_position_index - 5)::NUMERIC / 5.0);
            
            SELECT user_id, level INTO v_parent_user_id, v_parent_level
            FROM public.matrix_positions 
            WHERE matrix_id = v_matrix_id AND position_index = v_parent_index;
            
            v_level := v_parent_level + 1;
        END;
    END IF;

    -- 3. Inserir a nova pessoa na posição livre
    INSERT INTO public.matrix_positions (
        matrix_id, user_id, sponsor_id, parent_user_id, level, position_index, is_direct_referral
    ) VALUES (
        v_matrix_id, p_new_user_id, p_sponsor_id, v_parent_user_id, v_level, v_position_index, p_sponsor_id = v_parent_user_id
    );

    -- 4. Atualizar total_members da matriz
    UPDATE public.matrices 
    SET total_members = total_members + 1,
        status = CASE WHEN total_members + 1 >= capacity THEN 'COMPLETED'::text ELSE 'IN_PROGRESS'::text END
    WHERE id = v_matrix_id;

    -- 5. Se a matriz completou, criar a próxima matriz (Ciclo)
    IF v_total_members + 1 >= v_capacity THEN
        DECLARE
            v_next_matrix_number INTEGER;
        BEGIN
            SELECT COALESCE(MAX(matrix_number), 0) + 1 INTO v_next_matrix_number
            FROM public.matrices WHERE owner_user_id = v_matrix_owner_id;
            
            INSERT INTO public.matrices (owner_user_id, matrix_number, capacity, rule_version_id)
            VALUES (v_matrix_owner_id, v_next_matrix_number, v_capacity, v_rule_id);
        END;
    END IF;

    -- 6. Pagar Milhas (Financeiro) para o Patrocinador do Nível correspondente
    -- Para matriz de 3 níveis:
    IF v_level = 1 THEN v_points := 20; END IF;
    IF v_level = 2 THEN v_points := 10; END IF;
    IF v_level = 3 THEN v_points := 20; END IF;

    IF v_points IS NOT NULL THEN
        -- Acha a regra de pontos (simplificada)
        INSERT INTO public.financial_ledger (
            user_id, matrix_id, from_user_id, level_earned, amount_miles, description
        ) VALUES (
            v_matrix_owner_id, v_matrix_id, p_new_user_id, v_level, v_points, 
            CASE WHEN p_sponsor_id = v_matrix_owner_id THEN 'Indicação Direta' ELSE 'Spillover (Rede)' END
        );
    END IF;

    -- Retornar sucesso
    RETURN json_build_object(
        'matrix_id', v_matrix_id,
        'position', v_position_index,
        'level', v_level,
        'parent_id', v_parent_user_id,
        'status', CASE WHEN v_total_members + 1 >= v_capacity THEN 'Matrix Completed' ELSE 'Active' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
