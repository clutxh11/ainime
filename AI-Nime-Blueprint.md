# AI-Nime: Platform Development Blueprint

## ✅ **Current Implementation Status**

### **Major Milestones Completed:**

The platform has evolved significantly from the initial MVP concept into a **fully functional application** with comprehensive features:

#### **✅ Backend Infrastructure Complete**

- **Supabase Integration**: Full PostgreSQL database with 8+ tables
- **Authentication System**: User accounts with role-based access control
- **Real-time Features**: Live messaging and collaborative editing
- **File Storage**: Cloud storage for images, animations, and project data
- **API Layer**: Complete data layer replacing all mock data

#### **✅ Component Architecture Evolved**

```typescript
// CURRENT STRUCTURE (IMPLEMENTED):
components/
├── animation-editor.tsx (3,580 lines) ✅ **FUNCTIONAL**
├── creator-hub.tsx ✅ **SUPABASE INTEGRATED**
├── viewer-hub.tsx ✅ **FULL CONTENT SYSTEM**
├── project-detail.tsx ✅ **TEAM COLLABORATION**
├── ui/ (55+ components) ✅ **COMPREHENSIVE UI SYSTEM**
└── features/
    ├── creator/ ✅ **MODULAR CREATOR TOOLS**
    ├── animation/ ✅ **ANIMATION COMPONENTS**
    └── forum/ ✅ **COMMUNITY FEATURES**
```

#### **✅ Database Schema Implemented**

```sql
-- LIVE TABLES:
✅ users & user_profiles_public
✅ projects (with volumes & chapters)
✅ animation_teams & team_members
✅ animation_projects (editor saves)
✅ forum_posts & messages
✅ ratings & comments
✅ sequences & shots (production workflow)
```

#### **✅ Core Features Operational**

**Animation Studio:**

- Professional canvas-based editor with layers and timeline
- Import/export functionality (PNG, TGA, MP4, GIF)
- Color effects and advanced image manipulation
- Real-time collaboration and project sharing

**Community Platform:**

- Team formation and management
- Real-time chat and messaging
- Forum discussions and knowledge sharing
- Content rating and comment systems

**Content Management:**

- Manga reader with chapter navigation
- Project creation and publishing workflows
- Volume/chapter organization system
- Creator attribution and team credits

---

## 🎯 **Next Phase Strategy**

With the core platform functional, the focus shifts from technical development to **content creation and community building**.

### **Current Deployment Status**

**✅ Technical Foundation Complete:**

- Next.js application with Supabase backend
- Professional animation editor with full feature set
- Community collaboration and team management
- Real-time messaging and content systems

**✅ Cost-Effective Architecture:**

- Leveraging Supabase free tier (up to 50MB database)
- Vercel hosting for frontend (generous free tier)
- Optimized for low operational costs during growth phase

**🎯 Focus Areas for Growth:**

- **Content Creation**: First high-quality animations to showcase capabilities
- **Community Building**: Attract manga fans and aspiring animators
- **User Experience**: Polish workflows based on real user feedback
- **Performance**: Optimize editor for larger projects and teams

## 2. Technology Stack

This stack is chosen for its scalability, real-time capabilities, and cost-effectiveness for an MVP.

**Frontend**: Next.js (React) - Open-source. Ideal for performance and can be hosted for free on platforms like Vercel.

**Backend**: Node.js with NestJS - Open-source. Provides a scalable, organized backend structure.

**Database**:

- PostgreSQL: (Hosted on Supabase - Free Tier) - For structured data like user profiles, manga metadata, and project information.
- MongoDB: (Hosted on MongoDB Atlas - Free Tier) - For flexible data like forum discussions and comments.

**Real-Time Communication**: WebSockets (via Socket.io) - Open-source. Essential for the collaborative animation editor and live chat.

**Cloud Storage**: Amazon S3 (Free Tier) - For storing manga chapter images and animation project files.

**Authentication**: JWT (JSON Web Tokens) - An open standard implemented with free libraries.

**AI Services (Post-MVP)**: Python with TensorFlow/PyTorch - The software is free, but the GPU compute power required incurs costs. This feature will be implemented after the MVP is validated.

## 3. Database Schema

### PostgreSQL (Relational Data)

#### Users

| Column        | Data Type    | Constraints      | Description                               |
| ------------- | ------------ | ---------------- | ----------------------------------------- |
| id            | UUID         | Primary Key      | Unique identifier for the user.           |
| username      | VARCHAR(255) | Unique, Not Null | Public display name.                      |
| email         | VARCHAR(255) | Unique, Not Null | User's email for login and notifications. |
| password_hash | VARCHAR(255) | Not Null         | Hashed password.                          |
| role          | ENUM         | Not Null         | 'viewer', 'creator', 'admin'.             |
| created_at    | TIMESTAMPZ   | Not Null         | Timestamp of account creation.            |

