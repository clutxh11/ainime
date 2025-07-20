"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, LogOut, Trophy, Play, BookOpen, Users, Star } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
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
  },
  {
    id: "2",
    title: "Cyber Samurai",
    type: "manga",
    role: "Lead Animator",
    status: "in-progress",
    upvotes: 89,
    completedAt: "Active",
  },
  {
    id: "3",
    title: "Magical Academy Chronicles",
    type: "animation",
    role: "Clean-up Artist",
    status: "completed",
    upvotes: 156,
    completedAt: "1 month ago",
  },
]

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Profile</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contributions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger value="contributions" className="data-[state=active]:bg-red-600">
              My Contributions
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-red-600">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contributions" className="mt-6">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">12</div>
                  <div className="text-sm text-gray-400">Projects Completed</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4 text-center">
                  <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">1,247</div>
                  <div className="text-sm text-gray-400">Total Upvotes</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">5</div>
                  <div className="text-sm text-gray-400">Teams Joined</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Recent Work</h3>
              {mockContributions.map((contribution) => (
                <Card key={contribution.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                          {contribution.type === "animation" ? (
                            <Play className="w-6 h-6 text-white" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{contribution.title}</h4>
                          <p className="text-sm text-gray-400">Role: {contribution.role}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-300">{contribution.upvotes} upvotes</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={contribution.status === "completed" ? "bg-green-600" : "bg-yellow-600"}>
                          {contribution.status === "completed" ? "Completed" : "In Progress"}
                        </Badge>
                        <p className="text-sm text-gray-400 mt-1">{contribution.completedAt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Display Name</label>
                    <input
                      type="text"
                      defaultValue="AnimatorPro"
                      className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Email</label>
                    <input
                      type="email"
                      defaultValue="user@example.com"
                      className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Bio</label>
                    <textarea
                      defaultValue="Passionate animator and manga enthusiast"
                      className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white h-20"
                    />
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700">Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
