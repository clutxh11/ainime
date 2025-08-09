-- =====================================================
-- FIX user_profiles TABLE ISSUE
-- =====================================================
-- 
-- The existing trigger 'handle_new_user' is trying to INSERT into
-- public.user_profiles, but this table might not exist or have issues.
-- 
-- This script will:
-- 1. Check if user_profiles table exists
-- 2. Create it if it doesn't exist
-- 3. Set up proper RLS policies
-- 4. Fix the trigger to work correctly
-- =====================================================

-- First, let's see what tables exist
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_profiles_public');

-- Check if user_profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as user_profiles_exists;

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;

-- Create permissive policies for signup flow
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

-- Allow INSERT during signup (no auth.uid() check)
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the existing trigger function to handle errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert into user_profiles
    INSERT INTO public.user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the user_profiles_public view/table for compatibility
-- Drop the view if it exists
DROP VIEW IF EXISTS user_profiles_public CASCADE;

-- Create user_profiles_public as a view that reads from user_profiles
CREATE VIEW user_profiles_public AS
SELECT 
    up.user_id as id,
    au.email,
    up.display_name,
    up.bio,
    up.avatar_url,
    up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id;

-- Populate user_profiles with existing users (if any)
INSERT INTO user_profiles (user_id, display_name, created_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    created_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. user_profiles table exists with proper structure
-- 2. user_profiles_public is a view that reads from user_profiles
-- 3. Trigger function handles errors gracefully
-- 4. Signup should work without 500 errors
-- 
-- ===================================================== 