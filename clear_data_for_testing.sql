-- =====================================================
-- CLEAR DATA FOR TESTING - UPDATED STORAGE STRUCTURE
-- =====================================================
-- 
-- This script clears all data to test the new storage structure.
-- 
-- FIXED ISSUE: Chapters were being separated into different volume folders
-- because the volume folder naming was inconsistent.
-- 
-- OLD STRUCTURE (problematic):
--   volume-1--jujutsu-kaisen-volume-1-00f5541f-5d94-415c-a2e3-b0da0ee21b04/
--   volume-1--jujutsu-kaisen-volume-1-bb01c8a4-77ec-4f16-9ceb-221c9b414e21/
-- 
-- NEW STRUCTURE (fixed):
--   volume-1-00f5541f-5d94-415c-a2e3-b0da0ee21b04/
--   ├── chapter-1-the-awakening-ghi789/
--   │   ├── page-1.jpg
--   │   ├── page-2.jpg
--   │   └── ...
--   └── chapter-2-first-flight-jkl012/
--       ├── page-1.jpg
--       ├── page-2.jpg
--       └── ...
-- 
-- =====================================================

-- Temporarily disable foreign key checks
SET session_replication_role = 'replica';

-- Clear all data from application tables (except user_profiles_public)
TRUNCATE TABLE chapters CASCADE;
TRUNCATE TABLE volumes CASCADE;
TRUNCATE TABLE project_comments CASCADE;
TRUNCATE TABLE chapter_comments CASCADE;
TRUNCATE TABLE animated_chapter_comments CASCADE;
TRUNCATE TABLE ratings CASCADE;
TRUNCATE TABLE forum_posts CASCADE;
TRUNCATE TABLE projects CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Verify tables are empty
SELECT 'chapters' as table_name, COUNT(*) as row_count FROM chapters
UNION ALL
SELECT 'volumes', COUNT(*) FROM volumes
UNION ALL
SELECT 'project_comments', COUNT(*) FROM project_comments
UNION ALL
SELECT 'chapter_comments', COUNT(*) FROM chapter_comments
UNION ALL
SELECT 'animated_chapter_comments', COUNT(*) FROM animated_chapter_comments
UNION ALL
SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL
SELECT 'forum_posts', COUNT(*) FROM forum_posts
UNION ALL
SELECT 'projects', COUNT(*) FROM projects;

-- Verify user_profiles_public is preserved
SELECT 'user_profiles_public' as table_name, COUNT(*) as row_count FROM user_profiles_public; 