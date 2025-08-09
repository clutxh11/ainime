-- Emergency fix to restore authentication
-- Run this immediately if auth is broken

-- 1. Disable the problematic trigger
DROP TRIGGER IF EXISTS sync_user_profiles_public_trigger ON auth.users;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS sync_user_profiles_public();

-- 3. Recreate the view if it was dropped
CREATE OR REPLACE VIEW user_profiles_public AS
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'display_name', email) as display_name,
    raw_user_meta_data->>'bio' as bio
FROM auth.users;

-- 4. Grant permissions on the view
GRANT SELECT ON user_profiles_public TO authenticated;

-- 5. Create a simple table for team invitations without complex triggers
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES animation_teams(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES user_profiles_public(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES user_profiles_public(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Create basic RLS policies
CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (auth.uid() = invited_by_user_id);

CREATE POLICY "Users can view invitations they received" ON team_invitations
    FOR SELECT USING (auth.uid() = invited_user_id);

CREATE POLICY "Team leaders can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM animation_teams 
            WHERE id = team_id AND leader_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invitations" ON team_invitations
    FOR UPDATE USING (auth.uid() = invited_user_id);

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_invitations TO authenticated; 