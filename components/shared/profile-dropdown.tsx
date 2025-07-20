"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, Settings, Trophy, LogOut } from "lucide-react"

interface ProfileDropdownProps {
  onSettingsClick: () => void
  onContributionsClick: () => void
  onLogoutClick?: () => void
}

export function ProfileDropdown({ onSettingsClick, onContributionsClick, onLogoutClick }: ProfileDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-700 border-gray-600" align="end">
        <DropdownMenuItem onClick={onSettingsClick} className="text-white hover:bg-gray-600 cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onContributionsClick} className="text-white hover:bg-gray-600 cursor-pointer">
          <Trophy className="w-4 h-4 mr-2" />
          My Contributions
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogoutClick} className="text-white hover:bg-gray-600 cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
