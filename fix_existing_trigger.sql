-- =====================================================
-- FIX EXISTING TRIGGER ISSUE
-- =====================================================
-- 
-- The trigger "on_auth_user_created" already exists, which means
-- there's already a trigger trying to create profile records.
-- This might be the source of the 500 error.
-- =====================================================

-- First, let's see what the existing trigger does
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check what function the trigger calls
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%handle_new_user%' OR routine_name LIKE '%on_auth_user_created%';

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Now run the conversion script (without the trigger creation part)
-- Drop the problematic view
DROP VIEW IF EXISTS user_profiles_public CASCADE;

-- Create a proper table instead
CREATE TABLE user_profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_user_profiles_public_id ON user_profiles_public(id);
CREATE INDEX idx_user_profiles_public_email ON user_profiles_public(email);

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

-- Create a NEW trigger function (with different name)
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles_public (id, email, display_name, bio, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'bio', ''),
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create NEW trigger on auth.users
CREATE TRIGGER on_auth_user_signup_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Populate existing users (if any)
INSERT INTO user_profiles_public (id, email, display_name, bio, created_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', ''),
    COALESCE(raw_user_meta_data->>'bio', ''),
    created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. Old problematic trigger is removed
-- 2. user_profiles_public is now a proper table
-- 3. New trigger with different name is created
-- 4. Signup should work without 500 errors
-- 
-- ===================================================== 