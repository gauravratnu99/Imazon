import React from 'react';
import { Layers, FolderDown, RotateCcw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasFiles: boolean;
  onReset: () => void;
  completedCount: number;
  onDownloadAllZip: () => void;
}

const FEATURE_LABELS: Record<string, string> = {
  compress: 'Compress IMAGE',
  resize: 'Resize IMAGE',
  upscale: 'Upscale PHOTO',
  transparent: 'Make Transparent',
  convert: 'Convert to JPG / WebP',
  crop: 'Crop IMAGE',
  editor: 'Photo Editor',
  watermark: 'Watermark',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasFiles,
  onReset,
  completedCount,
  onDownloadAllZip,
}) => {
  const navItems = [
    { id: 'compress', label: 'Compress IMAGE' },
    { id: 'resize', label: 'Resize IMAGE' },
    { id: 'upscale', label: 'Upscale PHOTO' },
    { id: 'transparent', label: 'Make Transparent' },
    { id: 'convert', label: 'Convert to JPG' },
    { id: 'crop', label: 'Crop IMAGE' },
    { id: 'watermark', label: 'Watermark' },
  ];

  const selectedFeatureName = FEATURE_LABELS[activeTab] || 'Compress IMAGE';

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('compress');
            }}
            className="flex items-center gap-3 group whitespace-nowrap shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs group-hover:bg-red-700 transition-colors">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-red-600 group-hover:text-red-700 transition-colors font-sans">
              Imazon
            </span>
          </a>
        </div>

        {/* Zone 2: Clean Navigation Links for All Tools */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`transition-colors relative py-1 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'hover:text-neutral-900 dark:hover:text-neutral-100 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions & Selected Feature Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          {hasFiles && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Clear all images"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {completedCount > 1 && (
            <button
              type="button"
              onClick={onDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-rose-600 hover:bg-neutral-800 dark:hover:bg-rose-500 rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Download ZIP ({completedCount})</span>
            </button>
          )}

          {/* Selected Feature Name (shown on smaller viewports where top nav collapses) */}
          <div className="lg:hidden flex items-center">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap truncate max-w-[150px] sm:max-w-[200px]">
              {selectedFeatureName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
