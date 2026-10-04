CREATE OR REPLACE FUNCTION place_user_in_matrix(
    p_sponsor_id UUID,
    p_new_user_id UUID
) RETURNS VOID AS $$
DECLARE
    v_active_matrix RECORD;
    v_next_index INT;
    v_parent_index INT;
    v_parent_user_id UUID;
    v_level INT;
    v_points NUMERIC;
    v_rule RECORD;
    v_is_direct BOOLEAN;
BEGIN
    -- 1. Find active matrix of sponsor and lock it to prevent race conditions
    SELECT * INTO v_active_matrix
    FROM matrices
    WHERE owner_user_id = p_sponsor_id AND status = 'ACTIVE'
    ORDER BY matrix_number ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active matrix found for sponsor';
    END IF;

    -- 2. Find next available position (BFS)
    SELECT coalesce(min(expected.index), 1) INTO v_next_index
    FROM generate_series(1, 155) expected(index)
    LEFT JOIN matrix_positions mp ON mp.matrix_id = v_active_matrix.id AND mp.position_index = expected.index
    WHERE mp.id IS NULL;

    IF v_next_index > 155 THEN
        RAISE EXCEPTION 'Matrix is full';
    END IF;

    -- 3. Determine Parent and Level
    IF v_next_index <= 5 THEN
        v_parent_user_id := p_sponsor_id;
        v_level := 1;
    ELSIF v_next_index <= 30 THEN
        v_parent_index := ceil((v_next_index - 5) / 5.0);
        SELECT user_id INTO v_parent_user_id FROM matrix_positions WHERE matrix_id = v_active_matrix.id AND position_index = v_parent_index;
        v_level := 2;
    ELSE
        v_parent_index := ceil((v_next_index - 5) / 5.0);
        SELECT user_id INTO v_parent_user_id FROM matrix_positions WHERE matrix_id = v_active_matrix.id AND position_index = v_parent_index;
        v_level := 3;
    END IF;

    v_is_direct := (v_parent_user_id = p_sponsor_id);

    -- 4. Insert position
    INSERT INTO matrix_positions (matrix_id, user_id, sponsor_id, parent_user_id, level, position_index, is_direct_referral)
    VALUES (v_active_matrix.id, p_new_user_id, p_sponsor_id, v_parent_user_id, v_level, v_next_index, v_is_direct);

    -- 5. Calculate Points
    SELECT * INTO v_rule FROM matrix_rule_versions WHERE id = v_active_matrix.rule_version_id;
    IF v_level = 1 THEN v_points := v_rule.level_1_points;
    ELSIF v_level = 2 THEN v_points := v_rule.level_2_points;
    ELSIF v_level = 3 THEN v_points := v_rule.level_3_points;
    END IF;

    -- 6. Issue Points
    INSERT INTO mileage_transactions (user_id, amount, type, level, source_user_id, matrix_id, description)
    VALUES (p_sponsor_id, v_points, 'CREDIT', v_level, p_new_user_id, v_active_matrix.id, 'Points for new member placement');

    -- 7. Update matrix members count
    UPDATE matrices SET total_members = total_members + 1 WHERE id = v_active_matrix.id;

    -- 8. Check if matrix is now complete
    IF (v_active_matrix.total_members + 1) >= 155 THEN
        -- Mark as complete
        UPDATE matrices SET status = 'COMPLETED', completed_at = NOW() WHERE id = v_active_matrix.id;
        
        -- Create new matrix
        INSERT INTO matrices (owner_user_id, matrix_number, status, total_members, capacity, rule_version_id)
        VALUES (p_sponsor_id, v_active_matrix.matrix_number + 1, 'ACTIVE', 0, 155, v_active_matrix.rule_version_id);
    END IF;

    -- 9. Create an active matrix for the new user (they start their own cycle)
    INSERT INTO matrices (owner_user_id, matrix_number, status, total_members, capacity, rule_version_id)
    VALUES (p_new_user_id, 1, 'ACTIVE', 0, 155, v_active_matrix.rule_version_id);

END;
$$ LANGUAGE plpgsql;
