-- =====================================================
-- TEMPORARILY DISABLE RLS ON user_profiles_public
-- =====================================================
-- 
-- This script temporarily disables RLS on user_profiles_public
-- to test if the policies are causing the 500 error during signup.
-- 
-- Run this to test if RLS is the issue.
-- =====================================================

-- Temporarily disable RLS on user_profiles_public
ALTER TABLE user_profiles_public DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- TEST SIGNUP NOW
-- =====================================================
-- 
-- 1. Try signing up a new user
-- 2. If it works, RLS policies were the issue
-- 3. If it still fails, the issue is elsewhere
-- 
-- =====================================================

-- =====================================================
-- TO RE-ENABLE RLS LATER (after fixing policies)
-- =====================================================
-- 
-- ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;
-- 
-- Then run the fix_user_profiles_rls.sql script
-- 
-- ===================================================== 