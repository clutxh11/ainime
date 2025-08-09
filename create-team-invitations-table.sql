-- Create team_invitations table for the invitation system

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invited_user_id ON team_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_created_at ON team_invitations(created_at);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

CREATE POLICY "Team leaders can delete invitations" ON team_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM animation_teams 
            WHERE id = team_id AND leader_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_invitations TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at_trigger
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION update_team_invitations_updated_at(); 