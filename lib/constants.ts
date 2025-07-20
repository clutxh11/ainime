// Application Configuration
export const APP_CONFIG = {
  name: "AI-Nime",
  tagline: "Build together. Animate together. Watch together.",
  version: "1.0.0-mvp",
} as const;

// Navigation Constants
export const NAVIGATION_ITEMS = [
  { id: "browse", label: "Browse", view: "content-explorer" as const },
  { id: "calendar", label: "Calendar", view: "calendar" as const },
  { id: "creator-hub", label: "Creator Hub", view: "creator" as const },
] as const;

// Content Categories
export const CONTENT_CATEGORIES = [
  "all",
  "trending",
  "manga",
  "favorites",
  "continue",
] as const;

// Content Types
export const CONTENT_TYPES = ["manga", "animated", "ongoing"] as const;

// Animation Tools
export const ANIMATION_TOOLS = [
  { id: "pencil", label: "Pencil" },
  { id: "eraser", label: "Eraser" },
  { id: "brush", label: "Brush" },
] as const;

// Genres
export const GENRES = [
  "Fantasy",
  "Sci-Fi",
  "Action",
  "Romance",
  "Comedy",
  "Drama",
  "Horror",
  "Adventure",
  "Slice of Life",
  "Thriller",
] as const;

// User Roles
export const USER_ROLES = ["viewer", "creator", "admin"] as const;

// Team Roles
export const TEAM_ROLES = [
  "Lead Animator",
  "Animator",
  "Background Artist",
  "In-Between Artist",
  "Colorist",
  "Effects Artist",
  "Storyboard Artist",
  "Character Designer",
] as const;

// Project Status
export const PROJECT_STATUS = [
  "Active",
  "Completed",
  "Draft",
  "On Hold",
] as const;

// Chapter Status
export const CHAPTER_STATUS = [
  "Planning",
  "Storyboard",
  "Key Frames",
  "In-Betweening",
  "Coloring",
  "Effects",
  "Review",
  "Finalized",
] as const;

// API Endpoints (for future backend)
export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  manga: {
    list: "/api/manga",
    get: (id: string) => `/api/manga/${id}`,
    chapters: (id: string) => `/api/manga/${id}/chapters`,
    submit: "/api/manga/submit",
  },
  projects: {
    list: (mangaId: string) => `/api/projects/${mangaId}`,
    create: (mangaId: string) => `/api/projects/${mangaId}/create`,
    update: (id: string) => `/api/projects/${id}`,
    upvote: (id: string) => `/api/projects/${id}/upvote`,
  },
  teams: {
    create: "/api/teams/create",
    join: (id: string) => `/api/teams/${id}/join`,
    list: (mangaId: string) => `/api/teams/${mangaId}`,
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  theme: "ai-nime-theme",
  user: "ai-nime-user",
  drafts: "ai-nime-drafts",
  preferences: "ai-nime-preferences",
} as const;

// Default Values
export const DEFAULTS = {
  itemsPerPage: 12,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  animationFrameRate: 24,
  maxFrames: 500,
} as const;
