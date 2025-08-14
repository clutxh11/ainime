"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AnimationEditor from "@/components/animation-editor";
import CreatorHub from "@/components/creator-hub";
import Calendar from "@/components/calendar";
import VideoPlayer from "@/components/video-player";
import MangaViewer from "@/components/manga-viewer";
import ContentExplorer from "@/components/content-explorer";
import ProjectDashboard from "@/components/project-dashboard";
import ProjectDetail from "@/components/project-detail";
import type { CurrentView, ContentItem, Project } from "@/types";
import { ViewerHub } from "@/components/viewer-hub";

// Note: using direct imports during debugging to avoid lazy resolution issues

// Loading component for better UX
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentView, setCurrentView] = useState<CurrentView>("viewer");
  const [selectedContent, setSelectedContent] = useState<
    ContentItem | Project | null
  >(null);
  const [explorerCategory, setExplorerCategory] = useState<string>("");
  const [sceneSettings, setSceneSettings] = useState<
    | {
        sceneName: string;
        canvasWidth: number;
        canvasHeight: number;
        frameRate: number;
        projectId?: string;
        chapterId?: string;
        sequenceId?: string;
        shotId?: string;
      }
    | undefined
  >(undefined);

  // Allow booting specific views via query string (e.g. ?view=animation-editor&mode=storyboard&sceneName=Test&canvasWidth=1280&canvasHeight=720&frameRate=24)
  const searchParams = useSearchParams();
  useEffect(() => {
    const viewParam = (searchParams.get("view") || "").toLowerCase();
    const allowedViews: CurrentView[] = [
      "viewer",
      "creator",
      "calendar",
      "video",
      "manga",
      "content-explorer",
      "project-dashboard",
      "project-detail",
      "animation-editor",
      "compositing-editor",
    ];
    if (allowedViews.includes(viewParam as CurrentView)) {
      setCurrentView(viewParam as CurrentView);
    }

    const sceneName = searchParams.get("sceneName");
    const w = Number(searchParams.get("canvasWidth") || "");
    const h = Number(searchParams.get("canvasHeight") || "");
    const fps = Number(searchParams.get("frameRate") || "");
    const mode = (searchParams.get("mode") as any) || undefined;
    if (sceneName && w && h && fps) {
      setSceneSettings({
        sceneName,
        canvasWidth: w,
        canvasHeight: h,
        frameRate: fps,
        ...(mode ? { mode } : {}),
      } as any);
    }
  }, []);

  const handleViewChange = (
    view: CurrentView,
    content?: ContentItem | Project | any,
    category?: string
  ) => {
    //
    setCurrentView(view);
    if (content) {
      // Check if content contains scene settings
      if (
        content.sceneName &&
        content.canvasWidth &&
        content.canvasHeight &&
        content.frameRate
      ) {
        //
        setSceneSettings(content);
      } else {
        setSelectedContent(content);
      }
    }
    if (category) setExplorerCategory(category);
  };

  // Render only the current view to improve performance
  const renderCurrentView = () => {
    switch (currentView) {
      case "viewer":
        return <ViewerHub onViewChange={handleViewChange} />;

      case "creator":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CreatorHub onViewChange={handleViewChange} />
          </Suspense>
        );

      case "calendar":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Calendar onViewChange={handleViewChange} />
          </Suspense>
        );

      case "video":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <VideoPlayer
              content={selectedContent}
              onViewChange={handleViewChange}
            />
          </Suspense>
        );

      case "manga":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MangaViewer
              content={selectedContent}
              onViewChange={handleViewChange}
            />
          </Suspense>
        );

      case "content-explorer":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ContentExplorer
              category={explorerCategory}
              onViewChange={handleViewChange}
            />
          </Suspense>
        );

      case "project-dashboard":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProjectDashboard
              project={selectedContent}
              onViewChange={handleViewChange}
            />
          </Suspense>
        );

      case "animation-editor":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            {/* */}
            <AnimationEditor
              onViewChange={handleViewChange}
              sceneSettings={sceneSettings}
              // Pass through mode if provided in sceneSettings
              mode={(sceneSettings as any)?.mode || "animate"}
            />
          </Suspense>
        );

      case "compositing-editor":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AnimationEditor
              onViewChange={handleViewChange}
              // Boot the editor in composite mode with sensible defaults.
              // The chapter-level button passes { projectId, chapterId } as content.
              sceneSettings={
                {
                  sceneName:
                    (selectedContent as any)?.chapterTitle ||
                    (sceneSettings as any)?.sceneName ||
                    "Composition",
                  canvasWidth: 1920,
                  canvasHeight: 1080,
                  frameRate: 24,
                  // Prefer IDs passed via onViewChange from Project Details; fall back to any existing sceneSettings
                  projectId:
                    (selectedContent as any)?.projectId ||
                    (sceneSettings as any)?.projectId,
                  chapterId:
                    (selectedContent as any)?.chapterId ||
                    (sceneSettings as any)?.chapterId,
                } as any
              }
              mode="composite"
            />
          </Suspense>
        );

      case "project-detail":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProjectDetail
              onViewChange={handleViewChange}
              projectId={
                (selectedContent as any)?.id ||
                (selectedContent as any)?.projectId ||
                (sceneSettings as any)?.projectId
              }
            />
          </Suspense>
        );

      default:
        return <ViewerHub onViewChange={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">{renderCurrentView()}</div>
  );
}
