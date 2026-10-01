import React from 'react';
import { FolderDown, CheckCircle2, TrendingDown, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { BatchStats } from '../types/image';
import { formatBytes, formatPercentage } from '../utils/formatters';

interface SummaryBarProps {
  stats: BatchStats;
  onDownloadAllZip: () => void;
  isZipping: boolean;
  zipProgress: number;
  onAddMoreClick: () => void;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({
  stats,
  onDownloadAllZip,
  isZipping,
  zipProgress,
  onAddMoreClick,
}) => {
  if (stats.completedFiles === 0) return null;

  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-neutral-800">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        {/* Left: Overall Achievement Metrics */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div>
            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Optimized Status</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-sans">
              {stats.completedFiles} of {stats.totalFiles} images ready
            </div>
          </div>

          <div className="border-l border-neutral-800 pl-6 sm:pl-10">
            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
              Total Size Reduction
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {formatPercentage(stats.overallSavedPercentage)}
              </span>
              <span className="text-sm font-semibold text-emerald-300">
                ({formatBytes(stats.totalSavedBytes)} saved)
              </span>
            </div>
            <div className="text-xs text-neutral-400 font-mono mt-0.5 tabular-nums">
              <span className="line-through text-neutral-500">
                {formatBytes(stats.totalOriginalBytes)}
              </span>
              {' → '}
              <span className="text-white font-medium">
                {formatBytes(stats.totalCompressedBytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onAddMoreClick}
            className="w-full sm:w-auto px-4 py-3 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add More</span>
          </button>

          <button
            type="button"
            onClick={onDownloadAllZip}
            disabled={isZipping || stats.completedFiles === 0}
            className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2.5 whitespace-nowrap"
          >
            {isZipping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating ZIP ({zipProgress}%)...</span>
              </>
            ) : (
              <>
                <FolderDown className="w-5 h-5 stroke-[2.2]" />
                <span>Download All Images (ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
