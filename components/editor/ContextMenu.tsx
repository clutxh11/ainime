"use client";

import { Button } from "@/components/ui/button";

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onCut: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onResize: () => void;
}

export default function ContextMenu({ visible, x, y, onCut, onCopy, onDelete, onDuplicate, onResize }: ContextMenuProps) {
  if (!visible) return null;
  return (
    <div
      style={{ position: "fixed", top: y, left: x, transform: "translateX(-50%)", zIndex: 100 }}
      className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 flex items-center p-1"
    >
      <Button variant="ghost" size="sm" className="px-3" onClick={onCut}>
        Cut
      </Button>
      <Button variant="ghost" size="sm" className="px-3" onClick={onCopy}>
        Copy
      </Button>
      <Button variant="ghost" size="sm" className="px-3 text-red-500 hover:text-red-400" onClick={onDelete}>
        Delete
      </Button>
      <Button variant="ghost" size="sm" className="px-3" onClick={onDuplicate}>
        Duplicate
      </Button>
      <Button variant="ghost" size="sm" className="px-3" onClick={onResize}>
        Resize
      </Button>
    </div>
  );
}


