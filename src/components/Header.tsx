import React from 'react';
import { Layers, Sparkles, FolderDown, RotateCcw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasFiles: boolean;
  onReset: () => void;
  completedCount: number;
  onDownloadAllZip: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasFiles,
  onReset,
  completedCount,
  onDownloadAllZip,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single Brand Wordmark */}
        <div className="flex items-center gap-2">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('compress');
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm group-hover:bg-rose-700 transition-colors">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900 font-sans">
              Imazon
            </span>
          </a>
          <span className="hidden sm:inline-block text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded ml-1">
            IMAGE SUITE
          </span>
        </div>

        {/* Zone 2: Clean Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-neutral-600">
          <button
            onClick={() => setActiveTab('compress')}
            className={`transition-colors relative py-1 ${
              activeTab === 'compress'
                ? 'text-rose-600 font-semibold'
                : 'hover:text-neutral-900'
            }`}
          >
            Compress IMAGE
            {activeTab === 'compress' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('resize')}
            className={`transition-colors relative py-1 ${
              activeTab === 'resize'
                ? 'text-rose-600 font-semibold'
                : 'hover:text-neutral-900'
            }`}
          >
            Resize IMAGE
            {activeTab === 'resize' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('convert')}
            className={`transition-colors relative py-1 ${
              activeTab === 'convert'
                ? 'text-rose-600 font-semibold'
                : 'hover:text-neutral-900'
            }`}
          >
            Convert to JPG/WebP
            {activeTab === 'convert' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('crop')}
            className={`transition-colors relative py-1 ${
              activeTab === 'crop'
                ? 'text-rose-600 font-semibold'
                : 'hover:text-neutral-900'
            }`}
          >
            Crop IMAGE
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`transition-colors relative py-1 ${
              activeTab === 'editor'
                ? 'text-rose-600 font-semibold'
                : 'hover:text-neutral-900'
            }`}
          >
            Photo Editor
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          {hasFiles && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
              title="Clear all images"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {completedCount > 1 ? (
            <button
              onClick={onDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all whitespace-nowrap"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Download ZIP ({completedCount})</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('compress')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              <span>Compress Engine</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
