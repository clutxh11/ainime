"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Settings, Trophy, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface ProfileDropdownProps {
  onSettingsClick: () => void;
  onContributionsClick: () => void;
  onSignInClick: () => void;
}

export function ProfileDropdown({
  onSettingsClick,
  onContributionsClick,
  onSignInClick,
}: ProfileDropdownProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split("@")[0] || "User";
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={onSignInClick}
        className="text-white border-gray-600 hover:bg-gray-700"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage
            src={user.user_metadata?.avatar_url || "/placeholder-user.jpg"}
          />
          <AvatarFallback className="bg-gray-700 text-white">
            {getUserInitials(user.email || "")}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-800 border-gray-600">
        <DropdownMenuLabel className="text-white">
          {getDisplayName()}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuItem
          onClick={onSettingsClick}
          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onContributionsClick}
          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
        >
          <Trophy className="w-4 h-4 mr-2" />
          My Contributions
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
