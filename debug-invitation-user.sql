-- Debug invitation user ID issue
-- Run this to check if the user IDs match

-- Show all invitations with user details
SELECT 
    ti.id,
    ti.team_id,
    ti.invited_user_id,
    ti.invited_by_user_id,
    ti.role,
    ti.status,
    ti.message,
    ti.created_at,
    invited_user.email as invited_user_email,
    invited_user.display_name as invited_user_name,
    inviter_user.email as inviter_user_email,
    inviter_user.display_name as inviter_user_name,
    at.name as team_name
FROM team_invitations ti
LEFT JOIN user_profiles_public invited_user ON ti.invited_user_id = invited_user.id
LEFT JOIN user_profiles_public inviter_user ON ti.invited_by_user_id = inviter_user.id
LEFT JOIN animation_teams at ON ti.team_id = at.id
ORDER BY ti.created_at DESC;

-- Check if there are any pending invitations
SELECT COUNT(*) as pending_invitations 
FROM team_invitations 
WHERE status = 'pending';

-- Show all users in user_profiles_public
SELECT id, email, display_name FROM user_profiles_public; 