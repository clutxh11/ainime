# AI-Nime Platform - User Flow Documentation

## Overview

This document outlines the complete user experience flow for the AI-Nime platform, covering both consumer (viewer/reader) and creator perspectives. The platform serves as a bridge between manga creation, reading, and community-driven animation production.

---

## Consumer Experience (Viewer/Reader)

### 1. Home Page (`/`)

**Entry Point**: Landing page with curated content sections

#### Content Sections:

- **Continue Watching/Reading**: Personalized recommendations based on user history
- **Trending Anime**: Popular animated content
- **New Manga Releases**: Latest manga chapters
- **Fan-Favorite Projects**: Community-voted content

#### Navigation Options:

- **"View More" Button**: → Filtered Content Page
- **Search Bar**: → Filtered Content Page (with pre-filled search)
- **Title Hover Effects**: Shows chapters/episodes count + Watch/Read buttons
- **Title Click**: → Content Modal (detailed info + chapter selection)

### 2. Filtered Content Page (`/browse`)

**Purpose**: Browse and filter all available content

#### Layout:

- **Left Sidebar**: Filter system (genre, status, type, etc.)
- **Right Content**: Grid of titles matching filters
- **Search Integration**: Pre-filled search when coming from home page

#### Interactions:

- **Hover Effects**: Same as home page
- **Title Click**: → Content Modal
- **Watch/Read Buttons**: Direct navigation to content

### 3. Content Modal

**Purpose**: Detailed information and chapter/episode selection

#### Content:

- **Full Synopsis**: Complete story description
- **Manga Chapters Dropdown**: Select specific chapters
- **Animated Episodes Dropdown**: Select specific episodes
- **Community Discussion**: Title-specific discussion forum
- **Watch/Read Buttons**: Navigate to selected content

### 4. Video Player Page (`/watch/:episodeId`)

**Purpose**: Watch animated episodes

#### Features:

- **Video Player**: Main content area
- **Upvote Button**: Like the episode (no downvote)
- **Share Button**: Share episode
- **View Count**: Number of views
- **Upload Date**: When episode was published

#### Version Selection Section:

- **Multiple Team Versions**: Different animated versions of same episode
- **Team Names**: Display team that created each version
- **Upvote Count**: Per-team upvotes
- **View Count**: Per-team views
- **Auto-Selection**: Most upvoted or followed team (default)

#### Sidebar:

- **Up Next**: Recommended episodes
- **About This Animation**: Episode details

#### Comments Section:

- **Episode Comments**: General discussion for the episode

### 5. Manga Viewer Page (`/read/:chapterId`)

**Purpose**: Read manga chapters

#### Features:

- **Manga Reader**: Page-by-page reading interface
- **Upvote Button**: Like the chapter
- **View Count**: Number of reads
- **Author Info**: Creator details
- **Release Date**: Publication date

#### Animated Chapter Section:

- **Same as Video Player**: Version selection for animated versions
- **Quick Access**: Switch from reading to watching

#### Comments Section:

- **Chapter Comments**: Discussion for the manga chapter

### 6. Production Calendar Page (`/calendar`)

**Purpose**: Track upcoming releases

#### Volume Releases Section:

- **Monthly View**: Volume releases by month
- **Title Click**: → Content Modal (same as home page)

#### Chapter Releases Section:

- **Weekly View**: Chapter releases by week
- **Title Click**: → Manga Viewer (direct to chapter)

---

## Creator Experience

### 1. Creator Hub (`/creator`)

**Entry Point**: Central workspace for creators

#### Access:

- **Default Access**: Anyone can explore (no sign-in required)
- **Account Required**: For commenting, joining teams, publishing

### 2. Explore Projects Page (`/creator/projects`)

**Purpose**: Find and join animation projects

#### Layout:

- **Current Projects Row**: Horizontal scroll of user's active projects
- **Explore Animation Projects**: Main content area with filters

#### Filter Sidebar:

- **Number of Teams**: Filter by team count
- **Genre**: Filter by content genre
- **Status**: Filter by project status
- **Other Filters**: Various project attributes

#### Project Cards:

- **View Teams Button**: See all teams working on project
- **Team Information**: Upvotes, views, member count
- **Request to Join**: Apply to join specific teams
- **Card Click**: → Project Detail Page

### 3. Project Detail Page (`/creator/project/:projectId`)

**Purpose**: Manage specific animation project

#### Tabbed Interface:

##### "Your Team" Tab:

- **Manga Information**: Source material details
- **Your Team Section**: Team members and roles
- **Team Discussion**: Discord-style communication
  - **Main Channel**: General team discussion
  - **Direct Messages**: Private member communication
  - **Voice Channels**: Audio communication
  - **Custom Channels**: Topic-specific discussions
- **Progress Section** (Left Sidebar):
  - **Chapter Progress**: Individual chapter status
  - **Contributor Tracking**: Who worked on what
  - **Chapter Click**: → Animation Editor (with project context)

