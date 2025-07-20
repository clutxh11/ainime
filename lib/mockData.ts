import type { ContentItem, ForumPost, Team, Project, Chapter } from "@/types";

// Mock Content Data - Expanded for better scrolling
export const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Dragon's Legacy",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A young warrior discovers an ancient dragon's power within himself and must learn to control it while protecting his village from dark forces.",
    tags: ["Fantasy", "Action", "Adventure"],
    chapters: [
      "Chapter 1: The Awakening",
      "Chapter 2: First Flight",
      "Chapter 3: The Ancient Temple",
    ],
    episodes: ["Episode 1: The Awakening", "Episode 2: First Flight"],
    rating: 4.8,
    progress: 65,
    currentEpisode: 1,
  },
  {
    id: "2",
    title: "Cyber Samurai",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "In a dystopian future, a lone samurai fights against corporate tyranny using both ancient sword techniques and advanced cybernetics.",
    tags: ["Sci-Fi", "Action", "Cyberpunk"],
    chapters: [
      "Chapter 1: Digital Blade",
      "Chapter 2: Corporate War",
      "Chapter 3: Memory Core",
    ],
    rating: 4.6,
    progress: 30,
    currentChapter: 2,
  },
  {
    id: "3",
    title: "Magical Academy Chronicles",
    type: "ongoing",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Students at a prestigious magical academy must master their powers while uncovering a conspiracy that threatens the magical world.",
    tags: ["Fantasy", "School", "Magic"],
    chapters: [
      "Chapter 1: Enrollment",
      "Chapter 2: First Spell",
      "Chapter 3: Hidden Secrets",
    ],
    episodes: ["Episode 1: Enrollment"],
    rating: 4.7,
    progress: 80,
    currentEpisode: 1,
  },
  {
    id: "4",
    title: "Space Pirates Saga",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A ragtag crew of space pirates navigates dangerous territories while searching for the legendary treasure of the cosmic emperor.",
    tags: ["Adventure", "Sci-Fi", "Comedy"],
    chapters: [
      "Chapter 1: The Heist",
      "Chapter 2: Escape Route",
      "Chapter 3: New Crew",
    ],
    rating: 4.5,
    progress: 15,
    currentChapter: 1,
  },
  {
    id: "5",
    title: "Mystic Warriors",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Ancient warriors wielding mystical powers battle against an otherworldly invasion threatening their realm.",
    tags: ["Fantasy", "Action", "Supernatural"],
    chapters: [
      "Chapter 1: The Calling",
      "Chapter 2: First Battle",
      "Chapter 3: Ancient Powers",
    ],
    episodes: ["Episode 1: The Calling"],
    rating: 4.9,
    progress: 45,
    currentEpisode: 1,
  },
  {
    id: "6",
    title: "Urban Legends",
    type: "ongoing",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Modern-day investigators uncover supernatural mysteries hidden in the shadows of metropolitan cities.",
    tags: ["Horror", "Mystery", "Urban"],
    chapters: ["Chapter 1: First Contact", "Chapter 2: The Investigation"],
    episodes: ["Episode 1: First Contact"],
    rating: 4.3,
    progress: 0,
  },
  {
    id: "7",
    title: "Elemental Guardians",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Four teenagers discover they are the chosen guardians of the elemental forces and must protect the world from ancient evil.",
    tags: ["Fantasy", "Adventure", "Friendship"],
    chapters: [
      "Chapter 1: Discovery",
      "Chapter 2: Training",
      "Chapter 3: First Mission",
    ],
    episodes: ["Episode 1: Discovery", "Episode 2: Training"],
    rating: 4.4,
    progress: 90,
    currentEpisode: 2,
  },
  {
    id: "8",
    title: "Neon Dreams",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "In a neon-lit future city, a hacker uncovers a conspiracy that threatens to destroy the boundary between reality and virtual worlds.",
    tags: ["Cyberpunk", "Thriller", "Sci-Fi"],
    chapters: [
      "Chapter 1: The Hack",
      "Chapter 2: Deep Web",
      "Chapter 3: Reality Break",
    ],
    rating: 4.2,
    progress: 60,
    currentChapter: 2,
  },
  {
    id: "9",
    title: "Forest Spirits",
    type: "ongoing",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A young botanist discovers a hidden world of forest spirits and becomes their protector against industrial destruction.",
    tags: ["Nature", "Fantasy", "Environmental"],
    chapters: ["Chapter 1: The Grove", "Chapter 2: Spirit World"],
    episodes: ["Episode 1: The Grove"],
    rating: 4.6,
    progress: 25,
    currentChapter: 1,
  },
  {
    id: "10",
    title: "Stellar Knights",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Elite space knights defend the galaxy from alien invasions using advanced mecha suits and ancient combat techniques.",
    tags: ["Mecha", "Space", "Action"],
    chapters: [
      "Chapter 1: Recruitment",
      "Chapter 2: First Battle",
      "Chapter 3: New Threat",
    ],
    episodes: [
      "Episode 1: Recruitment",
      "Episode 2: First Battle",
      "Episode 3: New Threat",
    ],
    rating: 4.7,
    progress: 35,
    currentEpisode: 1,
  },
  {
    id: "11",
    title: "Time Weavers",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A group of time travelers attempt to prevent historical disasters while avoiding paradoxes that could unravel reality.",
    tags: ["Time Travel", "Adventure", "Drama"],
    chapters: [
      "Chapter 1: The Mission",
      "Chapter 2: Ancient Rome",
      "Chapter 3: Paradox",
    ],
    rating: 4.8,
    progress: 0,
  },
  {
    id: "12",
    title: "Shadow Academy",
    type: "ongoing",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Students at a secret academy learn to control their supernatural abilities while uncovering dark secrets about their institution.",
    tags: ["Supernatural", "School", "Mystery"],
    chapters: ["Chapter 1: Admission", "Chapter 2: First Lesson"],
    episodes: ["Episode 1: Admission"],
    rating: 4.4,
    progress: 70,
    currentEpisode: 1,
  },
  // Additional content for better scrolling
  {
    id: "13",
    title: "Galactic Conquest",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "An epic space opera following rebel forces as they fight against an oppressive galactic empire.",
    tags: ["Space", "War", "Epic"],
    chapters: [
      "Chapter 1: Rebellion Begins",
      "Chapter 2: First Strike",
      "Chapter 3: Alliance",
    ],
    episodes: ["Episode 1: Rebellion Begins", "Episode 2: First Strike"],
    rating: 4.9,
    progress: 50,
    currentEpisode: 1,
  },
  {
    id: "14",
    title: "Phantom Thief Chronicles",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A master thief targets corrupt corporations while evading both law enforcement and rival criminal organizations.",
    tags: ["Crime", "Mystery", "Thriller"],
    chapters: [
      "Chapter 1: First Heist",
      "Chapter 2: The Hunt",
      "Chapter 3: Double Cross",
    ],
    rating: 4.5,
    progress: 75,
    currentChapter: 2,
  },
  {
    id: "15",
    title: "Divine Ascension",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Mortals compete in trials set by gods to earn the right to ascend to divine status and reshape reality.",
    tags: ["Fantasy", "Competition", "Divine"],
    chapters: [
      "Chapter 1: The Trials Begin",
      "Chapter 2: First Challenge",
      "Chapter 3: Divine Power",
    ],
    episodes: ["Episode 1: The Trials Begin"],
    rating: 4.8,
    progress: 20,
    currentEpisode: 1,
  },
  {
    id: "16",
    title: "Ocean Depths",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Deep-sea explorers discover an ancient underwater civilization and must navigate political intrigue beneath the waves.",
    tags: ["Adventure", "Ocean", "Discovery"],
    chapters: [
      "Chapter 1: The Descent",
      "Chapter 2: Lost City",
      "Chapter 3: Ancient Secrets",
    ],
    rating: 4.4,
    progress: 85,
    currentChapter: 3,
  },
  {
    id: "17",
    title: "Mech Warriors",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Pilots of giant robots defend Earth from alien invaders in intense mecha battles across multiple fronts.",
    tags: ["Mecha", "Action", "War"],
    chapters: [
      "Chapter 1: First Deploy",
      "Chapter 2: Battle Lines",
      "Chapter 3: New Threat",
    ],
    episodes: ["Episode 1: First Deploy", "Episode 2: Battle Lines"],
    rating: 4.7,
    progress: 40,
    currentEpisode: 1,
  },
  {
    id: "18",
    title: "Mirror Dimensions",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "A teenager discovers they can travel between parallel dimensions and must prevent reality from collapsing.",
    tags: ["Sci-Fi", "Parallel Worlds", "Adventure"],
    chapters: [
      "Chapter 1: The Mirror",
      "Chapter 2: Other Side",
      "Chapter 3: Reality Break",
    ],
    rating: 4.6,
    progress: 10,
    currentChapter: 1,
  },
  {
    id: "19",
    title: "Shadow Hunters",
    type: "animated",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Elite warriors hunt supernatural creatures that threaten the balance between the human and spirit worlds.",
    tags: ["Supernatural", "Action", "Horror"],
    chapters: [
      "Chapter 1: The Hunt Begins",
      "Chapter 2: Dark Spirits",
      "Chapter 3: Ancient Evil",
    ],
    episodes: ["Episode 1: The Hunt Begins"],
    rating: 4.5,
    progress: 55,
    currentEpisode: 1,
  },
  {
    id: "20",
    title: "Sky Kingdoms",
    type: "manga",
    image: "/placeholder.svg?height=300&width=200",
    synopsis:
      "Floating islands in the sky host competing kingdoms vying for control of ancient sky magic.",
    tags: ["Fantasy", "Sky", "Kingdoms"],
    chapters: [
      "Chapter 1: Rising Kingdoms",
      "Chapter 2: Sky Magic",
      "Chapter 3: War Begins",
    ],
    rating: 4.7,
    progress: 30,
    currentChapter: 2,
  },
];

