-- =====================================================
-- FIX user_profiles_public RLS POLICIES
-- =====================================================
-- 
-- The current RLS policies are likely blocking user signup
-- because they prevent inserting into user_profiles_public
-- during the auth.users creation process.
-- 
-- This script fixes the policies to allow proper signup flow.
-- =====================================================

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view all public profiles" ON user_profiles_public;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles_public;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles_public;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles_public;

-- Create new, more permissive policies for signup flow
CREATE POLICY "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

-- Allow INSERT during signup (auth.uid() might be null during signup)
CREATE POLICY "Allow profile creation during signup" ON user_profiles_public
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles_public
    FOR DELETE USING (auth.uid() = id);

-- =====================================================
-- ALTERNATIVE: TEMPORARILY DISABLE RLS FOR TESTING
-- =====================================================
-- 
-- If the above policies still cause issues, you can temporarily
-- disable RLS on user_profiles_public for testing:
-- 
-- ALTER TABLE user_profiles_public DISABLE ROW LEVEL SECURITY;
-- 
-- Then re-enable it later with proper policies:
-- 
-- ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;
-- 
-- =====================================================

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. Try signing up a new user
-- 2. Check if the 500 error is resolved
-- 3. Verify user_profiles_public gets populated
-- 
-- ===================================================== 