"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Heart,
  Eye,
  BookOpen,
  Play,
  Crown,
  Volume2,
  Plus,
  Send,
  Hash,
  User,
  Loader2,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ProjectDetailProps {
  onViewChange: (view: CurrentView, params?: any) => void;
  projectId?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isLead?: boolean;
}

interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  status: "published" | "in-betweening" | "storyboard" | "not-started";
  contributors: string[];
  teamStatus?: string;
  release_date?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  upvotes: number;
  views: number;
  completedChapters: number;
  lead: TeamMember;
}

interface StreamMessage {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_display_name?: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_display_name?: string;
  receiver_display_name?: string;
}

interface TeamStream {
  id: string;
  team_id: string;
  name: string;
  type: string;
  created_by_user_id: string;
  created_at: string;
}

interface AnimationTeam {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  upvotes: number;
  views: number;
  status: string;
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
}

interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  genres?: string[];
  series_type?: string;
  tags?: string[];
  status: string;
  views: number;
  progress: number;
  image_url?: string;
  square_thumbnail_url?: string;
  horizontal_thumbnail_url?: string;
  creator_id: string;
  creator_display_name?: string;
  created_at: string;
  updated_at: string;
  volumes?: Array<{
    id: string;
    volume_number: number;
    title: string;
    description?: string;
    chapters: Array<{
      id: string;
      title: string;
      status: string;
      release_date?: string;
    }>;
  }>;
}

// removed legacy mock data

