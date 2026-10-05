ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_until TIMESTAMP WITH TIME ZONE;

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
BEGIN
    -- Busca onde o usuário está posicionado para saber quem são os uplines
    SELECT matrix_id, parent_user_id INTO v_matrix_id, v_parent_user_id 
    FROM public.matrix_positions WHERE user_id = p_user_id LIMIT 1;

    IF v_parent_user_id IS NOT NULL THEN
        v_current_parent := v_parent_user_id;
        v_loop_level := 1;
        
        WHILE v_current_parent IS NOT NULL AND v_loop_level <= 3 LOOP
            IF v_loop_level = 1 THEN v_miles_to_pay := 20; END IF;
            IF v_loop_level = 2 THEN v_miles_to_pay := 10; END IF;
            IF v_loop_level = 3 THEN v_miles_to_pay := 20; END IF;

            INSERT INTO public.financial_ledger (user_id, matrix_id, from_user_id, level_earned, amount_miles, description, status) 
            VALUES (v_current_parent, v_matrix_id, p_user_id, v_loop_level, v_miles_to_pay, 'Renovação de Mensalidade', 'PENDING');

            SELECT parent_user_id INTO v_current_parent FROM public.matrix_positions WHERE matrix_id = v_matrix_id AND user_id = v_current_parent LIMIT 1;
            v_loop_level := v_loop_level + 1;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
