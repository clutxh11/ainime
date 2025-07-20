export interface Team {
  id: string
  name: string
  memberCount: number
  leadName: string
  description: string
  upvotes: number
  views: number
  members: Array<{
    name: string
    role: string
  }>
}

export interface Project {
  id: string
  title: string
  teams: Team[]
  progress: number
  image: string
}

// Centralized team data - this ensures consistency across all components
export const mockTeamsByProject: Record<string, Team[]> = {
  "dragons-legacy": [
    {
      id: "1",
      name: "Dragon Animators",
      memberCount: 8,
      leadName: "SakuraArt",
      description: "Passionate team focused on bringing epic fantasy scenes to life",
      upvotes: 156,
      views: 2340,
      members: [
        { name: "SakuraArt", role: "Lead Animator" },
        { name: "MotionMaster", role: "In-Between Artist" },
        { name: "ColorWiz", role: "Background Artist" },
      ],
    },
    {
      id: "2",
      name: "Fantasy Forge",
      memberCount: 6,
      leadName: "MysticDraw",
      description: "Creating magical worlds and mystical creatures",
      upvotes: 203,
      views: 3120,
      members: [
        { name: "MysticDraw", role: "Lead Animator" },
        { name: "SpellCaster", role: "Effects Artist" },
        { name: "RuneMaker", role: "Background Artist" },
      ],
    },
    {
      id: "3",
      name: "Epic Scenes Studio",
      memberCount: 4,
      leadName: "ActionMaster",
      description: "Specializing in high-impact action sequences",
      upvotes: 134,
      views: 1890,
      members: [
        { name: "ActionMaster", role: "Lead Animator" },
        { name: "FightChoreographer", role: "Action Specialist" },
      ],
    },
  ],
  "cyber-samurai": [
    {
      id: "4",
      name: "Cyber Studio",
      memberCount: 5,
      leadName: "TechNinja",
      description: "Specializing in futuristic and cyberpunk animations",
      upvotes: 89,
      views: 1560,
      members: [
        { name: "TechNinja", role: "Lead Animator" },
        { name: "NeonArt", role: "VFX Artist" },
      ],
    },
    {
      id: "5",
      name: "Digital Samurai",
      memberCount: 3,
      leadName: "CodeBlade",
      description: "Merging traditional samurai aesthetics with cyberpunk elements",
      upvotes: 67,
      views: 1200,
      members: [
        { name: "CodeBlade", role: "Lead Animator" },
        { name: "PixelKatana", role: "Character Designer" },
      ],
    },
  ],
}

export const mockProjects: Project[] = [
  {
    id: "dragons-legacy",
    title: "Dragon's Legacy",
    teams: mockTeamsByProject["dragons-legacy"],
    progress: 65,
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    id: "cyber-samurai",
    title: "Cyber Samurai",
    teams: mockTeamsByProject["cyber-samurai"],
    progress: 30,
    image: "/placeholder.svg?height=200&width=300",
  },
]

export function getTeamCountForProject(projectId: string): number {
  return mockTeamsByProject[projectId]?.length || 0
}

export function getTeamsForProject(projectId: string): Team[] {
  return mockTeamsByProject[projectId] || []
}
