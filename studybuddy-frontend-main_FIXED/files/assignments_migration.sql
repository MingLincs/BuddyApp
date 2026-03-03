-- Create assignments table in Supabase

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    points INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON assignments(completed);

-- Add columns to classes table for syllabus data
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS has_syllabus BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instructor TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS grading_policy TEXT;

-- Enable Row Level Security
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own assignments
CREATE POLICY "Users can view own assignments" ON assignments
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Create policy: Users can insert their own assignments
CREATE POLICY "Users can insert own assignments" ON assignments
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Create policy: Users can update their own assignments
CREATE POLICY "Users can update own assignments" ON assignments
    FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Create policy: Users can delete their own assignments
CREATE POLICY "Users can delete own assignments" ON assignments
    FOR DELETE
    USING (auth.uid()::text = user_id);
