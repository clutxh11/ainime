-- Test invitations system
-- Run this to check if invitations are working

-- Check if team_invitations table exists and has data
SELECT COUNT(*) as total_invitations FROM team_invitations;

-- Show all invitations
SELECT 
    ti.id,
    ti.team_id,
    ti.invited_user_id,
    ti.invited_by_user_id,
    ti.role,
    ti.status,
    ti.message,
    ti.created_at,
    at.name as team_name,
    upp.display_name as inviter_name
FROM team_invitations ti
LEFT JOIN animation_teams at ON ti.team_id = at.id
LEFT JOIN user_profiles_public upp ON ti.invited_by_user_id = upp.id
ORDER BY ti.created_at DESC;

-- Check pending invitations for a specific user (replace with actual user ID)
-- SELECT * FROM team_invitations 
-- WHERE invited_user_id = 'YOUR_USER_ID_HERE' 
-- AND status = 'pending';

-- Test the exact query that the app uses
SELECT * FROM team_invitations 
WHERE status = 'pending' 
ORDER BY created_at DESC; 