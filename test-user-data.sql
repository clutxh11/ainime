-- Test script to see what data is in user_profiles_public
-- Run this to debug the search issue

-- Check all users in the view
SELECT id, email, display_name, bio FROM user_profiles_public;

-- Check auth.users raw_user_meta_data
SELECT 
    id, 
    email, 
    raw_user_meta_data,
    raw_user_meta_data->>'display_name' as display_name_from_meta
FROM auth.users;

-- Test search query manually
SELECT id, display_name, bio 
FROM user_profiles_public 
WHERE display_name ILIKE 'M%';

-- Test search query manually with different patterns
SELECT id, display_name, bio 
FROM user_profiles_public 
WHERE display_name ILIKE '%M%'; 