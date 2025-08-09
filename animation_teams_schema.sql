-- =====================================================
-- ANIMATION TEAMS SCHEMA
-- =====================================================
-- 
-- This file contains the SQL for the animation teams system.
-- Teams are project-specific - each team belongs to one project.
-- Users can be members of multiple teams (one per project).
-- 
-- =====================================================

-- Create animation_teams table
CREATE TABLE animation_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create animation_team_members table
CREATE TABLE animation_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES animation_teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_animation_teams_project_id ON animation_teams(project_id);
CREATE INDEX idx_animation_teams_leader_id ON animation_teams(leader_id);
CREATE INDEX idx_animation_team_members_team_id ON animation_team_members(team_id);
CREATE INDEX idx_animation_team_members_user_id ON animation_team_members(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE animation_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for animation_teams
CREATE POLICY "Users can view all teams" ON animation_teams
    FOR SELECT USING (true);

CREATE POLICY "Users can create teams" ON animation_teams
    FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update their teams" ON animation_teams
    FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "Team leaders can delete their teams" ON animation_teams
    FOR DELETE USING (auth.uid() = leader_id);

-- RLS Policies for animation_team_members
CREATE POLICY "Users can view team members" ON animation_team_members
    FOR SELECT USING (true);

CREATE POLICY "Team leaders can add members" ON animation_team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM animation_teams 
            WHERE animation_teams.id = animation_team_members.team_id 
            AND animation_teams.leader_id = auth.uid()
        )
    );

CREATE POLICY "Users can join teams" ON animation_team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team leaders can remove members" ON animation_team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM animation_teams 
            WHERE animation_teams.id = animation_team_members.team_id 
            AND animation_teams.leader_id = auth.uid()
        )
    );

CREATE POLICY "Users can leave teams" ON animation_team_members
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_animation_teams_updated_at BEFORE UPDATE ON animation_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EXAMPLE QUERIES
-- =====================================================

-- Get all teams for a project with leader info
-- SELECT 
--     at.*,
--     upp.display_name as leader_display_name
-- FROM animation_teams at
-- LEFT JOIN user_profiles_public upp ON at.leader_id = upp.id
-- WHERE at.project_id = 'your-project-id';

-- Get team members with user info
-- SELECT 
--     atm.*,
--     upp.display_name as user_display_name
-- FROM animation_team_members atm
-- LEFT JOIN user_profiles_public upp ON atm.user_id = upp.id
-- WHERE atm.team_id = 'your-team-id';

-- Check if user is in a team for a project
-- SELECT EXISTS (
--     SELECT 1 FROM animation_team_members atm
--     JOIN animation_teams at ON atm.team_id = at.id
--     WHERE at.project_id = 'your-project-id' 
--     AND atm.user_id = 'your-user-id'
-- );

-- ===================================================== 