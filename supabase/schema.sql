-- supabase/schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------
-- 1. expenses
-------------------------------------------------------------------------------
CREATE TABLE expenses (
    id uuid PRIMARY KEY, -- supplied by client (crypto.randomUUID)
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor text NOT NULL,
    category_id text NOT NULL, 
    amount numeric NOT NULL,
    date date NOT NULL, 
    note text,
    photo_url text,
    is_recurring boolean DEFAULT false,
    recurrence_type text, 
    end_date date,
    is_active boolean DEFAULT true,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE INDEX expenses_user_updated_idx ON expenses(user_id, updated_at);
CREATE INDEX expenses_user_deleted_idx ON expenses(user_id, deleted_at);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expenses"
    ON expenses
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 2. categories
-------------------------------------------------------------------------------
CREATE TABLE categories (
    id text PRIMARY KEY, -- text to support default 'cat-food' style ids
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    icon text,
    color text,
    "group" text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE INDEX categories_user_updated_idx ON categories(user_id, updated_at);
CREATE INDEX categories_user_deleted_idx ON categories(user_id, deleted_at);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own categories"
    ON categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 3. vendor_rules
-------------------------------------------------------------------------------
CREATE TABLE vendor_rules (
    id uuid PRIMARY KEY, -- supplied by client
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_contains text NOT NULL,
    category_id text NOT NULL,
    source text DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE INDEX vendor_rules_user_updated_idx ON vendor_rules(user_id, updated_at);
CREATE INDEX vendor_rules_user_deleted_idx ON vendor_rules(user_id, deleted_at);

ALTER TABLE vendor_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vendor rules"
    ON vendor_rules
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 4. recurring_exceptions
-------------------------------------------------------------------------------
CREATE TABLE recurring_exceptions (
    rule_id uuid NOT NULL,
    date date NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skipped boolean DEFAULT false,
    note text,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    PRIMARY KEY (rule_id, date)
);

CREATE INDEX recurring_exceptions_user_updated_idx ON recurring_exceptions(user_id, updated_at);
CREATE INDEX recurring_exceptions_user_deleted_idx ON recurring_exceptions(user_id, deleted_at);

ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring exceptions"
    ON recurring_exceptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
