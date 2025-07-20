"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Crown, UserPlus, ThumbsUp, Eye } from "lucide-react"
import { getTeamsForProject } from "@/lib/team-data"

interface ViewTeamsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
}

export function ViewTeamsModal({ isOpen, onClose, projectId, projectTitle }: ViewTeamsModalProps) {
  const teams = getTeamsForProject(projectId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {projectTitle} - All Teams ({teams.length})
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {teams.map((team) => (
              <Card key={team.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">{team.name}</h3>
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

                  <p className="text-gray-300 mb-4">{team.description}</p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{team.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-300">Lead: {team.leadName}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Key Members:</p>
                    <div className="flex flex-wrap gap-2">
                      {team.members.slice(0, 3).map((member, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-600 px-2 py-1 rounded">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white">{member.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <span className="text-sm text-gray-400">+{team.members.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Request to Join Team
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
