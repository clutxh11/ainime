// Core Application Types
export type CurrentView =
  | "viewer"
  | "creator"
  | "calendar"
  | "video"
  | "manga"
  | "content-explorer"
  | "animation-editor"
  | "project-dashboard"
  | "project-detail";

// Content Types
export interface ContentItem {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  status: string;
  seriesType?: string; // Added for manga/manhwa/manhua
  image?: string;
  heroImage?: string; // Added for hero banner (horizontal thumbnail)
  rating?: number;
  totalRatings?: number;
  tags?: string[];
  authors?: Array<{ name: string }>;
  chapters?: Array<{
    id: string;
    title: string;
    status: string;
    thumbnail_url?: string;
    release_date?: string;
    created_at: string;
    updated_at: string;
  }>;
  episodes?: Array<{
    id: string;
    title: string;
    status: string;
    thumbnail_url?: string;
    release_date?: string;
    created_at: string;
    updated_at: string;
  }>;
  volumes?: Array<{
    id: string;
    volume_number: number;
    title: string;
    description?: string;
    chapters: Array<{
      id: string;
      title: string;
      status: string;
      release_date?: string;
    }>;
  }>;
}

// Author Types
export interface Author {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  social_media?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
  role?: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectAuthor {
  id: string;
  project_id: string;
  author_id: string;
  role: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  author?: Author; // Include author details
}

export interface Chapter {
  id: string;
  title: string;
  status: "Finalized" | "In-Betweening" | "Storyboard" | "Draft";
  contributors: string[];
  thumbnail: string;
  pages?: string[];
  releaseDate?: string;
}

// Team & Project Types
export interface TeamMember {
  id?: string;
  name: string;
  role: string;
  userId?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  leadName?: string;
  leader?: string;
  members: TeamMember[];
  upvotes: number;
  views: number;
  mangaId?: string;
}

export interface Project {
  id: string;
  title: string;
  mangaId: string;
  description: string;
  status: "Active" | "Completed" | "Draft";
  teams: Team[];
  chapters: Chapter[];
  thumbnail?: string;
  tags?: string[];
}

// Animation Types
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  tool: string;
  layerId: string;
}

export interface AnimationFrame {
  id: string;
  keyframe: boolean;
  duration: number;
  layers: Record<string, any[]>;
}

export interface AnimationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: "background" | "character" | "effect" | "overlay";
}

export interface AnimationProject {
  version: string;
  metadata: {
    projectName: string;
    createdAt: string;
    lastModified: string;
    settings: {
      frameRate: number;
      resolution: { width: number; height: number };
      duration: number;
    };
  };
  timeline: {
    frames: AnimationFrame[];
  };
  layers: AnimationLayer[];
}

// Forum Types
export interface ForumPost {
  id: string;
  title: string;
  author: string;
  tags: string[];
  replies: number;
  likes: number;
  timeAgo: string;
  content: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: "viewer" | "creator" | "admin";
  avatar?: string;
  createdAt: Date;
}

// Modal State Types
export interface ModalStates {
  isProfileModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isContributionsModalOpen: boolean;
}

// Component Props Types
export interface ViewChangeHandler {
  (
    view: CurrentView,
    content?: ContentItem | Project | any,
    category?: string
  ): void;
}

export interface ComponentWithViewChange {
  onViewChange: ViewChangeHandler;
}

// API Response Types (for future backend integration)
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