#### Manga

| Column          | Data Type    | Constraints         | Description                              |
| --------------- | ------------ | ------------------- | ---------------------------------------- |
| id              | UUID         | Primary Key         | Unique identifier for the manga series.  |
| title           | VARCHAR(255) | Not Null            | Title of the manga.                      |
| creator_id      | UUID         | Foreign Key (Users) | The original manga creator.              |
| synopsis        | TEXT         |                     | A brief summary of the story.            |
| genre           | VARCHAR(100) |                     | e.g., 'Shonen', 'Fantasy', 'Sci-Fi'.     |
| status          | ENUM         | Not Null            | 'Ongoing', 'Completed'.                  |
| cover_image_url | VARCHAR(255) |                     | URL to the cover image in cloud storage. |

#### Chapters

| Column         | Data Type  | Constraints         | Description                          |
| -------------- | ---------- | ------------------- | ------------------------------------ |
| id             | UUID       | Primary Key         | Unique identifier for a chapter.     |
| manga_id       | UUID       | Foreign Key (Manga) | The manga this chapter belongs to.   |
| chapter_number | INTEGER    | Not Null            | The number of the chapter.           |
| pages          | JSONB      | Not Null            | An array of URLs to the page images. |
| release_date   | TIMESTAMPZ |                     | The date the chapter was published.  |

### MongoDB (Document-Based Data)

#### Animation Projects

```json
{
  "_id": "ObjectId",
  "manga_id": "UUID",
  "chapter_id": "UUID",
  "team_id": "ObjectId",
  "status": "String", // 'Draft', 'Published'
  "frames": [
    {
      "frame_number": "Number",
      "image_url": "String",
      "layers": ["..."]
    }
  ],
  "upvotes": "Number",
  "views": "Number",
  "created_at": "Date"
}
```

#### Teams

```json
{
  "_id": "ObjectId",
  "name": "String",
  "manga_id": "UUID",
  "leader_id": "UUID",
  "members": [
    {
      "user_id": "UUID",
      "role": "String" // 'Animator', 'Colorist', etc.
    }
  ],
  "discussion": [
    {
      "user_id": "UUID",
      "message": "String",
      "timestamp": "Date"
    }
  ]
}
```

## 4. API Endpoints

All endpoints should be prefixed with `/api`.

### Authentication (/auth)

- **POST /register**: Create a new user account.
- **POST /login**: Authenticate a user and return a JWT.
- **GET /me**: Get the profile of the currently logged-in user.

### Manga & Chapters (/manga)

