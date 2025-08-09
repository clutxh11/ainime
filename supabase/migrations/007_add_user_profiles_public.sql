-- =====================================================
-- ADD MISSING user_profiles_public TABLE
-- =====================================================
-- 
-- This script adds the missing user_profiles_public table
-- that's causing the 500 error during signup.
-- 
-- Run this in your Supabase SQL Editor to fix the signup issue.
-- =====================================================

-- Create user_profiles_public table (for public user data)
CREATE TABLE IF NOT EXISTS user_profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_public_id ON user_profiles_public(id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles_public
CREATE POLICY IF NOT EXISTS "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can create their own profile" ON user_profiles_public
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can delete their own profile" ON user_profiles_public
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
CREATE TRIGGER IF NOT EXISTS update_user_profiles_public_updated_at 
    BEFORE UPDATE ON user_profiles_public
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script, you should be able to:
-- 1. Sign up without getting a 500 error
-- 2. See the user_profiles_public table in your database
-- 3. Have proper RLS policies for user data
-- 
-- ===================================================== 