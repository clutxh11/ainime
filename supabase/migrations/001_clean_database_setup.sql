-- =====================================================
-- CLEAN DATABASE SETUP - WITH ANIMATION TEAMS
-- =====================================================
-- 
-- This script creates a clean database structure with animation teams support.
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

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS animated_chapter_comments CASCADE;
DROP TABLE IF EXISTS chapter_comments CASCADE;
DROP TABLE IF EXISTS project_comments CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS animated_chapters CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS volumes CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS animation_team_members CASCADE;
DROP TABLE IF EXISTS animation_teams CASCADE;
DROP TABLE IF EXISTS user_profiles_public CASCADE;

-- Create user_profiles_public table (for public user data)
CREATE TABLE user_profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    genres TEXT[],
    series_type TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'Draft',
    views INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    image_url TEXT,
    square_thumbnail_url TEXT,
    horizontal_thumbnail_url TEXT,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volumes table
CREATE TABLE volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    volume_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chapters table
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volume_id UUID REFERENCES volumes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'Draft',
    release_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create forum_posts table
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_comments table
CREATE TABLE project_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chapter_comments table
CREATE TABLE chapter_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create animated_chapters table
CREATE TABLE animated_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    team_id UUID REFERENCES animation_teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    status TEXT DEFAULT 'In Progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create animated_chapter_comments table
CREATE TABLE animated_chapter_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animated_chapter_id UUID REFERENCES animated_chapters(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Create indexes for better performance
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_volumes_project_id ON volumes(project_id);
CREATE INDEX idx_chapters_volume_id ON chapters(volume_id);
CREATE INDEX idx_animation_teams_project_id ON animation_teams(project_id);
CREATE INDEX idx_animation_teams_leader_id ON animation_teams(leader_id);
CREATE INDEX idx_animation_team_members_team_id ON animation_team_members(team_id);
CREATE INDEX idx_animation_team_members_user_id ON animation_team_members(user_id);
CREATE INDEX idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_project_id ON forum_posts(project_id);
CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_chapter_comments_chapter_id ON chapter_comments(chapter_id);
CREATE INDEX idx_animated_chapters_chapter_id ON animated_chapters(chapter_id);
CREATE INDEX idx_animated_chapters_team_id ON animated_chapters(team_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_project_id ON ratings(project_id);
CREATE INDEX idx_user_profiles_public_id ON user_profiles_public(id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE animated_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE animated_chapter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view all published projects" ON projects
    FOR SELECT USING (status != 'Draft' OR auth.uid() = creator_id);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for user_profiles_public
CREATE POLICY "Users can view all public profiles" ON user_profiles_public
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own profile" ON user_profiles_public
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles_public
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON user_profiles_public
    FOR DELETE USING (auth.uid() = id);

-- RLS Policies for volumes
CREATE POLICY "Users can view volumes of published projects" ON volumes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = volumes.project_id 
            AND (projects.status != 'Draft' OR projects.creator_id = auth.uid())
        )
    );

CREATE POLICY "Project creators can manage volumes" ON volumes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = volumes.project_id 
            AND projects.creator_id = auth.uid()
        )
    );

-- RLS Policies for chapters
CREATE POLICY "Users can view chapters of published projects" ON chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM volumes 
            JOIN projects ON projects.id = volumes.project_id
            WHERE volumes.id = chapters.volume_id 
            AND (projects.status != 'Draft' OR projects.creator_id = auth.uid())
        )
    );

CREATE POLICY "Project creators can manage chapters" ON chapters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM volumes 
            JOIN projects ON projects.id = volumes.project_id
            WHERE volumes.id = chapters.volume_id 
            AND projects.creator_id = auth.uid()
        )
    );

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

-- RLS Policies for forum_posts
CREATE POLICY "Users can view forum posts" ON forum_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can create forum posts" ON forum_posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own forum posts" ON forum_posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own forum posts" ON forum_posts
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for project_comments
CREATE POLICY "Users can view project comments" ON project_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create project comments" ON project_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own project comments" ON project_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own project comments" ON project_comments
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for chapter_comments
CREATE POLICY "Users can view chapter comments" ON chapter_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create chapter comments" ON chapter_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own chapter comments" ON chapter_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own chapter comments" ON chapter_comments
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for animated_chapters
CREATE POLICY "Users can view animated chapters" ON animated_chapters
    FOR SELECT USING (true);

CREATE POLICY "Team members can create animated chapters" ON animated_chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM animation_team_members 
            WHERE animation_team_members.team_id = animated_chapters.team_id 
            AND animation_team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update animated chapters" ON animated_chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM animation_team_members 
            WHERE animation_team_members.team_id = animated_chapters.team_id 
            AND animation_team_members.user_id = auth.uid()
        )
    );

-- RLS Policies for animated_chapter_comments
CREATE POLICY "Users can view animated chapter comments" ON animated_chapter_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create animated chapter comments" ON animated_chapter_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own animated chapter comments" ON animated_chapter_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own animated chapter comments" ON animated_chapter_comments
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for ratings
CREATE POLICY "Users can view ratings" ON ratings
    FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON ratings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON ratings
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_public_updated_at BEFORE UPDATE ON user_profiles_public
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volumes_updated_at BEFORE UPDATE ON volumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animation_teams_updated_at BEFORE UPDATE ON animation_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_comments_updated_at BEFORE UPDATE ON project_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapter_comments_updated_at BEFORE UPDATE ON chapter_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animated_chapters_updated_at BEFORE UPDATE ON animated_chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animated_chapter_comments_updated_at BEFORE UPDATE ON animated_chapter_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
