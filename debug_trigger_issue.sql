-- =====================================================
-- DEBUG TRIGGER ISSUE
-- =====================================================
-- 
-- The trigger is still failing when creating users directly
-- in Supabase Authentication. Let's debug and fix this.
-- =====================================================

-- First, let's see what the current trigger function looks like
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if the trigger exists and what it does
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Let's create a more robust trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Add some debugging
    RAISE NOTICE 'Creating profile for user: %', NEW.id;
    
    -- Try to insert into user_profiles with better error handling
    BEGIN
        INSERT INTO public.user_profiles (user_id, display_name, created_at)
        VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.created_at
        );
        RAISE NOTICE 'Successfully created profile for user: %', NEW.id;
    EXCEPTION
        WHEN unique_violation THEN
            -- Profile already exists, that's okay
            RAISE NOTICE 'Profile already exists for user: %', NEW.id;
        WHEN OTHERS THEN
            -- Log the error but don't fail the signup
            RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Let's also check if there are any constraints or issues with the user_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check if there are any existing records that might cause conflicts
SELECT COUNT(*) as existing_profiles FROM user_profiles;

-- Check if the table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- =====================================================
-- ALTERNATIVE: DISABLE TRIGGER TEMPORARILY
-- =====================================================
-- 
-- If the trigger is still causing issues, we can temporarily disable it:
-- 
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
-- 
-- Then re-enable it later:
-- 
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
-- 
-- =====================================================

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. Check the trigger function definition
-- 2. Try creating a user in Supabase Auth
-- 3. Check the logs for any error messages
-- 4. If still failing, temporarily disable the trigger
-- 
-- ===================================================== 