- **GET /**: Get a list of all manga with filtering options.
- **GET /:mangaId**: Get details for a specific manga.
- **GET /:mangaId/chapters**: Get all chapters for a manga.
- **POST /submit**: For creators to submit a new manga series. Requires 'creator' role.

### Animation Projects (/projects)

- **GET /:mangaId**: Get all animation projects for a manga.
- **POST /:mangaId/create**: Create a new animation project for a chapter.
- **PUT /:projectId**: Update an animation project (save draft, publish).
- **POST /:projectId/upvote**: Upvote an animation project.

### Teams (/teams)

- **POST /create**: Create a new team for a manga project.
- **POST /:teamId/join**: Request to join a team.
- **GET /:mangaId**: Get all teams for a specific manga project.

## 5. Web-Based Animation Canvas

The animation editor is a core feature of the MVP. It will be built as a functional, manual animation tool first.

### Technology

- **Canvas API**: The HTML5 `<canvas>` element will be the foundation.
- **Fabric.js or Konva.js**: A JavaScript library to provide an object model on top of the canvas, making it easier to manage layers and tools.

### MVP Functionality

- **Toolbar**: Pencil/Brush, Eraser, Onion Skinning toggle, and Layer management.
- **Timeline**: A simple horizontal strip of frames that can be added, deleted, and reordered. Clicking a frame loads it onto the canvas.
- **Save/Publish**: Buttons to save a draft to the user's library or publish it to the project page.
- **AI Assist Button (Disabled for MVP)**: The UI button can exist but will be disabled or show a "Coming Soon" message, generating user interest for a future update.

## 6. Real-Time Collaboration

WebSockets will power the collaborative aspects of the platform.

- **Team Chat**: Each team will have its own chat room for communication and coordination.
- **Live Co-editing (Post-MVP)**: Real-time co-editing of animation frames will be implemented after the MVP validation.

## Platform Vision

### AI-Nime: The Collaborative Manga Animation Platform

**Tagline**: Build together. Animate together. Watch together.

### What is AI-Nime?

Welcome to AI-Nime, a revolutionary collaborative platform that redefines the journey of manga from static pages to dynamic animation. At its core, AI-Nime provides a vibrant ecosystem where manga creators can publish their original works, and a global community of animators, from seasoned professionals to passionate hobbyists, can unite to bring these stories to life.

### Who is AI-Nime For?

- **Manga Artists and Creators**: For artists eager to expand their reach beyond traditional manga readership and see their stories transformed into dynamic animations.
- **Aspiring and Professional Animators**: A dedicated space for animators passionate about storytelling, offering creative freedom and financial rewards.
- **Hobbyist Animators**: Creative individuals who animate for fun, personal projects, or self-expression.
- **Casual Fan Base Members**: Even fans without professional animation experience can contribute through feedback and community engagement.

### Platform Components

#### Content Side (Viewer Hub)

The Content Side serves as the viewer's hub, much like a streaming service. It showcases multiple titles, each represented by a cover image and title card.

- For manga, a drop-down lists available chapters for reading.
- If animations exist, a separate section displays animated chapters for watching.
- Each chapter features its own comment section for fan engagement and discussion.

#### Publishing Side (Creator Portal)

This section is where new creatives upload their original drawn content, primarily manga and manhua. By publishing their work on AI-Nime, creators agree to relinquish certain licensing rights while retaining others that allow them to profit from any animation derived from their work.

#### Animation Side (Collaborative Production)

Animators can select manga series they're passionate about and begin collaborative animation. This process is structured like mini animation studios, where fan bases and communities form teams to animate a specific manga.

### Monetization Model

AI-Nime's primary monetization strategy is ad revenue, similar to YouTube, making the platform free to access for all viewers. Additional revenue streams include:

- Ad-free subscription tier (post-scale)
- Direct donations to creators (with small platform fee)
- Royalties for original manga creators from monetized animations

### Development Roadmap

#### Phase 1: Initial Content & Creator Fund Launch

- Acquire Rights to Popular Manga
- Hire Freelancers for Initial Adaptations
- Launch Creator Fund (Investor-Backed)

#### Phase 2: AI Tool Development & Core Platform Features

- AI tool development
- AI training from user-generated frames
- Web platform + Collaboration features

#### Phase 3: Public Outreach & Community Growth

- "Anyone Can Animate" Campaign
- Voting & publishing system

#### Phase 4: Scaling & Market Dominance

- Introduce ad-free subscription tier
- Scale ad revenue generation
- Ensure creator fund sustainability

## 7. Frontend Component Plan

### 7.1 Component Architecture Overview

The frontend will follow a modular, reusable component architecture using React with TypeScript. Components are organized by feature and responsibility, with clear separation between UI components, business logic, and data management.

### 7.2 Core Layout Components

#### 7.2.1 App Shell Components

```
components/
├── layout/
│   ├── AppLayout.tsx          # Main app wrapper with navigation
│   ├── Header.tsx             # Top navigation bar
│   ├── Sidebar.tsx            # Left sidebar navigation
│   ├── Footer.tsx             # Bottom footer
│   └── Navigation.tsx         # Navigation menu component
```

#### 7.2.2 Page Layout Components

```
components/
├── pages/
│   ├── HomePage.tsx           # Landing page with hero section
│   ├── ViewerHub.tsx          # Main content browsing page
│   ├── CreatorHub.tsx         # Creator dashboard
│   ├── AnimationEditor.tsx    # Animation workspace
│   └── ProfilePage.tsx        # User profile page
```

### 7.3 Viewer Hub Components (Content Side)

#### 7.3.1 Content Display Components

```
components/
├── viewer/
│   ├── HeroSection.tsx        # Featured content carousel
│   ├── ContentGrid.tsx        # Grid layout for manga/anime
│   ├── ContentCard.tsx        # Individual title card
│   ├── ContentModal.tsx       # Detailed content view
│   ├── ChapterList.tsx        # Chapter/episode listing
│   ├── MangaViewer.tsx        # Manga reading interface
│   ├── VideoPlayer.tsx        # Animation video player
│   └── ContentExplorer.tsx    # Browse and filter content
```

#### 7.3.2 Navigation & Filtering

```
components/
├── viewer/
│   ├── SearchBar.tsx          # Global search functionality
│   ├── FilterPanel.tsx        # Genre, status, rating filters
│   ├── SortOptions.tsx        # Sort by popularity, date, etc.
│   ├── BreadcrumbNav.tsx      # Navigation breadcrumbs
│   └── Pagination.tsx         # Page navigation
```

#### 7.3.3 Social & Community

```
components/
├── viewer/
│   ├── CommentsSection.tsx    # User comments and discussions
│   ├── RatingSystem.tsx       # User ratings and reviews
│   ├── ShareButtons.tsx       # Social media sharing
│   ├── BookmarkButton.tsx     # Save to favorites
│   └── ContinueWatching.tsx   # Resume where left off
```

### 7.4 Animation Editor Components

#### 7.4.1 Canvas & Drawing Tools

```
components/
├── editor/
│   ├── Canvas.tsx             # Main drawing canvas
│   ├── Toolbar.tsx            # Drawing tools panel
│   ├── ColorPicker.tsx        # Color selection tool
│   ├── BrushSettings.tsx      # Brush size and type
│   ├── LayerPanel.tsx         # Layer management
│   ├── Timeline.tsx           # Frame timeline
│   └── OnionSkinning.tsx      # Previous/next frame overlay
```

#### 7.4.2 Animation Controls

```
components/
├── editor/
│   ├── PlaybackControls.tsx   # Play, pause, stop buttons
│   ├── FrameControls.tsx      # Add, delete, duplicate frames
│   ├── KeyframeEditor.tsx     # Keyframe management
│   ├── TweeningPanel.tsx      # In-between frame generation
│   ├── ExportPanel.tsx        # Export options and settings
│   └── ProjectSettings.tsx    # Project configuration
```

#### 7.4.3 Collaboration Features

```
components/
├── editor/
│   ├── CollaborationPanel.tsx # Team member presence
│   ├── ChatPanel.tsx          # Real-time team chat
│   ├── UserCursors.tsx        # Live cursor indicators
│   ├── VersionControl.tsx     # Save points and history
│   └── ShareProject.tsx       # Invite collaborators
```

### 7.5 Creator Hub Components

#### 7.5.1 Project Management

```
components/
├── creator/
│   ├── ProjectDashboard.tsx   # Overview of all projects
│   ├── ProjectCard.tsx        # Individual project display
│   ├── CreateProject.tsx      # New project wizard
│   ├── ProjectSettings.tsx    # Project configuration
│   └── ProjectAnalytics.tsx   # Views, engagement metrics
```

#### 7.5.2 Team Management

```
components/
├── creator/
│   ├── TeamList.tsx           # List of team members
│   ├── InviteMembers.tsx      # Invite new team members
│   ├── RoleManagement.tsx     # Assign roles and permissions
│   ├── TeamChat.tsx           # Team communication
│   └── TaskAssignment.tsx     # Assign tasks to members
```

#### 7.5.3 Content Management

```
components/
├── creator/
│   ├── MangaUpload.tsx        # Upload manga chapters
│   ├── ChapterEditor.tsx      # Edit chapter metadata
│   ├── CoverImageEditor.tsx   # Upload/edit cover images
│   ├── PublishingPanel.tsx    # Publish content
│   └── ContentModeration.tsx  # Review and approve content
```

### 7.6 Authentication & User Components

#### 7.6.1 Authentication

```
components/
├── auth/
│   ├── LoginForm.tsx          # User login
│   ├── RegisterForm.tsx       # User registration
│   ├── ForgotPassword.tsx     # Password recovery
│   ├── ProfileModal.tsx       # User profile management
│   └── SettingsModal.tsx      # User settings
```

#### 7.6.2 User Profile

```
components/
├── user/
│   ├── ProfileHeader.tsx      # Profile banner and avatar
│   ├── ProfileStats.tsx       # User statistics
│   ├── UserProjects.tsx       # User's projects
│   ├── UserContributions.tsx  # User's contributions
│   └── UserActivity.tsx       # Recent activity feed
```

### 7.7 Shared UI Components

#### 7.7.1 Basic UI Elements

```
components/
├── ui/
│   ├── Button.tsx             # Reusable button component
│   ├── Input.tsx              # Text input component
│   ├── Modal.tsx              # Modal dialog component
│   ├── Dropdown.tsx           # Dropdown menu component
│   ├── Tabs.tsx               # Tab navigation component
│   ├── Card.tsx               # Card container component
│   ├── Badge.tsx              # Status badge component
│   └── Loading.tsx            # Loading spinner component
```

#### 7.7.2 Data Display

```
components/
├── ui/
│   ├── Table.tsx              # Data table component
│   ├── List.tsx               # List component
│   ├── Grid.tsx               # Grid layout component
│   ├── Carousel.tsx           # Image carousel component
│   ├── ProgressBar.tsx        # Progress indicator
│   ├── Rating.tsx             # Star rating component
│   └── Avatar.tsx             # User avatar component
```

#### 7.7.3 Feedback & Notifications

```
components/
├── ui/
│   ├── Toast.tsx              # Toast notification
│   ├── Alert.tsx              # Alert message component
│   ├── Tooltip.tsx            # Tooltip component
│   ├── NotificationBell.tsx   # Notification indicator
│   └── ErrorBoundary.tsx      # Error handling component
```

### 7.8 State Management Components

#### 7.8.1 Context Providers

```
components/
├── providers/
│   ├── AuthProvider.tsx       # Authentication state
│   ├── ThemeProvider.tsx      # Theme and styling state
│   ├── EditorProvider.tsx     # Animation editor state
│   ├── CollaborationProvider.tsx # Real-time collaboration state
│   └── NotificationProvider.tsx  # Notification state
```

#### 7.8.2 Custom Hooks

```
hooks/
├── useAuth.ts                 # Authentication logic
├── useEditor.ts               # Editor state management
├── useCollaboration.ts        # Real-time collaboration
├── useProjects.ts             # Project data management
├── useContent.ts              # Content browsing logic
└── useNotifications.ts        # Notification handling
```

### 7.9 Component Development Guidelines

#### 7.9.1 Component Structure

- **Functional Components**: Use React functional components with hooks
- **TypeScript**: All components should be typed with interfaces
- **Props Interface**: Define clear prop interfaces for each component
- **Default Props**: Provide sensible defaults where appropriate
- **Error Boundaries**: Wrap major sections with error boundaries

#### 7.9.2 Styling Approach

- **Tailwind CSS**: Use Tailwind for utility-first styling
- **Component Variants**: Use variant props for different styles
- **Responsive Design**: Mobile-first responsive approach
- **Dark Mode**: Support light/dark theme switching
- **Accessibility**: Follow WCAG guidelines for accessibility

#### 7.9.3 Performance Optimization

- **React.memo**: Memoize components that don't need frequent re-renders
- **useCallback**: Memoize callback functions passed to child components
- **useMemo**: Memoize expensive calculations
- **Lazy Loading**: Lazy load components that aren't immediately needed
- **Code Splitting**: Split code by routes and features

#### 7.9.4 Testing Strategy

- **Unit Tests**: Test individual component logic
- **Integration Tests**: Test component interactions
- **Visual Tests**: Test component rendering and styling
- **Accessibility Tests**: Test keyboard navigation and screen readers
- **Performance Tests**: Test component rendering performance

### 7.10 Component Dependencies

#### 7.10.1 External Libraries

- **React**: Core framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **React Query**: Data fetching and caching
- **Socket.io**: Real-time communication
- **Fabric.js**: Canvas manipulation
- **React Hook Form**: Form handling
- **Zod**: Schema validation

#### 7.10.2 Internal Dependencies

- **Shared UI Components**: Reusable UI elements
- **Custom Hooks**: Business logic abstraction
- **Context Providers**: Global state management
- **Utility Functions**: Helper functions and constants
- **Type Definitions**: Shared TypeScript interfaces

This component plan provides a comprehensive structure for building a scalable, maintainable frontend that supports all the features outlined in the AI-Nime platform specification.

## 8. Authentication Flow & Security Strategy

### 8.1 Authentication Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Login    │───▶│  Next.js API     │───▶│  JWT Issued     │
│   (Email/Pwd)   │    │  Route (/api/auth)│    │  with Role      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Route Guard    │◀───│  Middleware      │◀───│  Stored in      │
│  (Protected)    │    │  (Check JWT)     │    │  Cookie/Header  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  User Profile   │◀───│  Decode JWT      │◀───│  API Request    │
│  & Permissions  │    │  (Role/Claims)   │    │  with Token     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

#### 8.1.1 Detailed Flow Steps

1. **User Login**: User enters email/password or uses social login
2. **API Route**: Next.js API route validates credentials against database
3. **JWT Generation**: Server issues JWT with user role and claims
4. **Token Storage**: JWT stored in HTTP-only cookie or Authorization header
5. **Middleware Check**: Next.js middleware validates JWT on protected routes
6. **Route Protection**: Unauthorized users redirected to login
7. **User Context**: Decoded JWT provides user profile and permissions
8. **API Requests**: Subsequent requests include JWT for authentication

### 8.2 Authentication Strategy Options

#### 8.2.1 Option 1: Custom JWT Implementation (MVP)

**Pros:**

- Full control over authentication logic
- No external dependencies
- Customizable token structure
- Cost-effective for MVP

**Cons:**

- More development time
- Security considerations (token refresh, CSRF protection)
- Manual implementation of password reset, email verification

**Implementation:**

```typescript
// /api/auth/login
export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Validate credentials
  const user = await validateUser(email, password);

  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // Set HTTP-only cookie
  const response = Response.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
```

#### 8.2.2 Option 2: Supabase Auth (Recommended for Scale)

**Pros:**

- Built-in social login (Google, GitHub, Discord)
- Automatic password reset and email verification
- Rate limiting and security features
- Real-time subscriptions
- Row Level Security (RLS)
- Free tier with generous limits

**Cons:**

- Vendor lock-in to Supabase
- Learning curve for team
- Potential costs at scale

**Implementation:**

```typescript
// Using Supabase Auth
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});

// Social login
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
});
```

#### 8.2.3 Option 3: NextAuth.js (Hybrid Approach)

**Pros:**

- Multiple authentication providers
- Built-in session management
- JWT and database adapters
- Easy to implement
- Great documentation

**Cons:**

- Additional dependency
- Some configuration complexity
- Limited real-time features

**Implementation:**

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate credentials and return user
        const user = await validateUser(
          credentials?.email,
          credentials?.password
        );
        return user;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
});
```

### 8.3 Recommended Authentication Strategy

#### 8.3.1 Phase 1 (MVP): Custom JWT Implementation

**Rationale:**

- Faster development for MVP validation
- No external dependencies or costs
- Full control over user experience
- Easy to migrate to Supabase later

**Features:**

- Email/password authentication
- JWT with role-based access
- HTTP-only cookies for security
- Basic password reset flow
- Email verification (optional for MVP)

#### 8.3.2 Phase 2 (Scale): Migrate to Supabase Auth

**Rationale:**

- Built-in social login for user growth
- Advanced security features
- Real-time collaboration support
- Row Level Security for data protection
- Cost-effective at scale

**Migration Strategy:**

1. Implement Supabase Auth alongside existing JWT
2. Add social login providers
3. Migrate existing users to Supabase
4. Implement Row Level Security
5. Remove custom JWT implementation

### 8.4 Security Considerations

#### 8.4.1 JWT Security

- **Secret Management**: Use strong, environment-based secrets
- **Token Expiration**: Short-lived tokens (7 days max)
- **Refresh Tokens**: Implement refresh token rotation
- **CSRF Protection**: Use SameSite cookies and CSRF tokens

#### 8.4.2 Password Security

- **Hashing**: Use bcrypt with salt rounds (12+)
- **Password Policy**: Enforce strong password requirements
- **Rate Limiting**: Limit login attempts
- **Account Lockout**: Temporary lockout after failed attempts

#### 8.4.3 Session Security

- **HTTP-Only Cookies**: Prevent XSS attacks
- **Secure Cookies**: Use HTTPS in production
- **Session Timeout**: Automatic logout after inactivity
- **Device Management**: Track and manage active sessions

### 8.5 Role-Based Access Control (RBAC)

#### 8.5.1 User Roles

```typescript
enum UserRole {
  VIEWER = "viewer", // Can view content and comment
  CREATOR = "creator", // Can upload manga and create projects
  ANIMATOR = "animator", // Can participate in animation projects
  MODERATOR = "moderator", // Can moderate content and users
  ADMIN = "admin", // Full platform access
}
```

#### 8.5.2 Permission Matrix

| Feature          | Viewer | Creator | Animator | Moderator | Admin |
| ---------------- | ------ | ------- | -------- | --------- | ----- |
| View Content     | ✅     | ✅      | ✅       | ✅        | ✅    |
| Comment          | ✅     | ✅      | ✅       | ✅        | ✅    |
| Upload Manga     | ❌     | ✅      | ❌       | ✅        | ✅    |
| Create Projects  | ❌     | ✅      | ✅       | ✅        | ✅    |
| Moderate Content | ❌     | ❌      | ❌       | ✅        | ✅    |
| Manage Users     | ❌     | ❌      | ❌       | ❌        | ✅    |

### 8.6 Implementation Timeline

#### 8.6.1 Week 1-2: Custom JWT Setup

- Set up JWT generation and validation
- Implement login/logout endpoints
- Create middleware for route protection
- Basic user registration and authentication

#### 8.6.2 Week 3-4: Security & Features

- Password reset functionality
- Email verification (optional)
- Session management
- Role-based access control

#### 8.6.3 Week 5-6: Testing & Polish

- Security testing and penetration testing
- Performance optimization
- Error handling and logging
- Documentation and deployment

#### 8.6.4 Future: Supabase Migration

- Research and planning (1-2 weeks)
- Parallel implementation (2-3 weeks)
- User migration (1 week)
- Testing and deployment (1 week)

This authentication strategy provides a clear path from MVP to scale while maintaining security and user experience throughout the platform's growth.

## 9. AI-Nime Proprietary File Format (.aianime)

### 9.1 File Format Strategy

The `.aianime` file format serves as both a technical solution and a powerful branding tool for the AI-Nime platform. This proprietary format enables seamless project sharing, backup, and future expansion into desktop applications.

#### 9.1.1 Branding Benefits

- **Platform Recognition**: Establishes AI-Nime as a unique animation platform
- **User Loyalty**: Proprietary format encourages platform retention
- **Professional Credibility**: Industry-standard approach (like .psd, .ai, .sketch)
- **Marketing Opportunity**: "Export as .aianime" becomes a recognizable feature

#### 9.1.2 Technical Benefits

- **Complete Project Preservation**: All layers, frames, and metadata intact
- **Version Control**: Built-in project history and save points
- **Collaboration Ready**: Team member data and permissions included
- **Future-Proof**: Extensible format for new features and tools

### 9.2 .aianime File Structure

#### 9.2.1 File Format Specification

```json
{
  "version": "1.0.0",
  "metadata": {
    "projectName": "My Animation Project",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastModified": "2024-01-20T14:45:00Z",
    "creator": {
      "userId": "uuid",
      "username": "animator123"
    },
    "team": {
      "teamId": "uuid",
      "members": [
        {
          "userId": "uuid",
          "role": "lead_animator",
          "username": "animator123"
        }
      ]
    },
    "mangaSource": {
      "mangaId": "uuid",
      "chapterId": "uuid",
      "chapterNumber": 1
    },
    "settings": {
      "frameRate": 24,
      "resolution": {
        "width": 1920,
        "height": 1080
      },
      "duration": 30.5
    }
  },
  "timeline": {
    "frames": [
      {
        "frameNumber": 1,
        "keyframe": true,
        "duration": 0.5,
        "layers": [
          {
            "layerId": "uuid",
            "layerName": "Background",
            "layerType": "background",
            "visible": true,
            "opacity": 1.0,
            "elements": [
              {
                "elementId": "uuid",
                "type": "image",
                "data": "base64_encoded_image_data",
                "transform": {
                  "x": 0,
                  "y": 0,
                  "scaleX": 1.0,
                  "scaleY": 1.0,
                  "rotation": 0
                }
              }
            ]
          },
          {
            "layerId": "uuid",
            "layerName": "Character",
            "layerType": "character",
            "visible": true,
            "opacity": 1.0,
            "elements": [
              {
                "elementId": "uuid",
                "type": "drawing",
                "data": "vector_path_data",
                "stroke": {
                  "color": "#000000",
                  "width": 2,
                  "style": "solid"
                },
                "fill": {
                  "color": "#ffffff",
                  "type": "solid"
                },
                "transform": {
                  "x": 100,
                  "y": 200,
                  "scaleX": 1.0,
                  "scaleY": 1.0,
                  "rotation": 0
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "assets": {
    "images": [
      {
        "assetId": "uuid",
        "name": "character_pose_1.png",
        "type": "image/png",
        "data": "base64_encoded_data",
        "dimensions": {
          "width": 500,
          "height": 800
        }
      }
    ],
    "audio": [
      {
        "assetId": "uuid",
        "name": "background_music.mp3",
        "type": "audio/mpeg",
        "data": "base64_encoded_data",
        "duration": 30.5
      }
    ]
  },
  "collaboration": {
    "chatHistory": [
      {
        "userId": "uuid",
        "username": "animator123",
        "message": "Great work on the character design!",
        "timestamp": "2024-01-20T14:30:00Z"
      }
    ],
    "versionHistory": [
      {
        "version": "1.0",
        "timestamp": "2024-01-20T14:45:00Z",
        "userId": "uuid",
        "description": "Initial keyframes completed"
      }
    ]
  },
  "exportSettings": {
    "format": "mp4",
    "quality": "high",
    "codec": "h264",
    "bitrate": 5000
  }
}
```

#### 9.2.2 File Compression Strategy

- **GZIP Compression**: Reduce file size by 60-80%
- **Image Optimization**: WebP format for embedded images
- **Audio Compression**: AAC format for embedded audio
- **Differential Encoding**: Only store changes between frames
- **Lazy Loading**: Load assets on-demand in desktop apps

### 9.3 Implementation Features

#### 9.3.1 Export Functionality

```typescript
// Export project as .aianime file
export async function exportProject(projectId: string): Promise<Blob> {
  const project = await getProject(projectId);
  const aianimeData = {
    version: "1.0.0",
    metadata: {
      projectName: project.name,
      createdAt: project.createdAt,
      lastModified: new Date().toISOString(),
      creator: project.creator,
      team: project.team,
      mangaSource: project.mangaSource,
      settings: project.settings,
    },
    timeline: project.timeline,
    assets: project.assets,
    collaboration: project.collaboration,
    exportSettings: project.exportSettings,
  };

  // Compress and create blob
  const jsonString = JSON.stringify(aianimeData);
  const compressed = await compressData(jsonString);

  return new Blob([compressed], {
    type: "application/x-aianime",
  });
}

// Download .aianime file
export function downloadAianimeFile(projectId: string) {
  exportProject(projectId).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_${projectId}.aianime`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

#### 9.3.2 Import Functionality

```typescript
// Import .aianime file
export async function importProject(file: File): Promise<Project> {
  const compressed = await file.arrayBuffer();
  const jsonString = await decompressData(compressed);
  const aianimeData = JSON.parse(jsonString);

  // Validate file format
  if (!aianimeData.version || !aianimeData.metadata) {
    throw new Error("Invalid .aianime file format");
  }

  // Convert to project format
  const project: Project = {
    id: generateId(),
    name: aianimeData.metadata.projectName,
    creator: aianimeData.metadata.creator,
    team: aianimeData.metadata.team,
    mangaSource: aianimeData.metadata.mangaSource,
    settings: aianimeData.metadata.settings,
    timeline: aianimeData.timeline,
    assets: aianimeData.assets,
    collaboration: aianimeData.collaboration,
    exportSettings: aianimeData.exportSettings,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return project;
}
```

### 9.4 User Experience Integration

#### 9.4.1 Export Options

```typescript
// Export menu component
const ExportMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuItem onClick={() => downloadAianimeFile(projectId)}>
        <DownloadIcon />
        Download as .aianime
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportAsMP4(projectId)}>
        <VideoIcon />
        Export as MP4
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportAsGIF(projectId)}>
        <GifIcon />
        Export as GIF
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportAsPNGSequence(projectId)}>
        <ImageIcon />
        Export as PNG Sequence
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
```

#### 9.4.2 File Association

- **Browser Integration**: Register .aianime MIME type
- **Desktop Apps**: Future file association for desktop companion
- **Drag & Drop**: Import .aianime files by dragging into browser
- **File Validation**: Visual feedback for valid/invalid files

### 9.5 Marketing & Branding Opportunities

#### 9.5.1 User Messaging

- **"Save your work as .aianime"** - Emphasizes project preservation
- **"Share .aianime files with your team"** - Collaboration focus
- **"Backup your projects as .aianime"** - Data security
- **"Import .aianime files from other creators"** - Community sharing

#### 9.5.2 Feature Highlights

- **Complete Project Preservation**: "Never lose your work again"
- **Team Collaboration**: "Share projects with your entire team"
- **Version History**: "Track every change and iteration"
- **Cross-Platform**: "Work on web, edit on desktop" (future)

#### 9.5.3 Community Features

- **Project Sharing**: Users can share .aianime files publicly
- **Template Library**: Pre-made .aianime templates
- **Collaboration Marketplace**: Find team members via shared projects
- **Learning Resources**: Tutorial projects in .aianime format

### 9.6 Future Expansion Possibilities

#### 9.6.1 Desktop Companion App

- **Native Performance**: Faster rendering and editing
- **Offline Work**: Edit without internet connection
- **Advanced Tools**: Professional-grade features
- **File Sync**: Seamless cloud synchronization

#### 9.6.2 Mobile App

- **View Projects**: Watch animations on mobile
- **Quick Edits**: Basic editing and feedback
- **Team Communication**: Chat and collaboration
- **Project Sharing**: Share via social media

#### 9.6.3 Third-Party Integration

- **Plugin System**: Third-party tools and effects
- **API Access**: External applications can read .aianime files
- **Export Plugins**: Additional export formats
- **Asset Libraries**: Integration with stock asset providers

### 9.7 Technical Implementation Timeline

#### 9.7.1 Phase 1 (MVP): Basic Export/Import

- **Week 1**: Define file format specification
- **Week 2**: Implement basic export functionality
- **Week 3**: Implement basic import functionality
- **Week 4**: Testing and validation

#### 9.7.2 Phase 2: Enhanced Features

- **Week 5-6**: Compression and optimization
- **Week 7-8**: Collaboration data integration
- **Week 9-10**: Advanced metadata and settings

#### 9.7.3 Phase 3: User Experience

- **Week 11-12**: Drag & drop import
- **Week 13-14**: File validation and error handling
- **Week 15-16**: Export options and settings

### 9.8 Competitive Advantages

#### 9.8.1 Platform Lock-in

- **Proprietary Format**: Users invested in .aianime ecosystem
- **Collaboration Features**: Team-based workflow encourages retention
- **Version History**: Complete project history tied to platform
- **Asset Management**: Centralized asset library

#### 9.8.2 Community Building

- **Project Sharing**: Users share and discover projects
- **Template Ecosystem**: Community-created templates
- **Learning Resources**: Tutorial projects and examples
- **Collaboration Network**: Find team members and projects

#### 9.8.3 Monetization Opportunities

- **Premium Export Formats**: Advanced export options
- **Cloud Storage**: Extended project storage
- **Team Features**: Advanced collaboration tools
- **Desktop App**: Premium desktop companion

The `.aianime` file format represents a strategic investment in platform branding, user retention, and future expansion opportunities. It positions AI-Nime as a professional animation platform while providing genuine value to users through complete project preservation and seamless collaboration.

## Conclusion

AI-Nime stands at the intersection of community, creativity, and cutting-edge technology, poised to fundamentally transform the landscape of manga animation. By empowering a global network of artists and fans to collaboratively bring stories to life, we are not just building a platform; we are cultivating a movement.

**Build together. Animate together. Watch together.**
