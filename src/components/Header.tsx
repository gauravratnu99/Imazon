import React from 'react';
import { Layers, FolderDown, RotateCcw, Wrench } from 'lucide-react';

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
  const navItems = [
    { id: 'compress', label: 'Compress IMAGE' },
    { id: 'resize', label: 'Resize IMAGE' },
    { id: 'upscale', label: 'Upscale PHOTO' },
    { id: 'transparent', label: 'Make Transparent' },
    { id: 'convert', label: 'Convert to JPG' },
    { id: 'crop', label: 'Crop IMAGE' },
    { id: 'editor', label: 'Photo Editor' },
  ];

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
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white shadow-xs group-hover:bg-rose-600 transition-colors">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900 font-sans">
              Imazon
            </span>
          </a>
        </div>

        {/* Zone 2: Clean Navigation Links for All Tools */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-neutral-600">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`transition-colors relative py-1 ${
                  isActive
                    ? 'text-neutral-900 font-semibold'
                    : 'hover:text-neutral-900 text-neutral-600'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          {hasFiles && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-all whitespace-nowrap"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Download ZIP ({completedCount})</span>
            </button>
          )}

          {/* Mobile Tool Indicator / Quick Switcher */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              onClick={() => {
                const nextIdx = (navItems.findIndex((n) => n.id === activeTab) + 1) % navItems.length;
                setActiveTab(navItems[nextIdx].id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-neutral-500" />
              <span>Switch Tool</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
