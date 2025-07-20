"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Users, MessageCircle, ThumbsUp, Upload, Eye, Crown, UserPlus, Plus, FileText } from "lucide-react"
import type { CurrentView } from "@/app/page"

interface ProjectDashboardProps {
  project: any
  onViewChange: (view: CurrentView) => void
}

interface TeamMember {
  id: string
  name: string
  role: string
  avatar?: string
}

interface Team {
  id: string
  name: string
  description: string
  members: TeamMember[]
  lead: string
  upvotes: number
  views: number
}

interface Chapter {
  id: string
  title: string
  status: "Storyboard" | "In-Betweening" | "Finalized"
  contributors: string[]
  thumbnail: string
}

const mockUserTeam: Team = {
  id: "user-team",
  name: "Dragon Animators",
  description: "Passionate team focused on bringing epic fantasy scenes to life",
  members: [
    { id: "1", name: "You", role: "Lead Animator" },
    { id: "2", name: "SakuraArt", role: "Background Artist" },
    { id: "3", name: "MotionMaster", role: "In-Between Artist" },
  ],
  lead: "You",
  upvotes: 156,
  views: 2340,
}

const mockOtherTeams: Team[] = [
  {
    id: "team-2",
    name: "Cyber Studio",
    description: "Specializing in futuristic and cyberpunk animations",
    members: [
      { id: "1", name: "TechNinja", role: "Lead Animator" },
      { id: "2", name: "NeonArt", role: "VFX Artist" },
    ],
    lead: "TechNinja",
    upvotes: 89,
    views: 1560,
  },
  {
    id: "team-3",
    name: "Fantasy Forge",
    description: "Creating magical worlds and mystical creatures",
    members: [
      { id: "1", name: "MysticDraw", role: "Lead Animator" },
      { id: "2", name: "SpellCaster", role: "Effects Artist" },
      { id: "3", name: "RuneMaker", role: "Background Artist" },
    ],
    lead: "MysticDraw",
    upvotes: 203,
    views: 3120,
  },
]

