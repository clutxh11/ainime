import React from 'react';
import { ImageSequence } from '@/lib/utils/tga-utils';

interface SequenceImportModalProps {
  sequence: ImageSequence | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (importAsSequence: boolean) => void;
}

export function SequenceImportModal({ 
  sequence, 
  isOpen, 
  onClose, 
  onConfirm 
}: SequenceImportModalProps) {
  if (!isOpen || !sequence) return null;

  const handleConfirm = (importAsSequence: boolean) => {
    onConfirm(importAsSequence);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Import Image Sequence</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Detected a sequence of <strong>{sequence.frames.length}</strong> images:
          </p>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="font-mono text-xs">
              {sequence.baseName}
              <span className="text-blue-600">[0001-{sequence.frames.length.toString().padStart(4, '0')}]</span>
              .{sequence.extension}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleConfirm(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Import as Image Sequence
          </button>
          
          <button
            onClick={() => handleConfirm(false)}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
          >
            Import as Individual Images
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-transparent text-gray-600 py-2 px-4 rounded hover:bg-gray-100 transition-colors border border-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
