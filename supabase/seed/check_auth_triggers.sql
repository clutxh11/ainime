-- =====================================================
-- CHECK FOR AUTH TRIGGERS/FUNCTIONS
-- =====================================================
-- 
-- This script checks for triggers or functions that might
-- be trying to create records in user_profiles_public
-- when a user signs up to auth.users
-- =====================================================

-- Check for triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Check for functions that might be called during signup
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_definition LIKE '%user_profiles_public%';

-- Check for any database functions that reference user_profiles_public
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosrc LIKE '%user_profiles_public%';

-- Check if there are any Supabase Edge Functions or RPC calls
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%profile%' OR routine_name LIKE '%user%';

-- Check for any policies that might be causing issues
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

-- Check if user_profiles_public is actually a view and what it does
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- =====================================================
-- POSSIBLE CAUSES
-- =====================================================
-- 
-- 1. Database trigger on auth.users that tries to insert into user_profiles_public
-- 2. Supabase function that creates profile records
-- 3. RLS policy on user_profiles_public blocking the insert
-- 4. View definition that doesn't allow inserts
-- 
-- ===================================================== 