export function ProjectDetail({ onViewChange, projectId }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState("your-team");
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<AnimationTeam | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<AnimationTeam | null>(null);
  const [otherTeams, setOtherTeams] = useState<AnimationTeam[]>([]);
  const [isInTeam, setIsInTeam] = useState(false);
  const [isStartTeamModalOpen, setIsStartTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  // Stream management
  const [textStreams, setTextStreams] = useState<TeamStream[]>([]);
  const [isAddingStream, setIsAddingStream] = useState(false);
  const [newStreamName, setNewStreamName] = useState("");
  const [streamType, setStreamType] = useState<"text">("text");

  // Messaging state
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [unreadStreams, setUnreadStreams] = useState<Record<string, number>>(
    {}
  );
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const [chapterAggregates, setChapterAggregates] = useState<
    Record<string, { highestStatus: string; contributors: string[] }>
  >({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const scrollMessagesToBottom = (smooth: boolean = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  // Direct message state
  const [activeDirectMessage, setActiveDirectMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Load current user id for filters and message sending
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();

    const fetchProject = async () => {
      if (!projectId) {
        setError("Project ID not provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(
            `
            *,
            volumes(
              id,
              volume_number,
              title,
              description,
              chapters(
                id,
                title,
                status,
                release_date
              )
            )
          `
          )
          .eq("id", projectId)
          .single();

        if (projectError && projectError.code !== "PGRST116") {
          throw new Error("Project not found.");
        }

        if (projectData) {
          // Fetch creator profile separately
          let creatorDisplayName = "Unknown Creator";
          if (projectData.creator_id) {
            const { data: creatorData } = await supabase
              .from("user_profiles_public")
              .select("display_name")
              .eq("id", projectData.creator_id)
              .single();

            if (creatorData) {
              creatorDisplayName = creatorData.display_name;
            }
          }

          // Transform the data to include creator_display_name
          const transformedProject = {
            ...projectData,
            creator_display_name: creatorDisplayName,
          };

          setProject(transformedProject);

          // Fetch teams for this project
          const { data: teamsData, error: teamsError } = await supabase
            .from("animation_teams")
            .select(
              `
              *,
              animation_team_members(
                id,
                user_id,
                role,
                joined_at
              )
            `
            )
            .eq("project_id", projectId)
            .eq("status", "Active");

          if (teamsError) {
            console.error("Error fetching teams:", teamsError);
          } else {
            // Fetch all user profiles for teams
            const allUserIds = new Set<string>();
            teamsData?.forEach((team: any) => {
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
            const transformedTeams =
              teamsData?.map((team: any) => ({
                ...team,
                leader_display_name:
                  userProfiles[team.leader_id] || "Unknown Leader",
                members:
                  team.animation_team_members?.map((member: any) => ({
                    ...member,
                    user_display_name:
                      userProfiles[member.user_id] || "Unknown User",
                  })) || [],
              })) || [];

            // Determine user's team and exclude it from otherTeams
            let currentUsersTeam: AnimationTeam | null = null;
            const getUserRes1 = await supabase.auth.getUser();
            const currentUser1 = getUserRes1.data.user;
            if (currentUser1) {
              currentUsersTeam =
                transformedTeams.find((team: any) =>
                  team.members.some(
                    (member: any) => member.user_id === currentUser1.id
                  )
                ) || null;
            }

            const othersExcludingMine = transformedTeams.filter(
              (team) => team.id !== currentUsersTeam?.id
            );

            setOtherTeams(othersExcludingMine);

            // Compute chapter aggregates: highest status across teams and contributor team names
            const chapterIds = (transformedProject.volumes || [])
              .flatMap((v: any) => v.chapters || [])
              .map((c: any) => c.id);

            if (chapterIds.length > 0) {
              const { data: animatedData } = await supabase
                .from("animated_chapters")
                .select("chapter_id, team_id, status")
                .in("chapter_id", chapterIds);

              // Map team_id -> team name
              const teamIdToName: Record<string, string> = {};
              for (const t of transformedTeams)
                teamIdToName[t.id] = t.name as any;

              const statusRank: Record<string, number> = {
                draft: 0,
                "not-started": 0,
                "in progress": 1,
                "in-betweening": 2,
                storyboard: 3,
                finalized: 4,
                published: 5,
              };

              const aggregates: Record<
                string,
                { highestStatus: string; contributors: Set<string> }
              > = {};
              for (const row of animatedData || []) {
                const chId = row.chapter_id as string;
                const teamName = teamIdToName[row.team_id] || "Team";
                const status = (row.status || "").toString();
                if (!aggregates[chId]) {
                  aggregates[chId] = {
                    highestStatus: status,
                    contributors: new Set<string>(),
                  };
                }
                aggregates[chId].contributors.add(teamName);
                const cur = aggregates[chId].highestStatus || "";
                const a = statusRank[cur.toLowerCase()] ?? -1;
                const b = statusRank[status.toLowerCase()] ?? -1;
                if (b > a) aggregates[chId].highestStatus = status;
              }

              const finalized: Record<
                string,
                { highestStatus: string; contributors: string[] }
              > = {};
              Object.entries(aggregates).forEach(([chId, data]) => {
                finalized[chId] = {
                  highestStatus: data.highestStatus,
                  contributors: Array.from(data.contributors),
                };
              });
              setChapterAggregates(finalized);
            }

            // Check if current user is in any team
            const getUserRes2 = await supabase.auth.getUser();
            const currentUser2 = getUserRes2.data.user;
            if (currentUser2) {
              const userTeam = transformedTeams.find((team: any) =>
                team.members.some(
                  (member: any) => member.user_id === currentUser2.id
                )
              );

              if (userTeam) {
                setUserTeam(userTeam);
                setIsInTeam(true);
                setSelectedTeam(userTeam);
                // Fetch streams for this team
                fetchStreams(userTeam.id);
              } else {
                setIsInTeam(false);
                setUserTeam(null);
              }
            }
          }
        } else {
          setError("Project not found.");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch messages when active channel changes
  useEffect(() => {
    if (activeChannel && activeChannel !== "dm") {
      fetchStreamMessages(activeChannel);
    }
  }, [activeChannel]);

  // Realtime subscription for stream messages
  useEffect(() => {
    if (!activeChannel || activeChannel === "dm") return;

    const channel = supabase
      .channel(`stream_messages_${activeChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_messages",
          filter: `stream_id=eq.${activeChannel}`,
        },
        () => {
          fetchStreamMessages(activeChannel);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [activeChannel]);

  // Fallback polling in case realtime is not available
  useEffect(() => {
    if (!activeChannel || activeChannel === "dm") return;
    const intervalId = setInterval(() => {
      fetchStreamMessages(activeChannel);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [activeChannel]);

  // Global realtime listener to track unread counts for streams
  useEffect(() => {
    if (textStreams.length === 0 || !currentUserId) return;
    const channel = supabase
      .channel("stream_messages_unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_messages" },
        (payload: any) => {
          const msg = payload?.new;
          if (!msg) return;
          const streamId: string | undefined = msg.stream_id;
          const authorId: string | undefined = msg.user_id;
          if (!streamId || authorId === currentUserId) return;
          if (streamId !== activeChannel) {
            setUnreadStreams((prev) => ({
              ...prev,
              [streamId]: (prev[streamId] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [textStreams, currentUserId, activeChannel]);

  // Realtime listener to track unread counts for direct messages
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("direct_messages_unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload: any) => {
          const dm = payload?.new;
          if (!dm) return;
          if (dm.receiver_id === currentUserId) {
            const otherId: string = dm.sender_id;
            if (activeDirectMessage !== otherId) {
              setUnreadDMs((prev) => ({
                ...prev,
                [otherId]: (prev[otherId] || 0) + 1,
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [currentUserId, activeDirectMessage]);

  // Clear unread count when opening a stream
  useEffect(() => {
    if (activeChannel && activeChannel !== "dm") {
      setUnreadStreams((prev) => ({ ...prev, [activeChannel]: 0 }));
    }
  }, [activeChannel]);

  // Clear unread count when opening a DM
  useEffect(() => {
    if (activeDirectMessage) {
      setUnreadDMs((prev) => ({ ...prev, [activeDirectMessage]: 0 }));
    }
  }, [activeDirectMessage]);

  // Fetch direct messages when active direct message changes
  useEffect(() => {
    if (activeDirectMessage) {
      fetchDirectMessages(activeDirectMessage);
    }
  }, [activeDirectMessage]);

  // Auto-scroll for stream messages
  useEffect(() => {
    if (!activeDirectMessage) {
      // on stream messages update, scroll to bottom smoothly
      scrollMessagesToBottom(true);
    }
  }, [streamMessages]);

  // Auto-scroll for direct messages
  useEffect(() => {
    if (activeDirectMessage) {
      scrollMessagesToBottom(true);
    }
  }, [directMessages]);

  const handleOpenEditor = (chapterId: string) => {
    onViewChange("animation-editor", {
      projectId,
      chapterId,
      projectTitle: project?.title || "Project",
    });
  };

  const handleOpenShotEditor = (
    chapterId: string,
    sequenceCode: string,
    shotCode: string
  ) => {
    const url = `/animation-workspace?projectId=${projectId}&chapterId=${chapterId}&sequence=${encodeURIComponent(
      sequenceCode
    )}&shot=${encodeURIComponent(shotCode)}`;
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };

  const getMockSequencesForChapter = (chapterId: string) => {
    return [
      {
        seq: "SEQ 010",
        shots: [
          { code: "010A", stage: "Storyboard", status: "todo" },
          { code: "010B", stage: "Layout", status: "in-progress" },
        ],
      },
      {
        seq: "SEQ 020",
        shots: [
          { code: "020A", stage: "Key", status: "review" },
          { code: "020B", stage: "Inbetween", status: "todo" },
        ],
      },
    ];
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In a real app, this would send the message to the backend
      setMessageInput("");
    }
  };

  // Fetch streams for the current team
  const fetchStreams = async (teamId: string) => {
    try {
      // removed debug log
      const { data: streamsData, error } = await supabase
        .from("team_streams")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      // removed debug logs

      if (error) {
        // silent fail
        return;
      }

      setTextStreams(streamsData || []);

      // Set active channel to general if it exists
      const generalStream = streamsData?.find((s) => s.name === "general");
      if (generalStream) {
        setActiveChannel(generalStream.id);
        // removed debug log
      } else {
        // no general stream
      }
    } catch (error) {
      // silent fail
    }
  };

  // Fetch messages for the current stream
  const fetchStreamMessages = async (streamId: string) => {
    if (!streamId) return;

    try {
      const { data: messagesData, error } = await supabase
        .from("stream_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Fetch user profiles separately since we don't have foreign key constraints
      if (messagesData && messagesData.length > 0) {
        const userIds = [...new Set(messagesData.map((msg) => msg.user_id))];
        const { data: userProfiles } = await supabase
          .from("user_profiles_public")
          .select("id, display_name")
          .in("id", userIds);

        const userProfileMap =
          userProfiles?.reduce((acc, profile) => {
            acc[profile.id] = profile.display_name;
            return acc;
          }, {} as Record<string, string>) || {};

        const enrichedMessages = messagesData.map((msg) => ({
          ...msg,
          user_display_name: userProfileMap[msg.user_id] || "Unknown User",
        }));

        setStreamMessages(enrichedMessages);
      } else {
        setStreamMessages([]);
      }
    } catch (error) {
      // silent fail
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Send a stream message
  const sendStreamMessage = async () => {
    if (!messageInput.trim() || !activeChannel || !userTeam) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to send messages");
        return;
      }

      const { error } = await supabase.from("stream_messages").insert({
        stream_id: activeChannel,
        user_id: user.id,
        content: messageInput.trim(),
      });

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }

      setMessageInput("");
      // Refresh messages
      fetchStreamMessages(activeChannel);
    } catch (error) {
      // silent fail
      toast.error("Failed to send message");
    }
  };

  // Fetch direct messages
  const fetchDirectMessages = async (otherUserId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messagesData, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) return;

      // Fetch user profiles separately
      if (messagesData && messagesData.length > 0) {
        const userIds = [
          ...new Set([
            ...messagesData.map((msg) => msg.sender_id),
            ...messagesData.map((msg) => msg.receiver_id),
          ]),
        ];

        const { data: userProfiles } = await supabase
          .from("user_profiles_public")
          .select("id, display_name")
          .in("id", userIds);

        const userProfileMap =
          userProfiles?.reduce((acc, profile) => {
            acc[profile.id] = profile.display_name;
            return acc;
          }, {} as Record<string, string>) || {};

        const enrichedMessages = messagesData.map((msg) => ({
          ...msg,
          sender_display_name: userProfileMap[msg.sender_id] || "Unknown User",
          receiver_display_name:
            userProfileMap[msg.receiver_id] || "Unknown User",
        }));

        setDirectMessages(enrichedMessages);
      } else {
        setDirectMessages([]);
      }
    } catch (error) {
      // silent fail
    }
  };

  // Send a direct message
  const sendDirectMessage = async () => {
    if (!messageInput.trim() || !activeDirectMessage) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to send messages");
        return;
      }

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: activeDirectMessage,
        content: messageInput.trim(),
      });

      if (error) {
        toast.error("Failed to send message");
        return;
      }

      setMessageInput("");
      // Refresh direct messages
      fetchDirectMessages(activeDirectMessage);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleTeamClick = (team: any) => {
    setSelectedTeam(team as AnimationTeam);
    setIsTeamModalOpen(true);
  };

  // Stream management functions
  const handleAddStream = (type: "text") => {
    setStreamType(type);
    setIsAddingStream(true);
    setNewStreamName("");
  };

  const handleCreateStream = async () => {
    if (!newStreamName.trim() || !userTeam) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create streams");
        return;
      }

      const { data: streamData, error } = await supabase
        .from("team_streams")
        .insert({
          team_id: userTeam.id,
          name: newStreamName.trim(),
          type: "text",
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating stream:", error);
        toast.error("Failed to create stream");
        return;
      }

      // Add to local state
      setTextStreams((prev) => [...prev, streamData]);
      setActiveChannel(streamData.id);
      setIsAddingStream(false);
      setNewStreamName("");
      toast.success("Stream created successfully!");
    } catch (error) {
      console.error("Error creating stream:", error);
      toast.error("Failed to create stream");
    }
  };

  const handleDirectMessageClick = (memberId: string) => {
    setActiveDirectMessage(memberId);
    setActiveChannel("dm");
  };

  const handleVoiceStreamClick = (streamId: string) => {
    if (
      streamId === "general-voice" ||
      textStreams.find((s) => s.id === streamId)
    ) {
      // setIsInVoiceCall(true); // This state variable is removed
    }
  };

  const handleJoinVoiceCall = () => {
    // setIsInVoiceCall(true); // This state variable is removed
    // setVoiceCallParticipants((prev) => [...prev, mockYourTeam.members[1]]); // Add current user
  };

  const handleLeaveVoiceCall = () => {
    // setIsInVoiceCall(false); // This state variable is removed
    // setIsMuted(false); // This state variable is removed
  };

  const handleToggleMute = () => {
    // setIsMuted(!isMuted); // This state variable is removed
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "finalized":
      case "published":
        return "bg-green-500";
      case "draft":
        return "bg-yellow-500";
      case "in-betweening":
      case "in progress":
        return "bg-blue-500";
      case "storyboard":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "finalized":
        return "Published";
      case "draft":
        return "Draft";
      case "in-betweening":
        return "In Betweening";
      case "in progress":
        return "In Progress";
      case "storyboard":
        return "Storyboard";
      default:
        return status;
    }
  };

  const renderYourTeamTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Manga Info & Team Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Manga Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Manga Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {project?.volumes?.[0]?.chapters?.[0]?.release_date
                    ? new Date(
                        project.volumes[0].chapters[0].release_date
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {project?.views || 0} Views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {project?.progress || 0} Chapters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {otherTeams.length} Active Teams
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Team Section */}
        {isInTeam && userTeam ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">{userTeam.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">{userTeam.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    {userTeam.upvotes.toLocaleString()} Team Upvotes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    {userTeam.views.toLocaleString()} Team Views
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Led by:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-red-600 text-white">
                      {userTeam.leader_display_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white text-sm">
                    {userTeam.leader_display_name}
                  </span>
                  <Crown className="w-4 h-4 text-yellow-400" />
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Team Members</h4>
                <div className="space-y-2">
                  {userTeam.members?.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-gray-600 text-white">
                          {member.user_display_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">
                            {member.user_display_name}
                          </span>
                          {member.user_id === userTeam.leader_id && (
                            <Crown className="w-3 h-3 text-yellow-400" />
                          )}
                        </div>
                        <span className="text-gray-400 text-xs">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  You're not currently in a team
                </h3>
                <p className="text-gray-400 mb-6">
                  Join an existing team or create a new one to start
                  collaborating on this project.
                </p>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setIsStartTeamModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Team
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Discussion - Only show if user is in a team */}
        {isInTeam && userTeam && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Team Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-96 min-h-0">
                {/* Left Sidebar */}
                <div className="w-64 bg-gray-700 rounded-l-lg p-4 space-y-6">
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-2">
                      STREAMS
                    </h4>
                    <div className="space-y-1">
                      {textStreams.map((stream) => (
                        <button
                          key={stream.id}
                          onClick={() => {
                            setActiveDirectMessage(null);
                            setActiveChannel(stream.id);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                            activeChannel === stream.id
                              ? "bg-gray-600 text-white"
                              : "text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          {stream.name}
                          {unreadStreams[stream.id] > 0 && (
                            <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                              {unreadStreams[stream.id]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleAddStream("text")}
                      className="w-full mt-2 px-2 py-1 rounded text-sm flex items-center gap-2 text-gray-400 hover:text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Stream
                    </button>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold text-sm mb-2">
                      DIRECT MESSAGES
                    </h4>
                    <div className="space-y-1">
                      {userTeam.members
                        ?.filter((member) => member.user_id !== currentUserId)
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() =>
                              handleDirectMessageClick(member.user_id)
                            }
                            className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                              activeDirectMessage === member.user_id
                                ? "bg-gray-600 text-white"
                                : "text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            <User className="w-3 h-3" />
                            {member.user_display_name}
                            {unreadDMs[member.user_id] > 0 && (
                              <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                                {unreadDMs[member.user_id]}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-600 rounded-r-lg flex flex-col min-h-0">
                  <div className="flex-1 p-4 flex flex-col min-h-0">
                    <div
                      ref={messagesContainerRef}
                      className="flex-1 space-y-4 mb-4 overflow-y-auto"
                    >
                      {activeDirectMessage ? (
                        // Direct Messages
                        directMessages.length > 0 ? (
                          directMessages.map((message) => (
                            <div
                              key={message.id}
                              className="flex items-start gap-3"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-blue-600 text-white">
                                  {message.sender_display_name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-semibold text-sm">
                                    {message.sender_display_name}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(
                                      message.created_at
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-400 mt-8">
                            No messages yet. Start the conversation!
                          </div>
                        )
                      ) : // Stream Messages
                      streamMessages.length > 0 ? (
                        <>
                          {streamMessages.map((message) => (
                            <div
                              key={message.id}
                              className="flex items-start gap-3"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-red-600 text-white">
                                  {message.user_display_name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-semibold text-sm">
                                    {message.user_display_name}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(
                                      message.created_at
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center text-gray-400 mt-8">
                          No messages yet. Start the conversation!
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={
                          activeDirectMessage
                            ? "Send direct message..."
                            : `Message #${
                                textStreams.find((s) => s.id === activeChannel)
                                  ?.name || "general"
                              }`
                        }
                        className="flex-1 bg-gray-700 border-gray-600 text-white"
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (activeDirectMessage
                            ? sendDirectMessage()
                            : sendStreamMessage())
                        }
                      />
                      <Button
                        onClick={
                          activeDirectMessage
                            ? sendDirectMessage
                            : sendStreamMessage
                        }
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Chapter Progress */}
      <div>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Chapter Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project?.volumes?.map((volume) => (
              <div key={volume.id} className="space-y-4">
                <h4 className="text-white font-semibold text-lg">
                  Volume {volume.volume_number}
                </h4>
                <div className="grid gap-4">
                  {volume.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="border border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            chapter.status
                          )}`}
                        ></div>
                        <h4 className="text-white font-semibold">
                          {chapter.title}
                        </h4>
                      </div>
                      <p className="text-gray-300 text-xs mb-3">
                        {getStatusText(chapter.status)}
                      </p>
                      {chapter.release_date && (
                        <p className="text-gray-400 text-xs mb-3">
                          Released:{" "}
                          {new Date(chapter.release_date).toLocaleDateString()}
                        </p>
                      )}

                      <Button
                        onClick={() => handleOpenEditor(chapter.id)}
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Open Editor
                      </Button>

                      <div className="mt-3 border-t border-gray-700 pt-3">
                        <button
                          className="text-left w-full text-sm text-gray-300 hover:text-white"
                          onClick={() =>
                            setExpandedChapters((prev) => ({
                              ...prev,
                              [chapter.id]: !prev[chapter.id],
                            }))
                          }
                        >
                          {expandedChapters[chapter.id]
                            ? "Hide Sequences & Shots"
                            : "Show Sequences & Shots"}
                        </button>

                        {expandedChapters[chapter.id] && (
                          <div className="mt-3 space-y-2">
                            {getMockSequencesForChapter(chapter.id).map((seq) => (
                              <div key={seq.seq} className="bg-gray-700 rounded p-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-2 00 font-medium">
                                    {seq.seq}
                                  </span>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {seq.shots.map((shot) => (
                                    <div
                                      key={shot.code}
                                      className="flex items-center justify-between text-xs bg-gray-800 rounded px-2 py-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-200">SHOT {shot.code}</span>
                                        <Badge className="bg-gray-600">{shot.stage}</Badge>
                                        <Badge
                                          className={`${
                                            shot.status === "approved"
                                              ? "bg-green-600"
                                              : shot.status === "review"
                                              ? "bg-yellow-600"
                                              : shot.status === "in-progress"
                                              ? "bg-blue-600"
                                              : "bg-gray-600"
                                          }`}
                                        >
                                          {shot.status}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        className="border-gray-600 text-gray-200 hover:bg-gray-700"
                                        onClick={() =>
                                          handleOpenShotEditor(
                                            chapter.id,
                                            seq.seq,
                                            shot.code
                                          )
                                        }
                                      >
                                        Open Editor
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderViewOtherTeamsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Other Teams */}
      <div className="lg:col-span-2">
        <h3 className="text-xl font-semibold text-white mb-4">Other Teams</h3>
        <div className="grid gap-4">
          {otherTeams.map((team) => (
            <Card
              key={team.id}
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => handleTeamClick(team)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{team.name}</h4>
                      <Badge
                        variant="secondary"
                        className="bg-gray-700 text-gray-300"
                      >
                        {team.members?.length ?? 0} members
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {team.description || "No description"}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {(team.upvotes || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {(team.views || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Led by:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs bg-red-600 text-white">
                            {(team.leader_display_name || "U").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">
                          {team.leader_display_name || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Column - Overall Progress */}
      <div>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project?.volumes?.map((volume) => (
              <div key={volume.id} className="space-y-4">
                <h4 className="text-white font-semibold text-lg">
                  Volume {volume.volume_number}
                </h4>
                <div className="grid gap-4">
                  {volume.chapters.map((chapter) => {
                    const aggregate = chapterAggregates[chapter.id];
                    const displayStatus =
                      aggregate?.highestStatus || chapter.status;
                    const contributorNames = aggregate?.contributors || [];
                    return (
                      <div
                        key={chapter.id}
                        className="border border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(
                              displayStatus
                            )}`}
                          ></div>
                          <h4 className="text-white font-semibold">
                            {chapter.title}
                          </h4>
                        </div>
                        <p className="text-gray-300 text-xs mb-3">
                          {getStatusText(displayStatus)}
                        </p>
                        {contributorNames.length > 0 && (
                          <div className="text-xs text-gray-400">
                            Contributors: {contributorNames.join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Loading State */}
      {loading && (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading project details...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && project && (
        <>
          {/* Top Bar */}
          <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                  <Button
                    variant="ghost"
                    onClick={() => onViewChange("creator")}
                    className="text-gray-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Creator Hub
                  </Button>
                  <div className="text-2xl font-bold text-red-500">
                    {project.title}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read Manga
                  </Button>
                  <Button className="bg-black text-white hover:bg-gray-800">
                    <Users className="w-4 h-4 mr-2" />
                    Start New Team
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Project Header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Project Image */}
              <div className="lg:col-span-1">
                <div className="w-full h-96 bg-gray-600 rounded-lg overflow-hidden">
                  {project.square_thumbnail_url ? (
                    <img
                      src={project.square_thumbnail_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Project Info */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    {project.title}
                  </h1>
                  <p className="text-gray-400 mb-4">
                    by {project.creator_display_name}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Display multiple genres if available, otherwise fallback to single genre */}
                    {project.genres && project.genres.length > 0 ? (
                      project.genres.slice(0, 3).map((genre) => (
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="bg-gray-700 text-gray-300"
                        >
                          {genre}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-gray-700 text-gray-300"
                      >
                        {project.genre}
                      </Badge>
                    )}
                    {/* Display series type if available */}
                    {project.series_type && (
                      <Badge
                        variant="outline"
                        className="border-blue-500 text-blue-400"
                      >
                        {project.series_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-300 mb-6">{project.description}</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {project.volumes?.[0]?.chapters?.[0]?.release_date
                        ? new Date(
                            project.volumes[0].chapters[0].release_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {project.views || 0} Views
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {project.progress || 0} Chapters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">0 Active Teams</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger
                  value="your-team"
                  className="data-[state=active]:bg-red-600"
                >
                  Your Team
                </TabsTrigger>
                <TabsTrigger
                  value="view-other-teams"
                  className="data-[state=active]:bg-red-600"
                >
                  View Other Teams
                </TabsTrigger>
              </TabsList>

              <TabsContent value="your-team" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="text-center text-red-500 py-8">{error}</div>
                ) : (
                  renderYourTeamTab()
                )}
              </TabsContent>

              <TabsContent value="view-other-teams" className="mt-6">
                {renderViewOtherTeamsTab()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Team Info Modal */}
          <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedTeam?.name}
                </DialogTitle>
              </DialogHeader>
              {selectedTeam && (
                <div className="space-y-6">
                  <p className="text-gray-300">{selectedTeam.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        {selectedTeam.upvotes.toLocaleString()} Upvotes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        {selectedTeam.views.toLocaleString()} Views
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-2">
                      Team Members
                    </h4>
                    <div className="space-y-2">
                      {(selectedTeam.members || []).map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-gray-600 text-white">
                              {member.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm">
                                {member.name}
                              </span>
                              {member.isLead && (
                                <Crown className="w-3 h-3 text-yellow-400" />
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">
                              {member.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Request to Join Team
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add Stream Modal */}
          <Dialog open={isAddingStream} onOpenChange={setIsAddingStream}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Add New {streamType === "text" ? "Text" : "Voice"} Stream
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">
                    Stream Name
                  </label>
                  <Input
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                    placeholder={`Enter ${streamType} stream name...`}
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleCreateStream()
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateStream}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={!newStreamName.trim()}
                  >
                    Create Stream
                  </Button>
                  <Button
                    onClick={() => setIsAddingStream(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {/* Start New Team Modal */}
      <Dialog
        open={isStartTeamModalOpen}
        onOpenChange={setIsStartTeamModalOpen}
      >
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Team Name
              </label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Description
              </label>
              <textarea
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="Describe your team's focus and expertise..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) {
                      toast.error("You must be logged in to create a team");
                      return;
                    }

                    const { data: teamData, error: teamError } = await supabase
                      .from("animation_teams")
                      .insert({
                        project_id: projectId,
                        name: newTeamName,
                        description: newTeamDescription,
                        leader_id: user.id,
                      })
                      .select()
                      .single();

                    if (teamError) {
                      console.error("Error creating team:", teamError);
                      toast.error("Failed to create team");
                      return;
                    }

                    // Add the leader as the first team member
                    const { error: memberError } = await supabase
                      .from("animation_team_members")
                      .insert({
                        team_id: teamData.id,
                        user_id: user.id,
                        role: "Team Leader",
                      });

                    if (memberError) {
                      console.error("Error adding team member:", memberError);
                    }

                    toast.success("Team created successfully!");
                    setIsStartTeamModalOpen(false);
                    setNewTeamName("");
                    setNewTeamDescription("");

                    // Refresh the page to show the new team
                    window.location.reload();
                  } catch (error) {
                    console.error("Error creating team:", error);
                    toast.error("Failed to create team");
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!newTeamName.trim()}
              >
                Create Team
              </Button>
              <Button
                onClick={() => {
                  setIsStartTeamModalOpen(false);
                  setNewTeamName("");
                  setNewTeamDescription("");
                }}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
