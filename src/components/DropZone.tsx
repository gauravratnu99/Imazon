import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Plus, FileCode2 } from 'lucide-react';
import { getSampleFiles } from '../utils/sampleImages';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler to paste images directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        onFilesSelected(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files).filter((file) => {
          return (
            file.type.startsWith('image/') ||
            file.name.toLowerCase().endsWith('.svg') ||
            file.name.toLowerCase().endsWith('.png') ||
            file.name.toLowerCase().endsWith('.jpg') ||
            file.name.toLowerCase().endsWith('.jpeg') ||
            file.name.toLowerCase().endsWith('.webp') ||
            file.name.toLowerCase().endsWith('.gif')
          );
        });
        if (filesArray.length > 0) {
          onFilesSelected(filesArray);
        }
      }
    },
    [onFilesSelected]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleLoadSamples = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingSamples(true);
    try {
      const sampleFiles = await getSampleFiles();
      onFilesSelected(sampleFiles);
    } catch (err) {
      console.error('Failed to load sample images', err);
    } finally {
      setLoadingSamples(false);
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-rose-500 bg-rose-50/50'
            : 'border-neutral-300 hover:border-rose-400 bg-neutral-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,.jpg,.jpeg,.png,.webp,.svg,.gif"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-neutral-700">
          <Plus className="w-4 h-4 text-rose-600" />
          <span>Add more images (drop or click)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 md:p-16 text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? 'border-rose-500 bg-rose-50/60 shadow-lg scale-[1.008]'
          : 'border-neutral-300 hover:border-rose-400 bg-white hover:bg-neutral-50/50 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,.jpg,.jpeg,.png,.webp,.svg,.gif"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="max-w-xl mx-auto flex flex-col items-center">
        {/* Upload Icon */}
        <div className="w-20 h-20 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-sm ring-8 ring-rose-50/50">
          <UploadCloud className="w-10 h-10 stroke-[1.75]" />
        </div>

        {/* Big Action Button */}
        <button
          type="button"
          className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-xl text-base shadow-sm transition-all flex items-center gap-2.5 mb-4"
        >
          <ImageIcon className="w-5 h-5" />
          <span>Select images</span>
        </button>

        <p className="text-sm font-medium text-neutral-600 mb-2">
          or drop images here, or paste directly with{' '}
          <kbd className="px-1.5 py-0.5 text-xs bg-neutral-100 border border-neutral-300 rounded font-mono text-neutral-700">
            Ctrl+V
          </kbd>
        </p>

        {/* Formats supported */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-neutral-600 mt-2 mb-6">
          <span>Supported:</span>
          <span className="font-semibold text-neutral-800">JPG</span>
          <span>·</span>
          <span className="font-semibold text-neutral-800">PNG</span>
          <span>·</span>
          <span className="font-semibold text-neutral-800">SVG</span>
          <span>·</span>
          <span className="font-semibold text-neutral-800">GIF</span>
          <span>·</span>
          <span className="font-semibold text-neutral-800">WebP</span>
          <span>·</span>
          <span>Batch mode up to 50+ files</span>
        </div>

        {/* Demo Try Out Button */}
        <div className="pt-4 border-t border-neutral-200/80 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleLoadSamples}
            disabled={loadingSamples}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg transition-colors border border-neutral-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {loadingSamples ? 'Preparing sample files...' : 'Try with 4 instant demo images (JPG, PNG, SVG)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
