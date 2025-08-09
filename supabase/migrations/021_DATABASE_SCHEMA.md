# Database Schema Documentation

## Overview

This document explains the Supabase database schema for the AI Nime Platform, including table structures, relationships, and how they map to the web application components.

## Database Tables

### 1. `users` Table 👤

**Purpose**: Stores user account information and profiles

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL UNIQUE,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- User profiles and authentication
- Creator information displayed on projects
- Forum post authors
- Team leaders and members
- Profile dropdown and settings

---

### 2. `projects` Table 🎬

**Purpose**: Stores animation/manga projects and their metadata

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  genre VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Planning',
  views INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  image_url VARCHAR,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  canvas_width INTEGER DEFAULT 1920,
  canvas_height INTEGER DEFAULT 1080,
  frame_rate INTEGER DEFAULT 24,
  units VARCHAR DEFAULT 'pixel',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- **Creator Hub Dashboard**: Displays all projects with creator info
- **Project Setup**: Creates new projects (INSERT)
- **Manga Manager**: Shows user's projects with analytics
- **Viewer Hub**: Displays projects as content for viewers
- **Forum**: Projects can be discussed in forum posts

**Status Values**:

- `Planning` - Project in planning phase
- `In Progress` - Project actively being worked on
- `Completed` - Project finished

---

### 3. `teams` Table 👥

**Purpose**: Stores animation teams for collaboration

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- **Creator Hub**: Shows teams for each project
- **Team Management**: Create and manage teams
- **Project Details**: Displays which teams are working on projects
- **Team Viewing**: Users can browse and join teams

---

### 4. `team_members` Table 👥

**Purpose**: Links users to teams (many-to-many relationship)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

**Web App Usage**:

- **Team Management**: Shows who's in each team
- **Creator Hub**: Displays team member counts
- **Collaboration**: Manages team roles and permissions
- **Team Profiles**: Individual team member information

**Role Values**:

- `Animator` - Handles animation work
- `Storyboard Artist` - Creates storyboards
- `Character Designer` - Designs characters
- `Background Artist` - Creates backgrounds
- `Voice Actor` - Provides voice acting
- `Director` - Oversees the project

---

### 5. `chapters` Table 📖

**Purpose**: Stores individual chapters/episodes of projects

```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- **Manga Manager**: Shows chapters for each project
- **Viewer Hub**: Displays episodes/chapters for viewing
- **Project Details**: Lists all chapters in a project
- **Chapter Management**: Upload and manage chapters

**Status Values**:

- `Draft` - Chapter in development
- `In Progress` - Chapter being worked on
- `Completed` - Chapter finished and ready

---

### 6. `forum_posts` Table 💬

**Purpose**: Stores forum discussions and community content

```sql
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- **Forum Section**: Shows all forum posts
- **Community Discussions**: Users can discuss projects
- **Search and Filter**: Filter posts by category and tags
- **User Activity**: Track user contributions

**Category Values**:

- `General Discussion` - General topics
- `Creator Showcase` - Showcasing work
- `Collaboration Hub` - Finding collaborators
- `Tutorials & Tips` - Educational content
- `Feedback & Critique` - Getting feedback
- `Technical Support` - Technical help

---

### 7. `animation_projects` Table 🎨

**Purpose**: Stores detailed animation project data and assets

```sql
CREATE TABLE animation_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_data JSONB,
  assets JSONB,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Web App Usage**:

- **Animation Editor**: Stores animation-specific data
- **Project Details**: Technical animation information
- **Asset Management**: Animation resources and files
- **Scene Management**: Individual scene data

---

## Table Relationships

```
users (1) ←→ (many) projects (creator_id)
users (1) ←→ (many) teams (leader_id)
users (many) ←→ (many) teams (via team_members)
projects (1) ←→ (many) teams (project_id)
projects (1) ←→ (many) chapters (project_id)
projects (1) ←→ (1) animation_projects (project_id)
users (1) ←→ (many) forum_posts (author_id)
```

## Data Flow Examples

### Creating a New Project

1. User fills out project form in **Project Setup**
2. Data gets inserted into `projects` table
3. Project appears in:
   - **Creator Hub Dashboard**
   - **Manga Manager**
   - **Viewer Hub**

### Creating a Team

1. User creates team for a project in **Creator Hub**
2. Data gets inserted into `teams` table
3. Team members get added to `team_members` table
4. Team appears in project details and team management

### Adding Chapters

1. User uploads new chapter in **Manga Manager**
2. Data gets inserted into `chapters` table
3. Chapter appears in project details and viewer

### Forum Posts

1. User creates forum post in **Forum Section**
2. Data gets inserted into `forum_posts` table
3. Post appears in forum with author information

## Current Sample Data

Based on the initial SQL setup, the database contains:

### Users (3)

- `sakura_artist` - Main creator
- `digital_animator` - Animation specialist
- `creative_mind` - Creative director

### Projects (3)

- `Dragons Legacy` - Fantasy animation
- `Cyber Samurai` - Sci-fi action
- `The Last Samurai` - Historical drama

### Teams (3)

- `Dragon Team` - Working on Dragons Legacy
- `Cyber Team` - Working on Cyber Samurai
- `Samurai Team` - Working on The Last Samurai

### Forum Posts (6)

- Various discussion topics about animation, collaboration, and projects

### Chapters (3)

- One chapter for each project

## Common Queries

### Get Projects with Creator Info

```sql
SELECT p.*, u.username as creator_name
FROM projects p
LEFT JOIN users u ON p.creator_id = u.id
ORDER BY p.created_at DESC;
```

### Get Teams with Member Count

```sql
SELECT t.*, u.username as leader_name, COUNT(tm.id) as member_count
FROM teams t
LEFT JOIN users u ON t.leader_id = u.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, u.username;
```

### Get Forum Posts with Author

```sql
SELECT fp.*, u.username as author_name
FROM forum_posts fp
LEFT JOIN users u ON fp.author_id = u.id
ORDER BY fp.created_at DESC;
```

## Security Policies

All tables have Row Level Security (RLS) enabled with appropriate policies:

- **Users**: Can read all users, update own profile
- **Projects**: Can read all projects, create/update own projects
- **Teams**: Can read all teams, create/update if leader
- **Team Members**: Can read team members, join/leave teams
- **Chapters**: Can read all chapters, create/update for own projects
- **Forum Posts**: Can read all posts, create/update own posts
- **Animation Projects**: Can read all, create/update own projects

## Indexes

Performance indexes are created on:

- Foreign key columns
- Frequently searched columns (title, genre, status)
- Timestamp columns for sorting
- Array columns for tag searches

This schema provides a solid foundation for the AI Nime Platform with proper relationships, security, and performance optimization.
