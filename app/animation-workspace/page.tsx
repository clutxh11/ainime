"use client";

import dynamic from "next/dynamic";

const ChapterWorkspace = dynamic(
  () => import("@/features/components/animation/ChapterWorkspace").then((m) => m.ChapterWorkspace),
  { ssr: false }
);

export default function AnimationWorkspacePage() {
  return <ChapterWorkspace />;
}


