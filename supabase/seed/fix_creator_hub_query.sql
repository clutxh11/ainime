-- =====================================================
-- FIX CREATOR HUB QUERY ISSUE
-- =====================================================
-- 
-- The query is trying to use user_profiles_public!projects_creator_id_fkey
-- but this foreign key relationship is broken.
-- 
-- We need to either:
-- 1. Fix the foreign key relationship, OR
-- 2. Update the query to work without the foreign key
-- =====================================================

-- First, let's check what the current user_profiles_public structure looks like
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles_public'
ORDER BY ordinal_position;

-- Check if user_profiles_public is a view or table
SELECT 
    schemaname,
    tablename,
    'table' as type
FROM pg_tables 
WHERE tablename = 'user_profiles_public'
UNION ALL
SELECT 
    schemaname,
    viewname as tablename,
    'view' as type
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- If user_profiles_public is a view, let's see its definition
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'user_profiles_public';

-- =====================================================
-- SOLUTION 1: FIX FOREIGN KEY RELATIONSHIP
-- =====================================================
-- 
-- If user_profiles_public is a table, we can fix the foreign key:

-- Drop existing foreign key if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT projects_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES user_profiles_public(id) ON DELETE CASCADE;

-- =====================================================
-- SOLUTION 2: UPDATE QUERY STRUCTURE
-- =====================================================
-- 
-- If the foreign key approach doesn't work, we can use a different query structure:
-- 
-- Instead of: user_profiles_public!projects_creator_id_fkey(display_name)
-- Use: user_profiles_public(id, display_name)
-- 
-- And then filter in the application code.
-- 
-- =====================================================

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- After running this script, test the query:
-- 
-- SELECT 
--   p.*,
--   up.display_name as creator_display_name
-- FROM projects p
-- LEFT JOIN user_profiles_public up ON p.creator_id = up.id
-- ORDER BY p.created_at DESC;
-- 
-- ===================================================== 