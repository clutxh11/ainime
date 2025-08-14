"use client";

import dynamic from "next/dynamic";

const ChapterWorkspace = dynamic(
  () =>
    import("@/features/components/animation/ChapterWorkspace").then(
      (m: any) => m?.default || m?.ChapterWorkspace || (() => null)
    ),
  { ssr: false }
);

export default function AnimationWorkspacePage() {
  return <ChapterWorkspace />;
}
