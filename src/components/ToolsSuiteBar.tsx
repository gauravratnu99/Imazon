import React from 'react';
import { 
  Minimize2, 
  Maximize2, 
  Sparkles, 
  Eraser, 
  Crop, 
  RefreshCw, 
  Wand2, 
  Stamp 
} from 'lucide-react';

interface ToolsSuiteBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ToolsSuiteBar: React.FC<ToolsSuiteBarProps> = ({ activeTab, setActiveTab }) => {
  const tools = [
    {
      id: 'compress',
      name: 'Compress IMAGE',
      desc: 'Reduce file size with best quality',
      icon: Minimize2,
      activeColor: 'bg-rose-50 dark:bg-rose-950/50 border-rose-600 dark:border-rose-500 text-rose-700 dark:text-rose-300',
    },
    {
      id: 'resize',
      name: 'Resize IMAGE',
      desc: 'Define pixels or percentages',
      icon: Maximize2,
      activeColor: 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'upscale',
      name: 'Upscale PHOTO',
      desc: 'Enlarge resolution by 2x, 4x, 8x',
      icon: Sparkles,
      activeColor: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'transparent',
      name: 'Make Transparent',
      desc: 'Remove photo or image background',
      icon: Eraser,
      activeColor: 'bg-violet-50 dark:bg-violet-950/50 border-violet-600 dark:border-violet-500 text-violet-700 dark:text-violet-300',
    },
    {
      id: 'convert',
      name: 'Convert to JPG / WebP',
      desc: 'Convert formats seamlessly',
      icon: RefreshCw,
      activeColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'crop',
      name: 'Crop IMAGE',
      desc: 'Trim and aspect ratio crop',
      icon: Crop,
      activeColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'editor',
      name: 'Photo Editor',
      desc: 'Filters, lighting & effects',
      icon: Wand2,
      activeColor: 'bg-purple-50 dark:bg-purple-950/50 border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-300',
    },
    {
      id: 'watermark',
      name: 'Watermark',
      desc: 'Protect photos with stamp',
      icon: Stamp,
      activeColor: 'bg-teal-50 dark:bg-teal-950/50 border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-300',
    },
  ];

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTab(tool.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all shrink-0 ${
                  isActive
                    ? tool.activeColor + ' font-medium shadow-2xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/80'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/80 dark:bg-neutral-900/70 text-inherit'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="whitespace-nowrap">
                  <div className="text-xs font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                    {tool.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                    {tool.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
