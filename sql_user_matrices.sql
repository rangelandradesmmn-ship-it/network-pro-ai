CREATE OR REPLACE FUNCTION get_user_matrices_progress(p_user_id UUID)
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
        -- Conta a downline do usuário nesta matriz específica usando CTE recursiva
        (
            WITH RECURSIVE downline AS (
                SELECT mp.user_id, mp.level, mp.matrix_id 
                FROM public.matrix_positions mp 
                WHERE mp.user_id = p_user_id AND mp.matrix_id = m.id
                UNION ALL
                SELECT mp.user_id, mp.level, mp.matrix_id 
                FROM public.matrix_positions mp
                INNER JOIN downline d ON mp.parent_user_id = d.user_id AND mp.matrix_id = d.matrix_id
                WHERE mp.level < d.level + 3 -- Limite de 3 níveis de profundidade (5x5x5 = 155)
            )
            SELECT (COUNT(*) - 1)::INTEGER FROM downline -- Subtrai 1 para não contar o próprio usuário
        ) as total_members,
        155 as capacity,
        -- Se a downline dele chegou a 155, o ciclo DELE está COMPLETED
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
    -- Pega apenas as matrizes onde o usuário tem uma cadeira
    INNER JOIN public.matrix_positions pos ON pos.matrix_id = m.id
    WHERE pos.user_id = p_user_id
    ORDER BY m.matrix_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
