-- Create messaging system schema
-- This will support team streams and direct messages

-- 1. Create streams table for team channels
CREATE TABLE IF NOT EXISTS team_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES animation_teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text')),
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, name)
);

-- 2. Create messages table for stream messages
CREATE TABLE IF NOT EXISTS stream_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES team_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (sender_id != receiver_id) -- Prevent self-messaging
);

-- 4. Create indexes for better performance
CREATE INDEX idx_team_streams_team_id ON team_streams(team_id);
CREATE INDEX idx_stream_messages_stream_id ON stream_messages(stream_id);
CREATE INDEX idx_stream_messages_created_at ON stream_messages(created_at);
CREATE INDEX idx_direct_messages_sender_receiver ON direct_messages(sender_id, receiver_id);
CREATE INDEX idx_direct_messages_created_at ON direct_messages(created_at);

-- 5. Enable RLS on all tables
ALTER TABLE team_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for team_streams
CREATE POLICY "Team members can view streams" ON team_streams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM animation_team_members 
            WHERE team_id = team_streams.team_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Team leaders can create streams" ON team_streams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM animation_teams 
            WHERE id = team_id AND leader_id = auth.uid()
        )
    );

-- 7. Create RLS policies for stream_messages
CREATE POLICY "Team members can view stream messages" ON stream_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM animation_team_members atm
            JOIN team_streams ts ON atm.team_id = ts.team_id
            WHERE ts.id = stream_messages.stream_id 
            AND atm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can send stream messages" ON stream_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM animation_team_members atm
            JOIN team_streams ts ON atm.team_id = ts.team_id
            WHERE ts.id = stream_messages.stream_id 
            AND atm.user_id = auth.uid()
        )
    );

-- 8. Create RLS policies for direct_messages
CREATE POLICY "Users can view their direct messages" ON direct_messages
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
    );

CREATE POLICY "Users can send direct messages" ON direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND sender_id != receiver_id
    );

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON direct_messages TO authenticated;

-- 10. Create default general stream for existing teams
INSERT INTO team_streams (team_id, name, type, created_by_user_id)
SELECT 
    id as team_id,
    'general' as name,
    'text' as type,
    leader_id as created_by_user_id
FROM animation_teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_streams 
    WHERE team_id = animation_teams.id AND name = 'general'
); 