"use client";

import { useSearchParams } from "next/navigation";

export default function EditorPage() {
  const params = useSearchParams();
  const mode = params.get("mode") || "animate";
  const projectId = params.get("projectId") || "";
  const chapterId = params.get("chapterId") || "";
  const sequenceId = params.get("sequenceId") || "";
  const shotId = params.get("shotId") || "";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Editor (placeholder shell)</h1>
        <p className="text-sm text-gray-400 mb-6">
          This is the new editor route. The drawing engine will be added next. For now we
          just confirm context handoff.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
            <div>Mode: {mode}</div>
            <div>Project: {projectId}</div>
            <div>Chapter: {chapterId}</div>
            <div>Sequence: {sequenceId || "(none)"}</div>
            <div>Shot: {shotId || "(none)"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


