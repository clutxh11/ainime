"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { CurrentView } from "@/types";

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

interface Message {
  id: string;
  author: TeamMember;
  content: string;
  timestamp: string;
  channel: string;
}

const mockProject = {
  id: "1",
  title: "Dragon's Ascent",
  author: "Kenji Yamamoto",
  genres: ["Fantasy", "Action", "Adventure"],
  description:
    "A young warrior discovers ancient dragon magic in a world where technology and magic collide.",
  mangaReads: 45000,
  animationViews: 125000,
  upvotes: 8500,
  activeTeams: 3,
  coverImage: "/placeholder.svg?height=400&width=300",
};

const mockYourTeam: Team = {
  id: "1",
  name: "Dragon Fire Studios",
  description:
    "Specializing in epic fantasy animations with fluid combat sequences.",
  members: [
    {
      id: "1",
      name: "Alex Chen",
      role: "Lead Animator",
      avatar: "AC",
      isLead: true,
    },
    { id: "2", name: "Mike Johnson", role: "Clean-up Artist", avatar: "MJ" },
    { id: "3", name: "Sarah Kim", role: "In-betweener", avatar: "SK" },
  ],
  upvotes: 2500,
  views: 45000,
  completedChapters: 1,
  lead: {
    id: "1",
    name: "Alex Chen",
    role: "Lead Animator",
    avatar: "AC",
    isLead: true,
  },
};

const mockOtherTeams: Team[] = [
  {
    id: "2",
    name: "Anime Warriors",
    description:
      "Focused on high-quality character animation and storytelling.",
    members: [
      {
        id: "4",
        name: "Emma Wilson",
        role: "Lead Animator",
        avatar: "EW",
        isLead: true,
      },
      { id: "5", name: "David Lee", role: "Background Artist", avatar: "DL" },
    ],
    upvotes: 1800,
    views: 32000,
    completedChapters: 2,
    lead: {
      id: "4",
      name: "Emma Wilson",
      role: "Lead Animator",
      avatar: "EW",
      isLead: true,
    },
  },
  {
    id: "3",
    name: "Pixel Dreams",
    description: "Creating stunning visual effects and dynamic scenes.",
    members: [
      {
        id: "6",
        name: "Lisa Park",
        role: "Lead Animator",
        avatar: "LP",
        isLead: true,
      },
      { id: "7", name: "Tom Anderson", role: "Effects Artist", avatar: "TA" },
      { id: "8", name: "Rachel Green", role: "Clean-up Artist", avatar: "RG" },
    ],
    upvotes: 1200,
    views: 28000,
    completedChapters: 1,
    lead: {
      id: "6",
      name: "Lisa Park",
      role: "Lead Animator",
      avatar: "LP",
      isLead: true,
    },
  },
];

const mockChapters: Chapter[] = [
  {
    id: "1",
    title: "Ch. 1",
    subtitle: "The Awakening",
    status: "published",
    contributors: ["Alex Chen", "Sarah Kim"],
  },
  {
    id: "2",
    title: "Ch. 2",
    subtitle: "First Flight",
    status: "in-betweening",
    contributors: ["Sarah Kim", "Mike Johnson"],
  },
  {
    id: "3",
    title: "Ch. 3",
    subtitle: "The Ancient Temple",
    status: "storyboard",
    contributors: ["Alex Chen"],
  },
  {
    id: "4",
    title: "Ch. 4",
    subtitle: "Dragon's Power",
    status: "not-started",
    contributors: [],
  },
];

const mockMessages: Message[] = [
  {
    id: "1",
    author: mockYourTeam.members[0],
    content:
      "Hey team! I've finished the keyframes for chapter 2. Ready for review!",
    timestamp: "Today at 2:30 PM",
    channel: "general",
  },
  {
    id: "2",
    author: mockYourTeam.members[2],
    content: "Great work! I'll start on the in-betweening tomorrow morning.",
    timestamp: "Today at 2:45 PM",
    channel: "general",
  },
];

// Remove the old static definitions since we're now using state

