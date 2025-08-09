-- Fix display names in auth.users
-- Update the raw_user_meta_data to have proper display names

-- Update user12 to have display name "BigUser12"
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{display_name}',
    '"BigUser12"'
)
WHERE email = 'user12@mail.com';

-- Update user13 to have display name "MediumUser13"
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{display_name}',
    '"MediumUser13"'
)
WHERE email = 'user13@mail.com';

-- Update user11 to have display name "SmallUser11"
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{display_name}',
    '"SmallUser11"'
)
WHERE email = 'user11@mail.com';

-- Verify the changes by checking the view
SELECT id, email, display_name, bio FROM user_profiles_public; 