// Mock Hero Content for carousel
export const mockHeroContent = mockContent.slice(0, 5).map((item) => ({
  ...item,
  description: item.synopsis,
  image: "/placeholder.svg?height=500&width=1200",
}));

// Mock Forum Posts
export const mockForumPosts: ForumPost[] = [
  {
    id: "1",
    title: "Looking for experienced storyboard artists for Dragon's Legacy",
    author: "SakuraArt",
    tags: ["Team Recruiting", "Storyboard"],
    replies: 23,
    likes: 45,
    timeAgo: "2h ago",
    content:
      "We're working on Chapter 3 and need help with complex action sequences...",
  },
  {
    id: "2",
    title: "Animation techniques for smooth character movement",
    author: "ArtMaster",
    tags: ["Animation Techniques", "Tutorial"],
    replies: 67,
    likes: 128,
    timeAgo: "5h ago",
    content:
      "Here are some tips I've learned for creating fluid character animations...",
  },
  {
    id: "3",
    title: "Best practices for color consistency across frames",
    author: "ColorMaster",
    tags: ["Coloring", "Tips"],
    replies: 34,
    likes: 89,
    timeAgo: "1d ago",
    content: "Maintaining consistent colors throughout animation sequences...",
  },
];

// Mock Teams Data
export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Dragon Animators",
    description:
      "Passionate team focused on bringing epic fantasy scenes to life",
    memberCount: 8,
    leadName: "SakuraArt",
    members: [
      { name: "SakuraArt", role: "Lead Animator" },
      { name: "MotionMaster", role: "In-Between Artist" },
      { name: "ColorWiz", role: "Background Artist" },
      { name: "EffectsPro", role: "Effects Artist" },
    ],
    upvotes: 156,
    views: 2340,
    mangaId: "1",
  },
  {
    id: "2",
    name: "Cyber Studio",
    description: "Specializing in futuristic and cyberpunk animations",
    memberCount: 6,
    leadName: "TechNinja",
    members: [
      { name: "TechNinja", role: "Lead Animator" },
      { name: "NeonArt", role: "VFX Artist" },
      { name: "CyberColorist", role: "Colorist" },
    ],
    upvotes: 89,
    views: 1560,
    mangaId: "2",
  },
  {
    id: "3",
    name: "Fantasy Forge",
    description: "Creating magical worlds and mystical creatures",
    memberCount: 10,
    leadName: "MysticDraw",
    members: [
      { name: "MysticDraw", role: "Lead Animator" },
      { name: "SpellCaster", role: "Effects Artist" },
      { name: "RuneMaker", role: "Background Artist" },
      { name: "MagicMotion", role: "Animator" },
    ],
    upvotes: 203,
    views: 3120,
    mangaId: "3",
  },
];

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: "dragons-legacy",
    title: "Dragon's Legacy Animation Project",
    mangaId: "1",
    description:
      "Community-driven animation of the epic fantasy manga Dragon's Legacy",
    status: "Active",
    teams: mockTeams.filter((team) => team.mangaId === "1"),
    chapters: [
      {
        id: "1",
        title: "Chapter 1: The Awakening",
        status: "Finalized",
        contributors: ["SakuraArt", "MotionMaster"],
        thumbnail: "/placeholder.svg?height=80&width=120",
      },
      {
        id: "2",
        title: "Chapter 2: First Flight",
        status: "In-Betweening",
        contributors: ["ColorWiz", "EffectsPro"],
        thumbnail: "/placeholder.svg?height=80&width=120",
      },
    ],
    thumbnail: "/placeholder.svg?height=200&width=300",
    tags: ["Fantasy", "Action"],
  },
  {
    id: "cyber-samurai",
    title: "Cyber Samurai Animation Project",
    mangaId: "2",
    description: "Bringing the cyberpunk world of Cyber Samurai to life",
    status: "Active",
    teams: mockTeams.filter((team) => team.mangaId === "2"),
    chapters: [
      {
        id: "1",
        title: "Chapter 1: Digital Blade",
        status: "Storyboard",
        contributors: ["TechNinja"],
        thumbnail: "/placeholder.svg?height=80&width=120",
      },
    ],
    thumbnail: "/placeholder.svg?height=200&width=300",
    tags: ["Sci-Fi", "Cyberpunk"],
  },
];

