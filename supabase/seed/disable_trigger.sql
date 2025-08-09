-- =====================================================
-- TEMPORARILY DISABLE TRIGGER
-- =====================================================
-- 
-- If the trigger is still causing "Database error creating new user",
-- we can temporarily disable it to allow signups to work.
-- =====================================================

-- Disable the trigger temporarily
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- =====================================================
-- TEST SIGNUP NOW
-- =====================================================
-- 
-- 1. Try creating a user in Supabase Authentication
-- 2. If it works, the trigger was the issue
-- 3. We can then fix the trigger and re-enable it
-- 
-- =====================================================

-- =====================================================
-- TO RE-ENABLE LATER
-- =====================================================
-- 
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
-- 
-- ===================================================== 