"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileModal } from "@/components/profile-modal";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Filter,
  ThumbsUp,
  CalendarIcon,
  Upload,
  Play,
  Eye,
  Search,
  Plus,
  Home,
  BookOpen,
  Settings,
  Heart,
  BookOpen as BookIcon,
  Bell,
  BarChart3,
  Star,
  Edit,
  ImageIcon,
  Crown,
  Award,
  Clock,
  Menu,
  UserPlus,
  UserMinus,
  Trash2,
  Check,
  X,
  Loader2,
  MoreHorizontal,
  Mail,
  MessageCircle,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { ViewTeamsModal } from "@/components/view-teams-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ProjectSetup } from "@/components/features/creator/ProjectSetup";
import { ManageSeries } from "@/components/features/creator/ManageSeries";
import { ForumSection } from "@/components/features/forum/ForumSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface CreatorHubProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  genres?: string[]; // Added for multiple genres
  series_type?: string; // Added for manga/manhwa/manhua
  tags?: string[]; // Added for tags
  status: string;
  views: number;
  progress: number;
  image_url?: string;
  square_thumbnail_url?: string; // Added for square thumbnail
  creator_id: string;
  creator_display_name?: string; // Added for creator name
  created_at: string;
  updated_at: string;
  users?: {
    username: string;
    avatar_url?: string;
  };
  teams?: any[];
}

interface Team {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  leader_id: string;
  upvotes: number;
  views: number;
  created_at: string;
  updated_at: string;
  leader_display_name?: string;
  members?: Array<{
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    user_display_name?: string;
  }>;
  users?: {
    username: string;
    avatar_url?: string;
  };
  team_members?: any[];
  project_name?: string; // Added for project name
  last_activity?: string; // Added for last activity
  completed_chapters?: number; // Added for completed chapters
  square_thumbnail_url?: string; // Added for project thumbnail
}