const mockChapters: Chapter[] = [
  {
    id: "1",
    title: "Chapter 1: The Awakening",
    status: "Finalized",
    contributors: ["You", "SakuraArt"],
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "2",
    title: "Chapter 2: First Flight",
    status: "In-Betweening",
    contributors: ["MotionMaster", "You"],
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "3",
    title: "Chapter 3: The Ancient Temple",
    status: "Storyboard",
    contributors: ["SakuraArt"],
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
]

const mockComments = [
  {
    id: "1",
    author: "SakuraArt",
    content: "Great progress on the dragon transformation sequence! The wing movement looks natural.",
    timeAgo: "2h ago",
    likes: 12,
    hasImage: true,
  },
  {
    id: "2",
    author: "MotionMaster",
    content: "I've uploaded the in-between frames for the flight scene. Ready for review!",
    timeAgo: "4h ago",
    likes: 8,
    hasFile: true,
  },
]

export function ProjectDashboard({ project, onViewChange }: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState("your-team")
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false)
  const [isTeamDetailModalOpen, setIsTeamDetailModalOpen] = useState(false)
  const [hasUserTeam] = useState(true) // Set to false to show "Create Team" state

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team)
    setIsTeamDetailModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Finalized":
        return "bg-green-600"
      case "In-Betweening":
        return "bg-yellow-600"
      case "Storyboard":
        return "bg-blue-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => onViewChange("creator")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Creator Hub
              </Button>
              <div className="text-gray-400">/</div>
              <h1 className="text-lg font-semibold text-white">{project.title}</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - LeetCode Style */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="your-team" className="data-[state=active]:bg-red-600">
                  Your Team
                </TabsTrigger>
                <TabsTrigger value="other-teams" className="data-[state=active]:bg-red-600">
                  View Other Teams
                </TabsTrigger>
              </TabsList>

              <TabsContent value="your-team" className="mt-6">
                <div className="space-y-6">
                  {/* Manga Info */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Manga Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <img
                          src={project.image || "/placeholder.svg"}
                          alt={project.title}
                          className="w-24 h-32 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                          <p className="text-gray-300 mb-3">
                            A young warrior discovers an ancient dragon's power within himself and must learn to control
                            it while protecting his village from dark forces.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Fantasy</Badge>
                            <Badge variant="secondary">Action</Badge>
                            <Badge variant="secondary">Adventure</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Info */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Your Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hasUserTeam ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{mockUserTeam.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {mockUserTeam.upvotes}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {mockUserTeam.views}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-4">{mockUserTeam.description}</p>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-white">Team Members:</h4>
                            {mockUserTeam.members.map((member) => (
                              <div key={member.id} className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="text-white font-medium">{member.name}</span>
                                  <span className="text-gray-400 text-sm ml-2">- {member.role}</span>
                                  {member.name === mockUserTeam.lead && (
                                    <Crown className="w-4 h-4 text-yellow-400 inline ml-2" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-white mb-2">You're not in a team</h3>
                          <p className="text-gray-400 mb-4">
                            Create or join a team to start collaborating on this project
                          </p>
                          <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => setIsCreateTeamModalOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Team
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Discussion Section */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Team Discussion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 mb-4">
                        <div className="flex gap-3">
                          <Avatar>
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Share updates, ask questions, or discuss ideas..."
                              className="bg-gray-700 border-gray-600 text-white mb-2"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                                Post
                              </Button>
                              <Button size="sm" variant="outline" className="bg-transparent border-gray-600">
                                <Upload className="w-4 h-4 mr-2" />
                                Attach File
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {mockComments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar>
                                <AvatarFallback>{comment.author[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-white text-sm">{comment.author}</span>
                                  <span className="text-xs text-gray-400">{comment.timeAgo}</span>
                                </div>
                                <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
                                {comment.hasImage && (
                                  <img
                                    src="/placeholder.svg?height=100&width=150"
                                    alt="Attachment"
                                    className="w-32 h-20 object-cover rounded mb-2"
                                  />
                                )}
                                {comment.hasFile && (
                                  <div className="flex items-center gap-2 bg-gray-700 p-2 rounded mb-2 w-fit">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">flight_sequence_frames.zip</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-4">
                                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    {comment.likes}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
                                    Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="other-teams" className="mt-6">
                <div className="space-y-4">
                  {mockOtherTeams.map((team) => (
                    <Card
                      key={team.id}
                      className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                      onClick={() => handleTeamClick(team)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {team.upvotes}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {team.views}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{team.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-300">{team.members.length} members</span>
                            <span className="text-sm text-gray-400">• Lead: {team.lead}</span>
                          </div>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            View Team
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Project Scope */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Chapters in Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockChapters.map((chapter) => (
                    <Card
                      key={chapter.id}
                      className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => onViewChange("animation-editor")}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <img
                            src={chapter.thumbnail || "/placeholder.svg"}
                            alt={chapter.title}
                            className="w-16 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm mb-1 truncate">{chapter.title}</h4>
                            <Badge className={`${getStatusColor(chapter.status)} text-xs mb-2`}>{chapter.status}</Badge>
                            <div className="text-xs text-gray-400">Contributors: {chapter.contributors.join(", ")}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      <Dialog open={isCreateTeamModalOpen} onOpenChange={setIsCreateTeamModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Team Name</label>
              <Input className="bg-gray-700 border-gray-600 text-white" placeholder="Enter team name" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Team Description (Optional)</label>
              <Textarea
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Describe your team's focus and goals..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateTeamModalOpen(false)}
                className="bg-transparent border-gray-600"
              >
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700">Create Team</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Detail Modal */}
      <Dialog open={isTeamDetailModalOpen} onOpenChange={setIsTeamDetailModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedTeam && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {selectedTeam.upvotes}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedTeam.views}
                    </div>
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Request to Join
                  </Button>
                </div>
                <p className="text-gray-300">{selectedTeam.description}</p>
                <div>
                  <h4 className="font-semibold text-white mb-3">Team Members</h4>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-white font-medium">{member.name}</span>
                          <span className="text-gray-400 text-sm ml-2">- {member.role}</span>
                          {member.name === selectedTeam.lead && (
                            <Crown className="w-4 h-4 text-yellow-400 inline ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
