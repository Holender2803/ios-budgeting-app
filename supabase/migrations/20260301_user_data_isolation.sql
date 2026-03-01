-- Migration: enforce per-user isolation for synced app data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
    ended_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS categories (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    icon text,
    color text,
    "group" text,
    is_system boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS vendor_rules (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_contains text NOT NULL,
    category_id text NOT NULL,
    source text DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS recurring_exceptions (
    rule_id uuid NOT NULL,
    date date NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    skipped boolean DEFAULT false,
    note text,
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    PRIMARY KEY (rule_id, date)
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE vendor_rules ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE recurring_exceptions ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'expenses_user_id_fkey'
    ) THEN
        ALTER TABLE expenses
        ADD CONSTRAINT expenses_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'categories_user_id_fkey'
    ) THEN
        ALTER TABLE categories
        ADD CONSTRAINT categories_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'vendor_rules_user_id_fkey'
    ) THEN
        ALTER TABLE vendor_rules
        ADD CONSTRAINT vendor_rules_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'recurring_exceptions_user_id_fkey'
    ) THEN
        ALTER TABLE recurring_exceptions
        ADD CONSTRAINT recurring_exceptions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS expenses_user_updated_idx ON expenses(user_id, updated_at);
CREATE INDEX IF NOT EXISTS expenses_user_deleted_idx ON expenses(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS categories_user_updated_idx ON categories(user_id, updated_at);
CREATE INDEX IF NOT EXISTS categories_user_deleted_idx ON categories(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS vendor_rules_user_updated_idx ON vendor_rules(user_id, updated_at);
CREATE INDEX IF NOT EXISTS vendor_rules_user_deleted_idx ON vendor_rules(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS recurring_exceptions_user_updated_idx ON recurring_exceptions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS recurring_exceptions_user_deleted_idx ON recurring_exceptions(user_id, deleted_at);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', policy_name);
    END LOOP;

    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', policy_name);
    END LOOP;

    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendor_rules'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendor_rules', policy_name);
    END LOOP;

    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recurring_exceptions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.recurring_exceptions', policy_name);
    END LOOP;
END $$;

CREATE POLICY expenses_user_isolation
    ON expenses
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_user_isolation
    ON categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY vendor_rules_user_isolation
    ON vendor_rules
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_exceptions_user_isolation
    ON recurring_exceptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM expenses WHERE user_id IS NULL) THEN
        ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE user_id IS NULL) THEN
        ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendor_rules WHERE user_id IS NULL) THEN
        ALTER TABLE vendor_rules ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM recurring_exceptions WHERE user_id IS NULL) THEN
        ALTER TABLE recurring_exceptions ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;
