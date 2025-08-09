-- Migration Script: Reorganize Storage Structure
-- This script helps you understand the new storage structure and provides guidance for migration

-- NEW STORAGE STRUCTURE:
/*
series-assets/
├── [project-name]-[project-id]/
│   ├── chapters/
│   │   ├── [volume-id]/
│   │   │   ├── [chapter-id]/
│   │   │   │   ├── page-1.jpg
│   │   │   │   ├── page-2.jpg
│   │   │   │   └── ...
│   │   │   └── [another-chapter-id]/
│   │   │       └── ...
│   │   └── [another-volume-id]/
│   └── thumbnails/
│       ├── square.jpg
│       └── wide.jpg
└── [another-project-name]-[another-project-id]/
    └── ...
*/

-- Get all projects to understand current structure
SELECT 
    id,
    title,
    creator_id,
    square_thumbnail_url,
    horizontal_thumbnail_url,
    created_at
FROM projects 
ORDER BY created_at DESC;

-- Get all chapters to understand current structure
SELECT 
    c.id as chapter_id,
    c.title as chapter_title,
    c.content as chapter_content,
    v.id as volume_id,
    v.title as volume_title,
    p.id as project_id,
    p.title as project_title
FROM chapters c
JOIN volumes v ON c.volume_id = v.id
JOIN projects p ON v.project_id = p.id
ORDER BY p.created_at DESC, v.volume_number, c.chapter_number;

-- MIGRATION STEPS:
-- 1. For each project, create the new folder structure:
--    series-assets/[project-name]-[project-id]/
--    series-assets/[project-name]-[project-id]/thumbnails/
--    series-assets/[project-name]-[project-id]/chapters/

-- 2. Move existing thumbnails:
--    FROM: series-thumbnails/[user-id]/[timestamp]-square.jpg
--    TO:   [project-name]-[project-id]/thumbnails/square.jpg
--    
--    FROM: series-thumbnails/[user-id]/[timestamp]-horizontal.jpg  
--    TO:   [project-name]-[project-id]/thumbnails/wide.jpg

-- 3. Move existing chapter pages:
--    FROM: chapters/[project-id]/[volume-id]/[timestamp]-[index].jpg
--    TO:   [project-name]-[project-id]/chapters/[volume-id]/[timestamp]-[index].jpg

-- 4. Update database URLs after moving files

-- Note: This migration should be done carefully in Supabase Storage interface
-- or using the Supabase CLI to avoid data loss 