-- =====================================================
-- CONVERT user_profiles_public VIEW TO TABLE
-- =====================================================
-- 
-- The user_profiles_public view is causing 500 errors during signup
-- because views are read-only and can't handle INSERT operations.
-- 
-- This script converts the view to a proper table with triggers
-- to keep it in sync with auth.users.
-- =====================================================

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

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
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

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
-- 1. user_profiles_public is now a proper table
-- 2. New users will automatically get profile records
-- 3. Signup should work without 500 errors
-- 4. Existing users will have profile records
-- 
-- ===================================================== 