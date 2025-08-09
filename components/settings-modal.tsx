"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Bell, Eye, Palette } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    newEpisodes: true,
    teamInvitations: true,
    projectDeadlines: true
  })
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showContributions: true
  })

  // Load user data when modal opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.user_metadata?.full_name || "")
      setBio(user.user_metadata?.bio || "")
    }
  }, [open, user])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          bio: bio
        }
      })

      if (error) {
        toast.error("Failed to update profile")
        console.error("Error updating profile:", error)
      } else {
        toast.success("Profile updated successfully")
        onOpenChange(false)
      }
    } catch (error) {
      toast.error("Failed to update profile")
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage your profile and preferences
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Profile Settings */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Display Name</label>
                  <Input 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="bg-gray-600 border-gray-500 text-white" 
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email</label>
                  <Input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-500 border-gray-400 text-gray-300 cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed after account creation</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-gray-600 border-gray-500 text-white h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">New Episode Releases</p>
                    <p className="text-sm text-gray-400">Get notified when new episodes are available</p>
                  </div>
                  <Switch 
                    checked={notifications.newEpisodes}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newEpisodes: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Team Invitations</p>
                    <p className="text-sm text-gray-400">Receive notifications for team join requests</p>
                  </div>
                  <Switch 
                    checked={notifications.teamInvitations}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, teamInvitations: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Project Deadlines</p>
                    <p className="text-sm text-gray-400">Reminders for upcoming deadlines</p>
                  </div>
                  <Switch 
                    checked={notifications.projectDeadlines}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, projectDeadlines: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Public Profile</p>
                    <p className="text-sm text-gray-400">Make your profile visible to other users</p>
                  </div>
                  <Switch 
                    checked={privacy.publicProfile}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, publicProfile: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Show Contributions</p>
                    <p className="text-sm text-gray-400">Display your work history publicly</p>
                  </div>
                  <Switch 
                    checked={privacy.showContributions}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showContributions: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Theme</label>
                  <select className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white">
                    <option value="dark">Dark (Default)</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Language</label>
                  <select className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white">
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="bg-transparent border-gray-600 text-white"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