export function CreatorHub({ onViewChange }: CreatorHubProps) {
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isContributionsModalOpen, setIsContributionsModalOpen] =
    useState(false);
  const [isViewTeamsModalOpen, setIsViewTeamsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] =
    useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isInviteTabOpen, setIsInviteTabOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("Member");

  // Data states
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Fetch data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        setError("User not authenticated");
        return;
      }
      setUser(currentUser);

      // Fetch invitations after user is set
      await fetchInvitations();

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(
          `
          *,
          volumes(*)
        `
        )
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch creator profiles separately
      const creatorIds =
        projectsData?.map((p) => p.creator_id).filter(Boolean) || [];
      let creatorProfiles: Record<string, string> = {};

      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("user_profiles_public")
          .select("id, display_name")
          .in("id", creatorIds);

        if (profilesData) {
          creatorProfiles = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile.display_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Transform the data to include creator_display_name
      const transformedProjects =
        projectsData?.map((project) => ({
          ...project,
          creator_display_name:
            creatorProfiles[project.creator_id] || "Unknown Creator",
        })) || [];

      setProjects(transformedProjects);

      // Fetch user's teams (where user is leader or member)
      // First, get teams where user is the leader
      const { data: leaderTeams, error: leaderError } = await supabase
        .from("animation_teams")
        .select(
          `
          *,
          animation_team_members(
            id,
            user_id,
            role,
            joined_at
          ),
          projects!inner(
            id,
            title,
            square_thumbnail_url
          )
        `
        )
        .eq("leader_id", currentUser.id)
        .eq("status", "Active");

      // Then, get teams where user is a member
      const { data: memberTeams, error: memberError } = await supabase
        .from("animation_teams")
        .select(
          `
          *,
          animation_team_members(
            id,
            user_id,
            role,
            joined_at
          ),
          projects!inner(
            id,
            title,
            square_thumbnail_url
          )
        `
        )
        .eq("status", "Active");

      if (leaderError || memberError) {
        setTeams([]);
      } else {
        // Filter member teams to only include those where user is a member
        const userMemberTeams =
          memberTeams?.filter((team) =>
            team.animation_team_members?.some(
              (member: any) => member.user_id === currentUser.id
            )
          ) || [];

        // Combine and deduplicate teams
        const allTeams = [...(leaderTeams || []), ...userMemberTeams];
        const uniqueTeams = allTeams.filter(
          (team, index, self) =>
            index === self.findIndex((t) => t.id === team.id)
        );

        // Fetch all user profiles for teams
        const allUserIds = new Set<string>();
        uniqueTeams.forEach((team: any) => {
          if (team.leader_id) allUserIds.add(team.leader_id);
          team.animation_team_members?.forEach((member: any) => {
            if (member.user_id) allUserIds.add(member.user_id);
          });
        });

        let userProfiles: Record<string, string> = {};
        if (allUserIds.size > 0) {
          const { data: profilesData } = await supabase
            .from("user_profiles_public")
            .select("id, display_name")
            .in("id", Array.from(allUserIds));

          if (profilesData) {
            userProfiles = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.display_name;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        // Transform team data
        const transformedTeams = uniqueTeams.map((team: any) => ({
          ...team,
          leader_display_name: userProfiles[team.leader_id] || "Unknown Leader",
          project_name: team.projects?.title || "Unknown Project",
          square_thumbnail_url: team.projects?.square_thumbnail_url,
          members:
            team.animation_team_members?.map((member: any) => ({
              ...member,
              user_display_name: userProfiles[member.user_id] || "Unknown User",
            })) || [],
        }));

        setTeams(transformedTeams);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invitations when user changes
  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const handleOpenEditor = () => {
    onViewChange("animation-editor");
  };

  // Scene creation settings
  const [sceneName, setSceneName] = useState("New Scene");
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");

  // New team creation states
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Handler functions for team actions
  const handleViewProject = (team: Team) => {
    // Navigate to project details page
    onViewChange("project-detail", { id: team.project_id });
  };

  const handleTeamChat = (team: Team) => {};

  const handleCreateTeam = async () => {
    if (!user || !newTeamName || !selectedProjectId) return;

    try {
      const { data, error } = await supabase
        .from("animation_teams")
        .insert({
          name: newTeamName,
          description: newTeamDescription,
          project_id: selectedProjectId,
          leader_id: user.id,
          status: "Active",
        })
        .select()
        .single();

      if (error) throw error;

      // Add the leader as a team member
      await supabase.from("animation_team_members").insert({
        team_id: data.id,
        user_id: user.id,
        role: "Team Lead",
      });

      // Reset form
      setNewTeamName("");
      setNewTeamDescription("");
      setSelectedProjectId("");

      // Refresh teams data
      fetchData();

      toast.success("Team created successfully!");
    } catch (error) {
      toast.error("Failed to create team");
    }
  };

  const handleViewTeamsClick = (projectId: string, projectTitle: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectTitle(projectTitle);
    setIsViewTeamsModalOpen(true);
  };

  const handleTeamClick = (team: Team) => {
    // TODO: Implement team detail view
  };

  const handleTeamManagement = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamManagementModalOpen(true);
  };

  const handleInviteMember = () => {
    setIsInviteTabOpen(true);
  };

  const searchUsers = async (username: string) => {
    if (!username || username.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search in both display_name and email
      const { data: users, error } = await supabase
        .from("user_profiles_public")
        .select("id, display_name, bio, email")
        .or(`display_name.ilike.${username}%,email.ilike.${username}%`)
        .limit(8);

      if (error) throw error;

      // For now, show all users (we'll add proper filtering later)
      const filteredUsers = users || [];
      setSearchResults(filteredUsers);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (selectedUser: any) => {
    setInviteUsername(selectedUser.display_name);
    setSelectedUser(selectedUser);
    setSearchResults([]);
  };

  const sendInvitation = async () => {
    if (!selectedTeam || !selectedUser || !inviteRole) return;

    try {
      // Check if user is already a member (make this optional to avoid 406 errors)
      try {
        const { data: existingMember } = await supabase
          .from("animation_team_members")
          .select("id")
          .eq("team_id", selectedTeam.id)
          .eq("user_id", selectedUser.id)
          .single();

        if (existingMember) {
          toast.error("User is already a member of this team.");
          return;
        }
      } catch (memberError) {
        // Continue with invitation even if member check fails
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from("team_invitations")
        .select("id")
        .eq("team_id", selectedTeam.id)
        .eq("invited_user_id", selectedUser.id)
        .eq("status", "pending")
        .single();

      if (existingInvitation) {
        toast.error("Invitation already sent to this user.");
        return;
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from("team_invitations")
        .insert({
          team_id: selectedTeam.id,
          invited_user_id: selectedUser.id,
          invited_by_user_id: user?.id,
          role: inviteRole,
          status: "pending",
          message: `You've been invited to join ${
            selectedTeam.name
          } as a ${inviteRole.toLowerCase()}.`,
        });

      if (inviteError) throw inviteError;

      // Reset form and close modal
      setInviteUsername("");
      setInviteRole("Member");
      setSelectedUser(null);
      setSearchResults([]);
      setIsInviteTabOpen(false);

      toast.success("Invitation sent successfully!");
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      // First, get basic invitation data
      const { data: invitationsData, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // If we have invitations, get additional data for each one
      if (invitationsData && invitationsData.length > 0) {
        const enrichedInvitations = await Promise.all(
          invitationsData.map(async (invitation) => {
            try {
              // Get team info
              const { data: teamData } = await supabase
                .from("animation_teams")
                .select("id, name, description, project_id")
                .eq("id", invitation.team_id)
                .single();

              // Get project info
              const { data: projectData } = await supabase
                .from("projects")
                .select("id, title, square_thumbnail_url")
                .eq("id", teamData?.project_id)
                .single();

              // Get inviter info
              const { data: inviterData } = await supabase
                .from("user_profiles_public")
                .select("id, display_name")
                .eq("id", invitation.invited_by_user_id)
                .single();

              return {
                ...invitation,
                animation_teams: teamData,
                projects: projectData,
                user_profiles_public: inviterData,
              };
            } catch (err) {
              return invitation;
            }
          })
        );
        setInvitations(enrichedInvitations);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      setInvitations([]);
    }
  };

  const handleInvitationResponse = async (
    invitationId: string,
    accept: boolean
  ) => {
    try {
      if (accept) {
        // Get invitation details
        const { data: invitation, error: fetchError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("id", invitationId)
          .single();

        if (fetchError) throw fetchError;

        // Add user to team
        const { error: memberError } = await supabase
          .from("animation_team_members")
          .insert({
            team_id: invitation.team_id,
            user_id: user?.id,
            role: invitation.role,
          });

        if (memberError) throw memberError;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Refresh data
      fetchInvitations();
      fetchData();

      toast.success(accept ? "You've joined the team!" : "Invitation declined");
    } catch (error) {
      toast.error("Failed to process invitation");
    }
  };

  const handleRemoveMember = async (
    memberUserId: string,
    memberDisplayName: string
  ) => {
    if (!selectedTeam) return;

    try {
      // Remove user from team members
      const { error: memberError } = await supabase
        .from("animation_team_members")
        .delete()
        .eq("team_id", selectedTeam.id)
        .eq("user_id", memberUserId);

      if (memberError) throw memberError;

      // Remove any pending invitations for this user
      const { error: invitationError } = await supabase
        .from("team_invitations")
        .delete()
        .eq("team_id", selectedTeam.id)
        .eq("invited_user_id", memberUserId)
        .eq("status", "pending");

      if (invitationError) {
        // Continue even if invitation removal fails
      }

      // Refresh team data
      fetchData();

      toast.success(`${memberDisplayName} has been removed from the team`);
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleUpdateMemberRole = async (
    memberUserId: string,
    newRole: string,
    memberDisplayName: string
  ) => {
    if (!selectedTeam) return;

    try {
      // Update member role
      const { error: updateError } = await supabase
        .from("animation_team_members")
        .update({ role: newRole })
        .eq("team_id", selectedTeam.id)
        .eq("user_id", memberUserId);

      if (updateError) throw updateError;

      // Refresh team data
      fetchData();

      // Reset editing state
      setEditingMemberId(null);
      setEditingRole("Member");

      toast.success(
        `${memberDisplayName}'s role has been updated to ${newRole}`
      );
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const getTeamCountForProject = (projectId: string) => {
    return teams.filter((team) => team.project_id === projectId).length;
  };

  // Utility function to truncate synopsis
  const truncateSynopsis = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Explore Animation Projects
        </h1>
        <p className="text-gray-400">
          Discover manga series to animate and join creative teams
        </p>
      </div>

      {/* Your Active Projects */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Your Active Projects
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {projects.slice(0, 3).map((project) => (
            <Card
              key={project.id}
              className="min-w-[300px] bg-gray-800 border-gray-700"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                    <BookIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {project.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {project.creator_display_name || "Unknown Creator"}
                    </p>
                    <p className="text-sm text-red-400">{project.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filter & Sort Projects */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Filter & Sort Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Projects
            </label>
            <Input
              placeholder="Search by title, genre..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genre
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="">All Genres</option>
              <option value="action">Action</option>
              <option value="romance">Romance</option>
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Sci-Fi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="">All Status</option>
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading projects...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Error loading projects: {error}</p>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Project Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="grid grid-cols-[64px,1fr] gap-4 sm:grid-cols-[80px,1fr]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-600 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {project.square_thumbnail_url ? (
                        <img
                          src={project.square_thumbnail_url}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white mb-1 truncate">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {truncateSynopsis(project.description)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {/* Display multiple genres if available, otherwise fallback to single genre */}
                        {project.genres && project.genres.length > 0 ? (
                          project.genres
                            .slice(0, 2)
                            .map((genre: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs bg-gray-700 text-gray-300"
                              >
                                {genre}
                              </Badge>
                            ))
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-gray-700 text-gray-300"
                          >
                            {project.genre}
                          </Badge>
                        )}
                        {/* Display series type if available */}
                        {project.series_type && (
                          <Badge
                            variant="outline"
                            className="text-xs border-blue-500 text-blue-400"
                          >
                            {project.series_type}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            project.status === "Completed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-400">
                        <span className="whitespace-nowrap">
                          {project.views} views
                        </span>
                        <span className="truncate">
                          {project.creator_display_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                      onClick={() =>
                        handleViewTeamsClick(project.id, project.title)
                      }
                    >
                      <Users className="w-4 h-4 mr-1" />
                      View Teams
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() =>
                        onViewChange("project-detail", { id: project.id })
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <BookIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No projects found
            </h3>
            <p className="text-gray-400 mb-4">
              Get started by creating your first animation project
            </p>
            <Button
              onClick={handleOpenEditor}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMyTeams = () => {
    if (!user) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Teams</h1>
          <p className="text-gray-400">
            Manage your animation teams and collaborations
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="active-teams" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger
              value="active-teams"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Active Teams ({teams.length})
            </TabsTrigger>
            <TabsTrigger
              value="invitations"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Invitations ({invitations.length})
            </TabsTrigger>
            <TabsTrigger
              value="create-team"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Create New Team
            </TabsTrigger>
          </TabsList>

          {/* Active Teams Tab */}
          <TabsContent value="active-teams" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {teams.length}
                    </p>
                    <p className="text-sm text-gray-400">Active Teams</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {
                        teams.filter((team) => team.leader_id === user.id)
                          .length
                      }
                    </p>
                    <p className="text-sm text-gray-400">Teams Leading</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {teams.reduce(
                        (total, team) => total + (team.upvotes || 0),
                        0
                      )}
                    </p>
                    <p className="text-sm text-gray-400">Total Upvotes</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {teams.reduce(
                        (total, team) => total + (team.completed_chapters || 0),
                        0
                      )}
                    </p>
                    <p className="text-sm text-gray-400">Chapters Completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-700 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {team.square_thumbnail_url ? (
                          <img
                            src={team.square_thumbnail_url}
                            alt={team.project_name || "Project"}
                            className="w-15 h-20 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-15 h-20 bg-gray-700 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-400 text-center px-1">
                              {team.project_name || "Project"}
                            </span>
                          </div>
                        )}
                        {team.leader_id === user.id && (
                          <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500 bg-gray-800 rounded-full p-1" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {team.project_name || "Animation Project"}
                        </p>
                        <Badge
                          className={`mt-1 ${
                            team.leader_id === user.id
                              ? "bg-red-600"
                              : "bg-gray-600"
                          }`}
                        >
                          {team.leader_id === user.id ? "Team Lead" : "Member"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTeamManagement(team)}
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {team.description || "No description available"}
                  </p>

                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="font-bold text-white">
                        {team.members?.length || 0}
                      </div>
                      <div className="text-gray-400">Members</div>
                    </div>
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="font-bold text-white">
                        {team.upvotes || 0}
                      </div>
                      <div className="text-gray-400">Upvotes</div>
                    </div>
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="font-bold text-white">
                        {team.completed_chapters || 0}
                      </div>
                      <div className="text-gray-400">Completed</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">
                        Recent Activity
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {team.last_activity || "No recent activity"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last active:{" "}
                      {team.updated_at
                        ? new Date(team.updated_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-600 text-gray-200 hover:bg-gray-700"
                    onClick={() => handleViewProject(team)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    View Project
                  </Button>
                </div>
              ))}
            </div>

            {teams.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Teams Yet
                </h3>
                <p className="text-gray-400 mb-4">
                  You haven't joined any animation teams yet. Start by creating
                  a new team or joining an existing one.
                </p>
                <Button
                  onClick={() => setActiveView("create-team")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Team
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            {invitations.length > 0 ? (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {invitation.projects?.square_thumbnail_url ? (
                          <img
                            src={invitation.projects.square_thumbnail_url}
                            alt={invitation.projects.title}
                            className="w-15 h-20 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-15 h-20 bg-gray-700 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-400 text-center px-1">
                              {invitation.projects?.title || "Project"}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {invitation.animation_teams?.name || "Team"}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {invitation.projects?.title || "Project"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600">
                              {invitation.role}
                            </Badge>
                            <span className="text-sm text-gray-400">
                              Invited by{" "}
                              {invitation.user_profiles_public?.display_name ||
                                "Unknown"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            {invitation.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            Invited on{" "}
                            {new Date(
                              invitation.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handleInvitationResponse(invitation.id, true)
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-200 hover:bg-gray-700"
                          onClick={() =>
                            handleInvitationResponse(invitation.id, false)
                          }
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Invitations
                </h3>
                <p className="text-gray-400">
                  You don't have any team invitations at the moment.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Create Team Tab */}
          <TabsContent value="create-team" className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Create New Animation Team
                </h2>
              </div>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="manga-select" className="text-white">
                    Select Manga to Animate
                  </Label>
                  <Select
                    onValueChange={(value) => setSelectedProjectId(value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Choose a manga series" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {projects.map((project) => (
                        <SelectItem
                          key={project.id}
                          value={project.id}
                          className="text-white hover:bg-gray-700"
                        >
                          {project.title} by {project.creator_display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="team-name" className="text-white">
                    Team Name
                  </Label>
                  <Input
                    id="team-name"
                    placeholder="Enter your team name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">
                    Team Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your team's animation style and goals"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleCreateTeam}
                    disabled={!newTeamName || !selectedProjectId}
                  >
                    Create Team
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                    onClick={() => {
                      setNewTeamName("");
                      setNewTeamDescription("");
                      setSelectedProjectId("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Button
                variant="ghost"
                onClick={() => onViewChange("viewer")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="text-2xl font-bold text-red-500">
                Creator Portal
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-white hover:text-red-400"
                onClick={() => onViewChange("calendar")}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </Button>
              <ProfileDropdown
                onSettingsClick={() => setIsSettingsModalOpen(true)}
                onContributionsClick={() => setIsContributionsModalOpen(true)}
                onSignInClick={() => {}}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-6">
          <div className="space-y-8">
            {/* Navigation Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "dashboard"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView("teams")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "teams"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  My Teams
                </button>
                <button
                  onClick={() => setActiveView("series")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "series"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  Manage Series
                </button>
                <button
                  onClick={() => setActiveView("forum")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "forum"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  Forum
                </button>
              </nav>
            </div>

            {/* Create Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Create
              </h3>
              <nav className="space-y-2">
                <button
                  onClick={handleOpenEditor}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Plus className="w-5 h-5" />
                  Create Animation
                </button>
              </nav>
            </div>

            {/* Settings */}
            <div className="pt-8 border-t border-gray-700">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "teams" && renderMyTeams()}
          {activeView === "series" && (
            <ManageSeries onViewChange={onViewChange} />
          )}
          {activeView === "forum" && <ForumSection />}
          {activeView === "create-animation" && (
            <ProjectSetup onViewChange={onViewChange} />
          )}
        </div>
      </div>

      {/* Modals */}
      <ViewTeamsModal
        isOpen={isViewTeamsModalOpen}
        onClose={() => setIsViewTeamsModalOpen(false)}
        projectId={selectedProjectId}
        projectTitle={selectedProjectTitle}
      />
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
      <ContributionsModal
        open={isContributionsModalOpen}
        onOpenChange={setIsContributionsModalOpen}
      />

      {/* Team Management Modal */}
      <Dialog
        open={isTeamManagementModalOpen}
        onOpenChange={setIsTeamManagementModalOpen}
      >
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedTeam?.name} - Team Management
            </DialogTitle>
            <DialogDescription>
              Manage your team's members, progress, and settings.
            </DialogDescription>
          </DialogHeader>

          {/* Invitation Sliding Tab */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              isInviteTabOpen
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Invite Member to Team
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    setIsInviteTabOpen(false);
                    setInviteUsername("");
                    setInviteRole("Member");
                    setSelectedUser(null);
                    setSearchResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="invite-username" className="text-white">
                    Search User
                  </Label>
                  <Input
                    id="invite-username"
                    placeholder={
                      selectedUser ? "User selected" : "Type to search users..."
                    }
                    value={
                      selectedUser ? selectedUser.display_name : inviteUsername
                    }
                    onChange={(e) => {
                      if (!selectedUser) {
                        setInviteUsername(e.target.value);
                        searchUsers(e.target.value);
                      }
                    }}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    readOnly={!!selectedUser}
                  />

                  {selectedUser && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-6 h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => {
                        setSelectedUser(null);
                        setInviteUsername("");
                        setSearchResults([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && !selectedUser && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0"
                          onClick={() => selectUser(user)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                              {user.display_name?.charAt(0) ||
                                user.email?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium">
                              {user.display_name || user.email}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {user.bio || user.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSearching && (
                    <div className="absolute right-3 top-8">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="invite-role" className="text-white">
                    Role
                  </Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem
                        value="Member"
                        className="text-white hover:bg-gray-700"
                      >
                        Member
                      </SelectItem>
                      <SelectItem
                        value="Animator"
                        className="text-white hover:bg-gray-700"
                      >
                        Animator
                      </SelectItem>
                      <SelectItem
                        value="In-betweener"
                        className="text-white hover:bg-gray-700"
                      >
                        In-betweener
                      </SelectItem>
                      <SelectItem
                        value="Clean-up Artist"
                        className="text-white hover:bg-gray-700"
                      >
                        Clean-up Artist
                      </SelectItem>
                      <SelectItem
                        value="Storyboard Artist"
                        className="text-white hover:bg-gray-700"
                      >
                        Storyboard Artist
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={sendInvitation}
                    disabled={!selectedUser || !inviteRole}
                  >
                    Send Invitation
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                    onClick={() => {
                      setIsInviteTabOpen(false);
                      setInviteUsername("");
                      setInviteRole("Member");
                      setSelectedUser(null);
                      setSearchResults([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300"
                >
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="progress"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300"
                >
                  Progress
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Information Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 text-white">
                        Team Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Team Name:</span>
                          <span className="text-white">
                            {selectedTeam?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Manga:</span>
                          <span className="text-white">
                            {selectedTeam?.project_name || "Unknown Project"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your Role:</span>
                          <Badge
                            className={
                              selectedTeam?.leader_id === user?.id
                                ? "bg-red-600"
                                : "bg-gray-600"
                            }
                          >
                            {selectedTeam?.leader_id === user?.id
                              ? "Team Lead"
                              : "Member"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Joined:</span>
                          <span className="text-white">
                            {selectedTeam?.created_at
                              ? new Date(
                                  selectedTeam.created_at
                                ).toLocaleDateString()
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2 text-white">
                        Team Description
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedTeam?.description ||
                          "No description available"}
                      </p>
                    </div>
                  </div>

                  {/* Team Statistics Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 text-white">
                        Team Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-xl font-bold text-white">
                            {selectedTeam?.upvotes || 0}
                          </div>
                          <div className="text-sm text-gray-400">
                            Total Upvotes
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-xl font-bold text-white">
                            {selectedTeam?.views || 0}
                          </div>
                          <div className="text-sm text-gray-400">
                            Total Views
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-xl font-bold text-white">
                            {selectedTeam?.completed_chapters || 0}
                          </div>
                          <div className="text-sm text-gray-400">Completed</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-xl font-bold text-white">
                            {selectedTeam?.members?.length || 0}
                          </div>
                          <div className="text-sm text-gray-400">Members</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    Team Members ({selectedTeam?.members?.length || 0})
                  </h3>
                  {selectedTeam?.leader_id === user?.id && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleInviteMember}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedTeam?.members?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gray-700 text-white">
                            {member.user_display_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">
                              {member.user_display_name || "Unknown User"}
                            </p>
                            {member.user_id === selectedTeam.leader_id && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{member.role}</p>
                        </div>
                      </div>
                      {selectedTeam?.leader_id === user?.id &&
                        member.user_id !== selectedTeam.leader_id && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-200 hover:bg-gray-700"
                              onClick={() => {
                                setEditingMemberId(member.user_id);
                                setEditingRole(member.role);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-200 hover:bg-gray-700"
                              onClick={() =>
                                handleRemoveMember(
                                  member.user_id,
                                  member.user_display_name || "Unknown User"
                                )
                              }
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Role Editing Modal */}
                {editingMemberId && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Update Member Role
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="role-select" className="text-white">
                            Role
                          </Label>
                          <Select
                            value={editingRole}
                            onValueChange={setEditingRole}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              <SelectItem
                                value="Member"
                                className="text-white hover:bg-gray-700"
                              >
                                Member
                              </SelectItem>
                              <SelectItem
                                value="Animator"
                                className="text-white hover:bg-gray-700"
                              >
                                Animator
                              </SelectItem>
                              <SelectItem
                                value="In-betweener"
                                className="text-white hover:bg-gray-700"
                              >
                                In-betweener
                              </SelectItem>
                              <SelectItem
                                value="Clean-up Artist"
                                className="text-white hover:bg-gray-700"
                              >
                                Clean-up Artist
                              </SelectItem>
                              <SelectItem
                                value="Storyboard Artist"
                                className="text-white hover:bg-gray-700"
                              >
                                Storyboard Artist
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              const member = selectedTeam?.members?.find(
                                (m) => m.user_id === editingMemberId
                              );
                              if (member) {
                                handleUpdateMemberRole(
                                  editingMemberId,
                                  editingRole,
                                  member.user_display_name || "Unknown User"
                                );
                              }
                            }}
                          >
                            Update Role
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                            onClick={() => {
                              setEditingMemberId(null);
                              setEditingRole("Member");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4">
                <h3 className="font-semibold text-white">Chapter Progress</h3>
                <div className="space-y-3">
                  {/* Sample progress data - in real implementation, this would come from database */}
                  <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        Chapter 1: The Beginning
                      </h4>
                      <Badge className="bg-gray-600">published</Badge>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Contributors:{" "}
                      {selectedTeam?.members
                        ?.map((m) => m.user_display_name)
                        .join(", ") || "No contributors"}
                    </div>
                  </div>

                  <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        Chapter 2: The Journey
                      </h4>
                      <Badge className="bg-gray-600">in progress</Badge>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Contributors:{" "}
                      {selectedTeam?.members
                        ?.slice(0, 2)
                        .map((m) => m.user_display_name)
                        .join(", ") || "No contributors"}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                {selectedTeam?.leader_id === user?.id ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-white">
                        Team Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label
                            htmlFor="team-name-edit"
                            className="text-white"
                          >
                            Team Name
                          </Label>
                          <Input
                            id="team-name-edit"
                            defaultValue={selectedTeam?.name}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="team-description-edit"
                            className="text-white"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="team-description-edit"
                            defaultValue={selectedTeam?.description || ""}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <Button className="bg-red-600 hover:bg-red-700">
                          Save Changes
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div className="border-t border-gray-700 pt-6">
                      <h3 className="font-semibold mb-4 text-red-400">
                        Danger Zone
                      </h3>
                      <div className="space-y-2">
                        <Button
                          variant="destructive"
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Team
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-semibold mb-2 text-white">
                      Team Settings
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Only team leaders can modify team settings.
                    </p>
                    <Button
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Leave Team
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