export function ProjectDetail({ onViewChange, projectId }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState("your-team");
  const [activeChannel, setActiveChannel] = useState("general");
  const [messageInput, setMessageInput] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Stream management
  const [textStreams, setTextStreams] = useState([
    { id: "general", name: "general", type: "text" },
  ]);
  const [voiceStreams, setVoiceStreams] = useState([
    { id: "general-voice", name: "General Voice", type: "voice" },
  ]);
  const [isAddingStream, setIsAddingStream] = useState(false);
  const [newStreamName, setNewStreamName] = useState("");
  const [streamType, setStreamType] = useState<"text" | "voice">("text");

  // Direct message state
  const [activeDirectMessage, setActiveDirectMessage] = useState<string | null>(
    null
  );

  // Voice call state
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceCallParticipants, setVoiceCallParticipants] = useState<
    TeamMember[]
  >([
    mockYourTeam.members[0], // Alex Chen
  ]);

  const handleOpenEditor = (chapterId: string) => {
    onViewChange("animation-editor", {
      projectId,
      chapterId,
      projectTitle: mockProject.title,
    });
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In a real app, this would send the message to the backend
      setMessageInput("");
    }
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  // Stream management functions
  const handleAddStream = (type: "text" | "voice") => {
    setStreamType(type);
    setIsAddingStream(true);
    setNewStreamName("");
  };

  const handleCreateStream = () => {
    if (newStreamName.trim()) {
      const newStream = {
        id: `${newStreamName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name: newStreamName.trim(),
        type: streamType,
      };

      if (streamType === "text") {
        setTextStreams((prev) => [...prev, newStream]);
        setActiveChannel(newStream.id);
      } else {
        setVoiceStreams((prev) => [...prev, newStream]);
      }

      setIsAddingStream(false);
      setNewStreamName("");
    }
  };

  const handleDirectMessageClick = (memberId: string) => {
    setActiveDirectMessage(memberId);
    setActiveChannel("dm");
  };

  const handleVoiceStreamClick = (streamId: string) => {
    if (
      streamId === "general-voice" ||
      voiceStreams.find((s) => s.id === streamId)
    ) {
      setIsInVoiceCall(true);
    }
  };

  const handleJoinVoiceCall = () => {
    setIsInVoiceCall(true);
    setVoiceCallParticipants((prev) => [...prev, mockYourTeam.members[1]]); // Add current user
  };

  const handleLeaveVoiceCall = () => {
    setIsInVoiceCall(false);
    setIsMuted(false);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "in-betweening":
        return "bg-yellow-500";
      case "storyboard":
        return "bg-purple-500";
      default:
        return "bg-orange-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "Published";
      case "in-betweening":
        return "In Betweening";
      case "storyboard":
        return "Storyboard";
      default:
        return "Not Started";
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
                  {mockProject.mangaReads.toLocaleString()} Manga Reads
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.animationViews.toLocaleString()} Animation Views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.upvotes.toLocaleString()} Upvotes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.activeTeams} Active Teams
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Team Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{mockYourTeam.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm">{mockYourTeam.description}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockYourTeam.upvotes.toLocaleString()} Team Upvotes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockYourTeam.views.toLocaleString()} Team Views
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Led by:</span>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-red-600 text-white">
                    {mockYourTeam.lead.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm">
                  {mockYourTeam.lead.name}
                </span>
                {mockYourTeam.lead.isLead && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">Team Members</h4>
              <div className="space-y-2">
                {mockYourTeam.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
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
          </CardContent>
        </Card>

        {/* Team Discussion */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Team Discussion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-96">
              {/* Streams Sidebar */}
              <div className="w-48 bg-gray-700 rounded-l-lg p-4 space-y-4">
                <div>
                  <h4 className="text-white font-semibold text-sm mb-2">
                    STREAMS
                  </h4>
                  <div className="space-y-1">
                    {textStreams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => setActiveChannel(stream.id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                          activeChannel === stream.id
                            ? "bg-gray-600 text-white"
                            : "text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        <Hash className="w-3 h-3" />
                        {stream.name}
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
                    VOICE STREAMS
                  </h4>
                  <div className="space-y-1">
                    {voiceStreams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => handleVoiceStreamClick(stream.id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                          isInVoiceCall
                            ? "bg-red-600 text-white"
                            : "text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        <Volume2 className="w-3 h-3" />
                        {stream.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddStream("voice")}
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
                    {mockYourTeam.members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleDirectMessageClick(member.id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                          activeDirectMessage === member.id
                            ? "bg-gray-600 text-white"
                            : "text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-gray-600 rounded-r-lg flex flex-col">
                {isInVoiceCall ? (
                  // Voice Call Interface
                  <div className="flex-1 p-4">
                    <div className="text-center mb-4">
                      <h3 className="text-white font-semibold mb-2">
                        Voice Call
                      </h3>
                      <p className="text-gray-300 text-sm">General Voice</p>
                    </div>

                    {/* Participant Tiles */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {voiceCallParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="bg-gray-700 rounded-lg p-4 text-center"
                        >
                          <Avatar className="w-16 h-16 mx-auto mb-2">
                            <AvatarFallback className="text-lg bg-gray-500 text-white">
                              {participant.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-white font-semibold">
                            {participant.name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {participant.role}
                          </p>
                          {participant.isLead && (
                            <Crown className="w-4 h-4 text-yellow-400 mx-auto mt-1" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Voice Call Controls */}
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={handleToggleMute}
                        variant={isMuted ? "destructive" : "outline"}
                        size="sm"
                        className={
                          isMuted
                            ? "bg-red-600"
                            : "border-gray-600 text-gray-300"
                        }
                      >
                        {isMuted ? "Unmute" : "Mute"}
                      </Button>
                      <Button
                        onClick={handleLeaveVoiceCall}
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Leave Call
                      </Button>
                    </div>
                  </div>
                ) : activeDirectMessage ? (
                  // Direct Message Interface
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="text-center mb-4">
                      <h3 className="text-white font-semibold">
                        Direct Message
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {
                          mockYourTeam.members.find(
                            (m) => m.id === activeDirectMessage
                          )?.name
                        }
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center text-gray-400 text-sm">
                        Start a conversation with{" "}
                        {
                          mockYourTeam.members.find(
                            (m) => m.id === activeDirectMessage
                          )?.name
                        }
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-500">
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder={`Message ${
                            mockYourTeam.members.find(
                              (m) => m.id === activeDirectMessage
                            )?.name
                          }`}
                          className="flex-1 bg-gray-700 border-gray-600 text-white"
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                        />
                        <Button
                          onClick={handleSendMessage}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular Stream Chat Interface
                  <>
                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {mockMessages.map((message) => (
                          <div
                            key={message.id}
                            className="flex items-start gap-3"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-gray-500 text-white">
                                {message.author.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-semibold text-sm">
                                  {message.author.avatar} {message.author.name}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  {message.timestamp}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-500">
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder={`Message #${
                            textStreams.find((s) => s.id === activeChannel)
                              ?.name
                          }`}
                          className="flex-1 bg-gray-700 border-gray-600 text-white"
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                        />
                        <Button
                          onClick={handleSendMessage}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Chapter Progress */}
      <div>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Chapter Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockChapters.map((chapter) => (
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
                  <h4 className="text-white font-semibold">{chapter.title}</h4>
                </div>
                <p className="text-gray-400 text-sm mb-2">{chapter.subtitle}</p>
                <p className="text-gray-300 text-xs mb-3">
                  {getStatusText(chapter.status)}
                </p>

                {chapter.contributors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-400 text-xs mb-1">Contributors:</p>
                    <div className="flex flex-wrap gap-1">
                      {chapter.contributors.map((contributor) => (
                        <Badge
                          key={contributor}
                          variant="secondary"
                          className="text-xs bg-gray-700 text-gray-300"
                        >
                          {contributor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleOpenEditor(chapter.id)}
                  size="sm"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Open Editor
                </Button>
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
          {mockOtherTeams.map((team) => (
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
                        {team.members.length} members
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {team.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {team.upvotes.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {team.views.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Led by:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs bg-red-600 text-white">
                            {team.lead.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">
                          {team.lead.name}
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
            {mockChapters.map((chapter) => (
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
                  <h4 className="text-white font-semibold">{chapter.title}</h4>
                </div>
                <p className="text-gray-400 text-sm mb-2">{chapter.subtitle}</p>
                <p className="text-gray-300 text-xs mb-3">
                  {getStatusText(chapter.status)}
                </p>

                <div className="mb-3">
                  <p className="text-gray-400 text-xs mb-1">Teams:</p>
                  <div className="flex flex-wrap gap-1">
                    {mockOtherTeams.map((team) => (
                      <Badge
                        key={team.id}
                        variant="secondary"
                        className="text-xs bg-gray-700 text-gray-300"
                      >
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="text-gray-500 text-xs italic">
                  Click disabled - Join a team to access
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
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
                {mockProject.title}
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
            <div className="w-full h-96 bg-gray-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-24 h-24 text-gray-400" />
            </div>
          </div>

          {/* Project Info */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {mockProject.title}
              </h1>
              <p className="text-gray-400 mb-4">by {mockProject.author}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {mockProject.genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="bg-gray-700 text-gray-300"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
              <p className="text-gray-300 mb-6">{mockProject.description}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.mangaReads.toLocaleString()} Manga Reads
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.animationViews.toLocaleString()} Animation Views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.upvotes.toLocaleString()} Upvotes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {mockProject.activeTeams} Active Teams
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            {renderYourTeamTab()}
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
            <DialogTitle className="text-2xl">{selectedTeam?.name}</DialogTitle>
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
                <h4 className="text-white font-semibold mb-2">Team Members</h4>
                <div className="space-y-2">
                  {selectedTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
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
                onKeyPress={(e) => e.key === "Enter" && handleCreateStream()}
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
    </div>
  );
}
 