import React from 'react';
import { ArrowLeft, Sparkles, Wand2, Crop, Stamp } from 'lucide-react';

interface CompanionInfoProps {
  tool: string;
  onGoToCompress: () => void;
}

export const CompanionInfo: React.FC<CompanionInfoProps> = ({ tool, onGoToCompress }) => {
  const toolDetails: Record<string, { title: string; desc: string; icon: any; color: string }> = {
    crop: {
      title: 'Crop IMAGE',
      desc: 'Crop JPG, PNG or GIFs with interactive visual crop handles and custom aspect ratios (16:9, 4:3, 1:1, Free).',
      icon: Crop,
      color: 'text-amber-600 bg-amber-50',
    },
    editor: {
      title: 'Photo Editor',
      desc: 'Enhance photos with filters, color adjustments, brightness/contrast, vignette, and rotation.',
      icon: Wand2,
      color: 'text-purple-600 bg-purple-50',
    },
    watermark: {
      title: 'Watermark IMAGE',
      desc: 'Stamp an image or text over your photos in seconds. Choose typography, transparency and position.',
      icon: Stamp,
      color: 'text-indigo-600 bg-indigo-50',
    },
  };

  const current = toolDetails[tool] || {
    title: 'Image Tool',
    desc: 'Coming soon to the Imazon suite.',
    icon: Sparkles,
    color: 'text-rose-600 bg-rose-50',
  };

  const Icon = current.icon;

  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div
        className={`w-16 h-16 rounded-2xl ${current.color} flex items-center justify-center mx-auto mb-4 shadow-xs`}
      >
        <Icon className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{current.title}</h2>
      <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
        {current.desc}
      </p>

      <div className="mt-8 p-6 bg-white rounded-2xl border border-neutral-200 text-left space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span>Imazon Tool Roadmap</span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          The <strong className="text-neutral-800">Compress IMAGE</strong> engine is currently live
          and fully enabled with high-speed multi-format batch optimization, real savings calculations,
          before/after comparison, and ZIP bundling. This feature module will be unlocked in the next release!
        </p>

        <button
          onClick={onGoToCompress}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch to Image Compression</span>
        </button>
      </div>
    </div>
  );
};