// Mock Submissions Data
export const mockMangaSubmissions = [
  {
    id: "1",
    title: "My Original Series - Volume 1",
    chapters: ["Chapter 1", "Chapter 2", "Chapter 3"],
    status: "published" as const,
    views: 1247,
    createdAt: "2 weeks ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "2",
    title: "My Original Series - Volume 2",
    chapters: ["Chapter 4", "Chapter 5"],
    status: "under-review" as const,
    createdAt: "1 week ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

// Mock Animation Saves Data
export const mockAnimationSaves = [
  {
    id: "1",
    title: "Dragon's Legacy - Chapter 1 Animation",
    mangaChapter: "Chapter 1: The Awakening",
    status: "published" as const,
    createdAt: "3 days ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "2",
    title: "Cyber Samurai - Chapter 2 Animation",
    mangaChapter: "Chapter 2: Corporate War",
    status: "draft" as const,
    createdAt: "1 day ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

// Helper Functions
export function getContentById(id: string): ContentItem | undefined {
  return mockContent.find((item) => item.id === id);
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((project) => project.id === id);
}

export function getTeamsByMangaId(mangaId: string): Team[] {
  return mockTeams.filter((team) => team.mangaId === mangaId);
}

export function getTeamCountForProject(projectId: string): number {
  const project = getProjectById(projectId);
  return project?.teams.length || 0;
}
 