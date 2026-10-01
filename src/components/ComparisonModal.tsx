import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Check, Sparkles, ArrowLeftRight } from 'lucide-react';
import { ImageFileItem } from '../types/image';
import { formatBytes, formatPercentage, getFormatLabel } from '../utils/formatters';
import { downloadSingleFile } from '../utils/zipDownloader';

interface ComparisonModalProps {
  item: ImageFileItem | null;
  onClose: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ item, onClose }) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateSliderFromClientX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      updateSliderFromClientX(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateSliderFromClientX(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        updateSliderFromClientX(e.touches[0].clientX);
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, updateSliderFromClientX]);

  if (!item || !item.compressedUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-900/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-neutral-900 text-white rounded-2xl shadow-2xl border border-neutral-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Visual Inspection
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {item.originalWidth > 0 && `${item.originalWidth} × ${item.originalHeight}`}
              </span>
            </div>
            <h2 className="text-base font-bold text-white truncate max-w-lg mt-0.5">
              {item.name}
            </h2>
          </div>

          {/* Stats pills */}
          <div className="hidden sm:flex items-center gap-4 bg-neutral-800/80 px-3.5 py-1.5 rounded-xl border border-neutral-700/60 text-xs font-mono">
            <div>
              <span className="text-neutral-400">Original: </span>
              <span className="text-neutral-200">{formatBytes(item.originalSize)}</span>
            </div>
            <span className="text-neutral-600">→</span>
            <div>
              <span className="text-neutral-400">Compressed: </span>
              <span className="text-emerald-400 font-bold">
                {formatBytes(item.compressedSize || 0)}
              </span>
            </div>
            <div className="bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
              {formatPercentage(item.percentageSaved || 0)}
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSingleFile(item)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Zoom & Reset */}
        <div className="px-5 py-2 bg-neutral-950/70 border-b border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <ArrowLeftRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Drag slider horizontally to compare original vs compressed</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="p-1 hover:text-white rounded hover:bg-neutral-800"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-neutral-300 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              className="p-1 hover:text-white rounded hover:bg-neutral-800"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className="text-xs text-rose-400 hover:text-rose-300 ml-1 underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Main Split View Area */}
        <div className="relative flex-1 bg-neutral-950 overflow-hidden select-none flex items-center justify-center p-4">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="relative max-w-full max-h-[60vh] overflow-hidden rounded-lg cursor-ew-resize bg-transparency-grid shadow-inner border border-neutral-800"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease',
            }}
          >
            {/* Base Image: Compressed */}
            <img
              src={item.compressedUrl}
              alt="Compressed"
              referrerPolicy="no-referrer"
              className="block max-w-full max-h-[60vh] object-contain pointer-events-none"
            />

            {/* Overlaid Image: Original, clipped by sliderPos */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={item.originalUrl}
                alt="Original"
                referrerPolicy="no-referrer"
                className="block max-w-none h-full object-contain pointer-events-none"
                style={{
                  width: containerRef.current?.clientWidth || '100%',
                }}
              />
            </div>

            {/* Vertical Divider Line with handle */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute inset-y-0 -left-px w-0.5 bg-rose-500 shadow-md"></div>
              <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-rose-600 shadow-xl flex items-center justify-center border-2 border-rose-500">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>

            {/* In-view Badges */}
            <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm border border-white/10 pointer-events-none">
              ORIGINAL ({formatBytes(item.originalSize)})
            </div>
            <div className="absolute top-3 right-3 bg-rose-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm border border-white/10 pointer-events-none">
              COMPRESSED ({formatBytes(item.compressedSize || 0)})
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Notice: Visual differences are imperceptible at standard view distances.
          </span>
          <span className="font-mono text-emerald-400 font-semibold">
            {formatBytes(item.savedBytes || 0)} space saved on disk
          </span>
        </div>
      </div>
    </div>
  );
};
