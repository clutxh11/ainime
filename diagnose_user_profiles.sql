-- =====================================================
-- DIAGNOSE user_profiles_public ISSUE
-- =====================================================
-- 
-- This script will help us understand what user_profiles_public
-- actually is and why it's causing the 500 error.
-- =====================================================

-- Check if user_profiles_public is a table or view
SELECT 
    schemaname,
    tablename,
    tabletype
FROM pg_tables 
WHERE tablename = 'user_profiles_public'
UNION ALL
SELECT 
    schemaname,
    viewname as tablename,
    'view' as tabletype
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- Check the structure of user_profiles_public
\d user_profiles_public;

-- Check if there are any triggers on user_profiles_public
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles_public';

-- Check if there are any RLS policies on user_profiles_public
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles_public';

-- Check if user_profiles_public has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles_public';

-- Check the definition if it's a view
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- =====================================================
-- POSSIBLE SOLUTIONS
-- =====================================================
-- 
-- Based on the results above, we can determine:
-- 1. If it's a view, we need to check its definition
-- 2. If it's a table, we need to check RLS policies
-- 3. If it doesn't exist, we need to create it
-- 
-- ===================================================== 