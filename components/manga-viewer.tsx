"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  MessageCircle,
  ThumbsUp,
} from "lucide-react"
import type { CurrentView } from "@/app/page"

interface MangaViewerProps {
  content: any
  onViewChange: (view: CurrentView) => void
}

const mockComments = [
  {
    id: "1",
    author: "MangaReader",
    content: "The art style in this chapter is incredible! Love the character expressions.",
    timeAgo: "1h ago",
    likes: 32,
  },
  {
    id: "2",
    author: "StoryLover",
    content: "Plot twist at the end! Didn't see that coming at all.",
    timeAgo: "3h ago",
    likes: 18,
  },
]

export function MangaViewer({ content, onViewChange }: MangaViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [showComments, setShowComments] = useState(true)

  const totalPages = 20 // Mock total pages

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => onViewChange("viewer")} className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="text-lg font-semibold text-white">
                {content?.title} - {content?.selectedChapter}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Manga Reader */}
          <div className="lg:col-span-3">
            {/* Reader Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="bg-transparent border-gray-600 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400 min-w-[60px] text-center">{zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(100)}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent border-gray-600 text-white">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Manga Page */}
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-4">
                <div className="flex justify-center">
                  <div
                    className="relative max-w-full"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                  >
                    <img
                      src="/placeholder.svg?height=800&width=600"
                      alt={`Page ${currentPage}`}
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="bg-transparent border-gray-600 text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Page
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={pageNum === currentPage ? "bg-red-600" : "bg-transparent border-gray-600 text-white"}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="bg-transparent border-gray-600 text-white"
              >
                Next Page
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Comments Section */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">Comments ({mockComments.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-gray-400"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {showComments ? "Hide" : "Show"}
                </Button>
              </div>

              {showComments && (
                <>
                  <div className="flex gap-3 mb-6">
                    <Avatar>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input placeholder="Add a comment..." className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>

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
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">Chapter Navigation</h3>
                <div className="space-y-2">
                  {["Chapter 1: The Awakening", "Chapter 2: First Flight", "Chapter 3: The Ancient Temple"].map(
                    (chapter, index) => (
                      <Button
                        key={index}
                        variant={chapter === content?.selectedChapter ? "default" : "ghost"}
                        className={`w-full justify-start text-sm ${
                          chapter === content?.selectedChapter
                            ? "bg-red-600 hover:bg-red-700"
                            : "text-gray-300 hover:text-white hover:bg-gray-700"
                        }`}
                      >
                        {chapter}
                      </Button>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">Reading Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Reading Mode</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="radio" id="single" name="mode" defaultChecked className="text-red-600" />
                        <label htmlFor="single" className="text-white text-sm">
                          Single Page
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="radio" id="double" name="mode" className="text-red-600" />
                        <label htmlFor="double" className="text-white text-sm">
                          Double Page
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="radio" id="vertical" name="mode" className="text-red-600" />
                        <label htmlFor="vertical" className="text-white text-sm">
                          Vertical Scroll
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Background</label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-white text-black border-gray-600">
                        White
                      </Button>
                      <Button size="sm" variant="outline" className="bg-gray-800 text-white border-gray-600">
                        Dark
                      </Button>
                      <Button size="sm" variant="outline" className="bg-black text-white border-gray-600">
                        Black
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
