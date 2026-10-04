-- Users extension (assuming Supabase auth.users exists, we use profiles to link)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    avatar_url TEXT,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    sponsor_id UUID REFERENCES profiles(id),
    role VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matrix Rule Versions
CREATE TABLE matrix_rule_versions (
    id SERIAL PRIMARY KEY,
    level_1_points NUMERIC NOT NULL DEFAULT 20,
    level_2_points NUMERIC NOT NULL DEFAULT 10,
    level_3_points NUMERIC NOT NULL DEFAULT 20,
    capacity INT NOT NULL DEFAULT 155,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matrices
CREATE TABLE matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES profiles(id),
    matrix_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED
    total_members INT DEFAULT 0,
    capacity INT NOT NULL DEFAULT 155,
    rule_version_id INT NOT NULL REFERENCES matrix_rule_versions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(owner_user_id, matrix_number)
);

-- Matrix Positions
CREATE TABLE matrix_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matrix_id UUID NOT NULL REFERENCES matrices(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    sponsor_id UUID NOT NULL REFERENCES profiles(id),
    parent_user_id UUID REFERENCES profiles(id),
    level INT NOT NULL,
    position_index INT NOT NULL,
    is_direct_referral BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matrix_id, position_index),
    UNIQUE(matrix_id, user_id)
);

-- Mileage Transactions
CREATE TABLE mileage_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC NOT NULL,
    type VARCHAR(50) NOT NULL, -- CREDIT, DEBIT
    level INT,
    source_user_id UUID REFERENCES profiles(id),
    matrix_id UUID REFERENCES matrices(id),
    description TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, matrix_id, source_user_id, level, type) -- Avoid duplicate points
);
