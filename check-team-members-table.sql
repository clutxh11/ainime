-- Check if animation_team_members table exists and its structure
-- Run this to debug the 406 error

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'animation_team_members'
);

-- Show table structure if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'animation_team_members'
ORDER BY ordinal_position;

-- Check if there's any data in the table
SELECT COUNT(*) as total_members FROM animation_team_members;

-- Show sample data
SELECT * FROM animation_team_members LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'animation_team_members'; 