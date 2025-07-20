"use client";

import { AnimationEditor } from "@/components/animation-editor";
import type { CurrentView } from "@/types";

export default function AnimationEditorPage() {
  const handleViewChange = (view: CurrentView) => {
    // For now, we'll just redirect to the main page
    // In a full app, this would handle navigation between views
    if (view === "creator") {
      window.location.href = "/";
    }
  };

  return <AnimationEditor onViewChange={handleViewChange} />;
}
