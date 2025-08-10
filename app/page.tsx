"use client";

import { useState, lazy, Suspense } from "react";
import type { CurrentView, ContentItem, Project } from "@/types";
import { ViewerHub } from "@/components/viewer-hub";

// Lazy load components to improve initial bundle size
const CreatorHub = lazy(() =>
  import("@/components/creator-hub").then((m) => ({ default: m.CreatorHub }))
);
const Calendar = lazy(() =>
  import("@/components/calendar").then((m) => ({ default: m.Calendar }))
);
const VideoPlayer = lazy(() =>
  import("@/components/video-player").then((m) => ({ default: m.VideoPlayer }))
);
const MangaViewer = lazy(() =>
  import("@/components/manga-viewer").then((m) => ({ default: m.MangaViewer }))
);
const ContentExplorer = lazy(() => import("@/components/content-explorer"));
const ProjectDashboard = lazy(() =>
  import("@/components/project-dashboard").then((m) => ({
    default: m.ProjectDashboard,
  }))
);
const AnimationEditor = lazy(() =>
  import("@/components/animation-editor").then((m) => ({
    default: m.AnimationEditor,
  }))
);
const ProjectDetail = lazy(() =>
  import("@/components/project-detail").then((m) => ({
    default: m.ProjectDetail,
  }))
);

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

  const handleViewChange = (
    view: CurrentView,
    content?: ContentItem | Project | any,
    category?: string
  ) => {
    setCurrentView(view);
    if (content) {
      // Check if content contains scene settings
      if (
        content.sceneName &&
        content.canvasWidth &&
        content.canvasHeight &&
        content.frameRate
      ) {
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
            <AnimationEditor
              onViewChange={handleViewChange}
              sceneSettings={sceneSettings}
              // Pass through mode if provided in sceneSettings
              mode={(sceneSettings as any)?.mode || 'animate'}
            />
          </Suspense>
        );

      case "compositing-editor":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            {/* TODO: replace with real CompositingEditor component */}
            <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-semibold mb-2">Compositing Editor</div>
                <div className="text-sm opacity-80">Placeholder – opens from Project Details via Create/Open Composition</div>
              </div>
            </div>
          </Suspense>
        );

      case "project-detail":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProjectDetail
              onViewChange={handleViewChange}
              projectId={selectedContent?.id}
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
