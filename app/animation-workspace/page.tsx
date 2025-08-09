"use client";

export default function AnimationWorkspacePage() {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const projectId = url.searchParams.get("projectId") || "";
    const chapterId = url.searchParams.get("chapterId") || "";
    const sequence = url.searchParams.get("sequence") || "";
    const shot = url.searchParams.get("shot") || "";
    const target = `/editor?projectId=${projectId}&chapterId=${chapterId}${
      sequence ? `&sequenceId=${encodeURIComponent(sequence)}` : ""
    }${shot ? `&shotId=${encodeURIComponent(shot)}` : ""}&mode=animate`;
    window.location.replace(target);
  }
  return null;
}


