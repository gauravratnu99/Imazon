import React from 'react';
import { 
  Minimize2, 
  Maximize2, 
  Sparkles, 
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
      activeColor: 'bg-rose-50 border-rose-600 text-rose-700',
    },
    {
      id: 'resize',
      name: 'Resize IMAGE',
      desc: 'Define pixels or percentages',
      icon: Maximize2,
      activeColor: 'bg-blue-50 border-blue-600 text-blue-700',
    },
    {
      id: 'upscale',
      name: 'Upscale PHOTO',
      desc: 'Enlarge resolution by 2x, 4x, 8x',
      icon: Sparkles,
      activeColor: 'bg-indigo-50 border-indigo-600 text-indigo-700',
    },
    {
      id: 'convert',
      name: 'Convert to JPG / WebP',
      desc: 'Convert formats seamlessly',
      icon: RefreshCw,
      activeColor: 'bg-emerald-50 border-emerald-600 text-emerald-700',
    },
    {
      id: 'crop',
      name: 'Crop IMAGE',
      desc: 'Trim and aspect ratio crop',
      icon: Crop,
      activeColor: 'bg-amber-50 border-amber-600 text-amber-700',
    },
    {
      id: 'editor',
      name: 'Photo Editor',
      desc: 'Filters, lighting & effects',
      icon: Wand2,
      activeColor: 'bg-purple-50 border-purple-600 text-purple-700',
    },
    {
      id: 'watermark',
      name: 'Watermark',
      desc: 'Protect photos with stamp',
      icon: Stamp,
      activeColor: 'bg-teal-50 border-teal-600 text-teal-700',
    },
  ];

  return (
    <div className="border-b border-neutral-200 bg-white shadow-2xs">
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
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/80 text-inherit' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="whitespace-nowrap">
                  <div className="text-xs font-semibold leading-tight text-neutral-900">
                    {tool.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 leading-tight">
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
