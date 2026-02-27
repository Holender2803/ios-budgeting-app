-- Migration: change google_calendar_events to track per-expense rather than per-day

-- 1. Drop the old table (it only tracked per-day anyway)
DROP TABLE IF EXISTS google_calendar_events;

-- 2. Create the new per-expense tracking table
CREATE TABLE google_calendar_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expense_id text NOT NULL, -- The transaction ID (or virtual ID like ruleId-1999-01-01)
    day date NOT NULL,
    google_event_id text NOT NULL,
    UNIQUE(user_id, google_event_id)
);

-- 3. Add an index for quick lookups by expense_id
CREATE INDEX google_calendar_events_expense_idx ON google_calendar_events(user_id, expense_id);

-- 4. Enable RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- 5. Add Policy
CREATE POLICY "Users can manage their own calendar events"
    ON google_calendar_events
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
