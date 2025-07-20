// Core Application Types
export type CurrentView =
  | "viewer"
  | "creator"
  | "calendar"
  | "video"
  | "manga"
  | "content-explorer"
  | "animation-editor"
  | "project-dashboard";

// Content Types
export interface ContentItem {
  id: string;
  title: string;
  type: "manga" | "animated" | "ongoing";
  image: string;
  synopsis: string;
  tags: string[];
  chapters?: string[];
  episodes?: string[];
  rating: number;
  progress?: number;
  currentChapter?: number;
  currentEpisode?: number;
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
