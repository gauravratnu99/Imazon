import React from 'react';
import { Download, Eye, Trash2, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { ImageFileItem } from '../types/image';
import { formatBytes, formatPercentage, getFormatLabel } from '../utils/formatters';

interface BatchImageListProps {
  items: ImageFileItem[];
  onRemoveItem: (id: string) => void;
  onDownloadSingle: (item: ImageFileItem) => void;
  onOpenCompare: (item: ImageFileItem) => void;
}

export const BatchImageList: React.FC<BatchImageListProps> = ({
  items,
  onRemoveItem,
  onDownloadSingle,
  onOpenCompare,
}) => {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isDone = item.status === 'done';
        const isCompressing = item.status === 'compressing';
        const isError = item.status === 'error';
        const formatLabel = getFormatLabel(item.originalFormat, item.name);
        const compressedFormatLabel = item.compressedFormat
          ? getFormatLabel(item.compressedFormat, item.name)
          : formatLabel;

        return (
          <div
            key={item.id}
            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
              isDone
                ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700'
                : isCompressing
                ? 'bg-rose-50/20 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {/* Left Zone: Thumbnail and Title */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 bg-transparency-grid flex items-center justify-center">
                <img
                  src={item.compressedUrl || item.originalUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded bg-neutral-900/80 text-white font-mono uppercase tracking-tight">
                  {compressedFormatLabel}
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  {isDone && (
                    <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
                      Optimized
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {item.originalWidth > 0 && item.originalHeight > 0 && (
                    <>
                      <span className="font-mono tabular-nums">
                        {item.originalWidth} × {item.originalHeight}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>Original:</span>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-200 tabular-nums">
                    {formatBytes(item.originalSize)}
                  </span>
                  {item.compressionTimeMs && item.compressionTimeMs > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                        {item.compressionTimeMs}ms
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Progress bar when compressing */}
                {isCompressing && (
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-rose-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Middle Zone: Size Metrics and Savings */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
              {isDone && item.compressedSize !== undefined ? (
                <div className="flex items-center gap-3">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      <span className="line-through text-neutral-400 dark:text-neutral-500">
                        {formatBytes(item.originalSize)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                        {formatBytes(item.compressedSize)}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Saved {formatBytes(item.savedBytes || 0)}
                    </div>
                  </div>

                  {/* Percentage Saved Badge */}
                  <div className="flex flex-col items-center justify-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums leading-none">
                      {formatPercentage(item.percentageSaved || 0)}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                      SAVED
                    </span>
                  </div>
                </div>
              ) : isCompressing ? (
                <div className="flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compressing...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{item.errorMessage || 'Failed to compress'}</span>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Ready to compress</div>
              )}

              {/* Right Zone: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isDone && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenCompare(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Compare visual quality Before & After"
                    >
                      <Eye className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                      <span className="hidden md:inline">Compare</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadSingle(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
                      title="Download compressed image"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  title="Remove from list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
