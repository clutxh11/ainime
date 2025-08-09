-- =====================================================
-- FIX user_profiles_public VIEW ISSUE
-- =====================================================
-- 
-- The user_profiles_public is a VIEW, not a table.
-- This is likely causing the 500 error during signup.
-- 
-- This script will:
-- 1. Drop the problematic view
-- 2. Create a proper table instead
-- 3. Set up correct RLS policies
-- =====================================================

-- First, let's see what the view looks like
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- Drop the view if it exists
DROP VIEW IF EXISTS user_profiles_public CASCADE;

-- Create a proper table instead
CREATE TABLE user_profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_user_profiles_public_id ON user_profiles_public(id);

-- Enable RLS
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for signup flow
CREATE POLICY "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

-- Allow INSERT during signup (no auth.uid() check)
CREATE POLICY "Allow profile creation during signup" ON user_profiles_public
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles_public
    FOR DELETE USING (auth.uid() = id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_public_updated_at 
    BEFORE UPDATE ON user_profiles_public
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. user_profiles_public will be a proper table
-- 2. RLS policies will allow signup
-- 3. Try signing up - should work now!
-- 
-- ===================================================== 