DO $$
DECLARE
    v_amigo1_id UUID;
    v_matrix1_id UUID;
    v_matrix2_id UUID;
    v_user_moved_id UUID;
BEGIN
    SELECT id INTO v_amigo1_id FROM public.profiles WHERE name ILIKE '%amigo1%' LIMIT 1;
    SELECT id INTO v_matrix1_id FROM public.matrices WHERE owner_user_id = v_amigo1_id AND matrix_number = 1;
    SELECT id INTO v_matrix2_id FROM public.matrices WHERE owner_user_id = v_amigo1_id AND matrix_number = 2;

    IF v_matrix1_id IS NOT NULL AND v_matrix2_id IS NOT NULL THEN
        -- Pega o ID de quem caiu na matriz 2 (o amigo13)
        SELECT user_id INTO v_user_moved_id FROM public.matrix_positions WHERE matrix_id = v_matrix2_id LIMIT 1;

        IF v_user_moved_id IS NOT NULL THEN
            -- Deleta os registros soltos da matriz 2
            DELETE FROM public.financial_ledger WHERE matrix_id = v_matrix2_id;
            DELETE FROM public.matrix_positions WHERE matrix_id = v_matrix2_id;
            
            -- Deleta a matriz 2
            DELETE FROM public.matrices WHERE id = v_matrix2_id;

            -- Restaura a matriz 1 para o tamanho oficial
            UPDATE public.matrices SET status = 'ACTIVE', capacity = 155 WHERE id = v_matrix1_id;

            -- Usa o motor inteligente para recolocar a pessoa na Cadeira 13 (passando 3 argumentos)
            PERFORM public.place_user_in_matrix(v_amigo1_id, v_user_moved_id, v_amigo1_id);
        END IF;
    END IF;
END $$;
