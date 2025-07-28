-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('viewer', 'creator', 'admin')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  status TEXT CHECK (status IN ('Active', 'Completed', 'Draft')) DEFAULT 'Draft',
  views INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  image_url TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Chapters table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('Finalized', 'In-Betweening', 'Storyboard', 'Draft')) DEFAULT 'Draft',
  thumbnail_url TEXT,
  release_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum posts table
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapter/Episode comments table for specific content comments
CREATE TABLE content_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR NOT NULL CHECK (content_type IN ('chapter', 'episode')),
  content_id UUID NOT NULL, -- References chapters.id or animation_projects.id
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Animation projects table
CREATE TABLE animation_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  frame_rate INTEGER NOT NULL,
  project_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_genre ON projects(genre);
CREATE INDEX idx_teams_project_id ON teams(project_id);
CREATE INDEX idx_teams_leader_id ON teams(leader_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_chapters_project_id ON chapters(project_id);
CREATE INDEX idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_tags ON forum_posts USING GIN(tags);
CREATE INDEX idx_content_comments_content_id ON content_comments(content_id);
CREATE INDEX idx_content_comments_author_id ON content_comments(author_id);
CREATE INDEX idx_content_comments_content_type ON content_comments(content_type);
CREATE INDEX idx_animation_projects_creator_id ON animation_projects(creator_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_comments_updated_at BEFORE UPDATE ON content_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_animation_projects_updated_at BEFORE UPDATE ON animation_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read all users
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Creators can insert projects" ON projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own projects" ON projects FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own projects" ON projects FOR DELETE USING (auth.uid() = creator_id);

-- Teams policies
CREATE POLICY "Anyone can read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Team leaders can insert teams" ON teams FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Team leaders can update own teams" ON teams FOR UPDATE USING (auth.uid() = leader_id);
CREATE POLICY "Team leaders can delete own teams" ON teams FOR DELETE USING (auth.uid() = leader_id);

-- Team members policies
CREATE POLICY "Anyone can read team members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Users can join teams" ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave teams" ON team_members FOR DELETE USING (auth.uid() = user_id);

-- Chapters policies
CREATE POLICY "Anyone can read chapters" ON chapters FOR SELECT USING (true);
CREATE POLICY "Project creators can insert chapters" ON chapters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND creator_id = auth.uid())
);
CREATE POLICY "Project creators can update chapters" ON chapters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND creator_id = auth.uid())
);
CREATE POLICY "Project creators can delete chapters" ON chapters FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND creator_id = auth.uid())
);

-- Forum posts policies
CREATE POLICY "Anyone can read forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert forum posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own forum posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own forum posts" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- Animation projects policies
CREATE POLICY "Anyone can read animation projects" ON animation_projects FOR SELECT USING (true);
CREATE POLICY "Users can insert animation projects" ON animation_projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own animation projects" ON animation_projects FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own animation projects" ON animation_projects FOR DELETE USING (auth.uid() = creator_id);

-- Content comments policies
CREATE POLICY "Anyone can read content comments" ON content_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert content comments" ON content_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own content comments" ON content_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own content comments" ON content_comments FOR DELETE USING (auth.uid() = author_id); 