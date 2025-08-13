"use client";

interface EditorSettingsModalProps {
  open: boolean;
  mode: "animate" | "storyboard" | "composite";
  draftName: string;
  canEditName: boolean;
  draftWidth: number;
  draftHeight: number;
  draftFps: number;
  onChangeName: (v: string) => void;
  onChangeWidth: (v: number) => void;
  onChangeHeight: (v: number) => void;
  onChangeFps: (v: number) => void;
  onApply: () => Promise<void> | void;
  onCancel: () => void;
  showDeleteShot?: boolean;
  onDeleteShot?: () => Promise<void> | void;
  showDeleteComposition?: boolean;
  onDeleteComposition?: () => Promise<void> | void;
}

export default function EditorSettingsModal(props: EditorSettingsModalProps) {
  const {
    open,
    mode,
    draftName,
    canEditName,
    draftWidth,
    draftHeight,
    draftFps,
    onChangeName,
    onChangeWidth,
    onChangeHeight,
    onChangeFps,
    onApply,
    onCancel,
    showDeleteShot,
    onDeleteShot,
    showDeleteComposition,
    onDeleteComposition,
  } = props;

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4">
          {mode === "storyboard" ? "Sequence Settings" : mode === "composite" ? "Compositing Settings" : "Shot Settings"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              {mode === "storyboard" ? "Sequence Name" : mode === "composite" ? "Composition Name" : "Shot Name"}
            </label>
            <input
              className={`w-full border rounded px-3 py-2 ${
                canEditName ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed"
              }`}
              value={draftName}
              onChange={(e) => onChangeName(e.target.value)}
              disabled={!canEditName}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Width</label>
              <input
                type="number"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                value={draftWidth}
                onChange={(e) => onChangeWidth(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Height</label>
              <input
                type="number"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                value={draftHeight}
                onChange={(e) => onChangeHeight(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Units</label>
              <input className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300" value="px" disabled />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Frame Rate</label>
              <input
                type="number"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                value={draftFps}
                onChange={(e) => onChangeFps(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded px-3 py-2" onClick={() => void onApply()}>
              Apply
            </button>
            <button className="border border-gray-600 text-gray-300 rounded px-3 py-2" onClick={onCancel}>
              Cancel
            </button>
          </div>

          {showDeleteShot && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button className="w-full bg-red-900/60 hover:bg-red-900 text-white rounded px-3 py-2" onClick={() => setConfirmOpen((v) => !v)}>
                Delete Shot
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${confirmOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
                <div className="bg-red-950/50 border border-red-800 rounded px-3 py-3 text-sm text-red-200">
                  <div className="mb-2">Delete this shot? This action cannot be undone.</div>
                  <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 rounded border border-gray-600 text-gray-200" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </button>
                    <button className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white" onClick={() => onDeleteShot && onDeleteShot()}>
                      OK, Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDeleteComposition && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button className="w-full bg-red-900/60 hover:bg-red-900 text-white rounded px-3 py-2" onClick={() => setConfirmOpen((v) => !v)}>
                Delete Composition
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${confirmOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
                <div className="bg-red-950/50 border border-red-800 rounded px-3 py-3 text-sm text-red-200">
                  <div className="mb-2">Delete this composition? This action cannot be undone.</div>
                  <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 rounded border border-gray-600 text-gray-200" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </button>
                    <button className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white" onClick={() => onDeleteComposition && onDeleteComposition()}>
                      OK, Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";


