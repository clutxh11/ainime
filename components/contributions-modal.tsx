"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trophy, Star, Users, Play, BookOpen, Calendar } from "lucide-react"

interface ContributionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockContributions = [
  {
    id: "1",
    title: "Dragon's Legacy",
    type: "animation",
    role: "Background Artist",
    status: "completed",
    upvotes: 234,
    completedAt: "2 weeks ago",
    chapters: ["Chapter 1", "Chapter 2"],
  },
  {
    id: "2",
    title: "Cyber Samurai",
    type: "manga",
    role: "Lead Animator",
    status: "in-progress",
    upvotes: 89,
    completedAt: "Active",
    chapters: ["Chapter 1"],
  },
  {
    id: "3",
    title: "Magical Academy Chronicles",
    type: "animation",
    role: "Clean-up Artist",
    status: "completed",
    upvotes: 156,
    completedAt: "1 month ago",
    chapters: ["Chapter 3", "Chapter 4"],
  },
  {
    id: "4",
    title: "Space Pirates Saga",
    type: "manga",
    role: "Storyboard Artist",
    status: "completed",
    upvotes: 78,
    completedAt: "3 weeks ago",
    chapters: ["Chapter 1", "Chapter 2", "Chapter 3"],
  },
]

export function ContributionsModal({ open, onOpenChange }: ContributionsModalProps) {
  const totalUpvotes = mockContributions.reduce((sum, contrib) => sum + contrib.upvotes, 0)
  const completedProjects = mockContributions.filter((c) => c.status === "completed").length
  const activeProjects = mockContributions.filter((c) => c.status === "in-progress").length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            My Contributions
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{completedProjects}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{totalUpvotes}</div>
                <div className="text-sm text-gray-400">Total Upvotes</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{activeProjects}</div>
                <div className="text-sm text-gray-400">Active Projects</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">8</div>
                <div className="text-sm text-gray-400">Months Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Contributions Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Project History</h3>
            {mockContributions.map((contribution) => (
              <Card key={contribution.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                        {contribution.type === "animation" ? (
                          <Play className="w-6 h-6 text-white" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{contribution.title}</h4>
                        <p className="text-sm text-gray-400 mb-2">Role: {contribution.role}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {contribution.chapters.map((chapter) => (
                            <Badge key={chapter} variant="secondary" className="text-xs">
                              {chapter}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span>{contribution.upvotes} upvotes</span>
                          </div>
                          <span>{contribution.completedAt}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={contribution.status === "completed" ? "bg-green-600" : "bg-yellow-600"}>
                      {contribution.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recognition Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recognition & Achievements</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Top Contributor</h4>
                      <p className="text-sm text-gray-400">Earned for exceptional work on Dragon's Legacy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Team Player</h4>
                      <p className="text-sm text-gray-400">Successfully collaborated on 5+ projects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