##### "View Other Teams" Tab:

- **Team Containers**: Other teams working on project
- **Team Details**: Name, member count, team lead, stats
- **Container Click**: → Team Info Modal
- **Chapter Progress** (Right Side):
  - **Team-Based Status**: Shows most advanced team per chapter
  - **No Editor Access**: Can't edit unless team member

### 4. Team Info Modal

**Purpose**: Detailed team information and join requests

#### Content:

- **Team Details**: Comprehensive team information
- **Request to Join Button**: Apply for team membership

### 5. Manga Manager (`/creator/manga`)

**Purpose**: Manage manga series

#### Dashboard Overview:

- **My Series Section**: All published and drafted manga
- **Notifications/Activity Feed**: Comments, animation updates, messages
- **Analytics Summary**: Performance metrics
- **Quick Actions**: Create New Series, Upload Chapter

### 6. Create New Series Flow

#### Step 1: Series Information

- **Series Title**: Manga name
- **Synopsis**: Story summary
- **Genre Selection**: Multi-select genres
- **Tags**: Keywords for discoverability
- **Cover Image**: Upload cover art
- **Series Description**: Detailed introduction

#### Step 2: First Chapter Upload

- **Chapter Title**: Chapter name
- **Page Upload**: Drag-and-drop image upload
- **Page Ordering**: Arrange pages correctly
- **File Requirements**: Format and size guidelines

#### Step 3: Licensing Agreement

- **One-Time Agreement**: For new series only
- **Clear Terms**: Non-exclusive licensing rights
- **Royalty Information**: Revenue sharing details

#### Step 4: Publication

- **Confirmation**: Series goes live
- **Dual Availability**: Both reading and animation sides

### 7. Add New Chapters Flow

#### Step 1: Series Selection

- **Dashboard**: Click on existing series

#### Step 2: Chapter Upload

- **Chapter Title**: New chapter name
- **Page Upload**: Same as first chapter
- **Scheduling Tool**: Set release date/time
- **Weekly Release**: Enforce chapter order

#### Step 3: Publication

- **Automatic Release**: Scheduled chapters go live
- **Animation Availability**: Immediately available for animators

### 8. Create Animation (`/creator/animation`)

**Purpose**: Access animation editor

#### Options:

- **Load Project**: Continue existing animation
- **Start New**: Begin new animation project
- **Direct Access**: → Animation Editor

### 9. Animation Editor (`/creator/editor`)

**Purpose**: Create animated content

#### Features:

- **Canvas**: Drawing and animation workspace
- **Tools**: Pencil, palette, eraser, move, resize
- **Timeline**: Frame management
- **Layers**: Multi-layer animation
- **Playback**: Preview animations
- **Export**: Save and share work

### 10. Forum (`/creator/forum`)

**Purpose**: Community discussion

#### Features:

- **General Discussion**: Platform-wide topics
- **Creator Networking**: Connect with other creators
- **Tips & Tricks**: Share knowledge
- **Collaboration**: Find team members

---

## Navigation Flow Summary

### Consumer Journey:

```
Home Page → Filtered Content → Content Modal → Video Player/Manga Viewer
     ↓
Production Calendar → Content Modal/Manga Viewer
```

### Creator Journey:

```
Creator Hub → Explore Projects → Project Detail → Animation Editor
     ↓
Manga Manager → Create/Upload → Animation Editor
     ↓
Forum → Community Discussion
```

### Cross-Platform Integration:

- **Manga Creation** → **Reading Experience** → **Animation Projects**
- **Animation Projects** → **Video Player** → **Community Discussion**
- **Community Discussion** → **Creator Collaboration** → **New Content**

---

## Key Integration Points

### 1. Content Discovery

- Home page recommendations drive traffic to specific content
- Search and filters connect users to relevant material
- Production calendar maintains engagement with regular releases

### 2. Creator-Viewer Connection

- Manga creators can see animation projects based on their work
- Animators can discover new manga to adapt
- Community discussion bridges both sides

### 3. Team Collaboration

- Project detail pages facilitate team formation
- Animation editor supports collaborative work
- Forum enables networking and skill sharing

### 4. Content Progression

- Manga chapters → Animation projects → Video episodes
- Each stage builds on the previous
- Community feedback drives improvement

---

## Technical Implementation Notes

### Existing Components to Connect:

- Home page components (already implemented)
- Filter system (needs integration)
- Content modals (needs creation)
- Video player (needs implementation)
- Manga viewer (needs implementation)
- Animation editor (fully implemented)
- Creator hub (partially implemented)

### Required New Components:

- Content modals for detailed information
- Video player with server selection
- Manga viewer with page navigation
- Team management interfaces
- Forum system
- Calendar system

### Database Considerations:

- User accounts and authentication
- Content metadata and relationships
- Team membership and roles
- Comments and discussions
- Analytics and tracking

This flow documentation provides a comprehensive roadmap for connecting all existing components and implementing the missing pieces to create a cohesive platform experience.
