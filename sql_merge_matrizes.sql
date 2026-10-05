DO $$
DECLARE
    v_amigo1_id UUID;
    v_matrix1_id UUID;
    v_matrix2_id UUID;
BEGIN
    -- Pega o ID do amigo1
    SELECT id INTO v_amigo1_id FROM public.profiles WHERE name ILIKE '%amigo1%' LIMIT 1;

    -- Pega os IDs das duas matrizes
    SELECT id INTO v_matrix1_id FROM public.matrices WHERE owner_user_id = v_amigo1_id AND matrix_number = 1;
    SELECT id INTO v_matrix2_id FROM public.matrices WHERE owner_user_id = v_amigo1_id AND matrix_number = 2;

    IF v_matrix1_id IS NOT NULL AND v_matrix2_id IS NOT NULL THEN
        -- Move as posições da matriz 2 para a matriz 1
        UPDATE public.matrix_positions SET matrix_id = v_matrix1_id WHERE matrix_id = v_matrix2_id;
        
        -- Move os registros financeiros da matriz 2 para a matriz 1
        UPDATE public.financial_ledger SET matrix_id = v_matrix1_id WHERE matrix_id = v_matrix2_id;
        
        -- Conta quantos usuários tem no total agora
        DECLARE v_total INTEGER; BEGIN
            SELECT count(*) INTO v_total FROM public.matrix_positions WHERE matrix_id = v_matrix1_id;
            
            -- Restaura a Matriz 1 para ATIVA, com 155 de limite e atualiza o total
            UPDATE public.matrices 
            SET status = 'ACTIVE', capacity = 155, total_members = v_total 
            WHERE id = v_matrix1_id;
        END;

        -- Deleta a Matriz 2 que ficou vazia
        DELETE FROM public.matrices WHERE id = v_matrix2_id;
    END IF;
END $$;
