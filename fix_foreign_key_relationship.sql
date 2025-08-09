-- =====================================================
-- FIX FOREIGN KEY RELATIONSHIP
-- =====================================================
-- 
-- The foreign key relationship between projects.creator_id
-- and user_profiles_public.id is broken because we changed
-- user_profiles_public from a view to a table.
-- 
-- This script will fix the relationship.
-- =====================================================

-- First, let's see what foreign keys exist on projects table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'projects';

-- Drop the existing foreign key constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT projects_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES user_profiles_public(id) ON DELETE CASCADE;

-- Also check if we need to fix the user_profiles_public table structure
-- Make sure it has the right primary key
ALTER TABLE user_profiles_public 
DROP CONSTRAINT IF EXISTS user_profiles_public_pkey;

ALTER TABLE user_profiles_public 
ADD CONSTRAINT user_profiles_public_pkey 
PRIMARY KEY (id);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script:
-- 1. The foreign key relationship should be restored
-- 2. The Creator Hub should load without errors
-- 3. Projects should be able to reference creator profiles
-- 
-- ===================================================== 