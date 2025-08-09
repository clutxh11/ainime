-- =====================================================
-- FIND ALL TRIGGERS IN DATABASE
-- =====================================================
-- 
-- This script will show you all triggers and what they do
-- =====================================================

-- Show all triggers in the database
SELECT 
    trigger_schema,
    trigger_name,
    event_object_schema,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
ORDER BY trigger_schema, event_object_table, trigger_name;

-- Show triggers specifically on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Show all functions that might be trigger functions
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth')
AND routine_name LIKE '%user%' OR routine_name LIKE '%profile%' OR routine_name LIKE '%trigger%'
ORDER BY routine_schema, routine_name;

-- Show the definition of the handle_new_user function
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- =====================================================
-- UNDERSTANDING TRIGGERS
-- =====================================================
-- 
-- event_manipulation: What action triggers it (INSERT, UPDATE, DELETE)
-- action_timing: When it runs (BEFORE, AFTER, INSTEAD OF)
-- action_statement: What function it calls
-- 
-- ===================================================== 