import React from 'react';
import { Sliders, Sparkles, Zap, ShieldCheck, ArrowRight, Play, RefreshCw } from 'lucide-react';
import { CompressionOptions, CompressionPreset, OutputFormatChoice } from '../types/image';

interface CompressionSettingsProps {
  options: CompressionOptions;
  setOptions: React.Dispatch<React.SetStateAction<CompressionOptions>>;
  onStartCompress: () => void;
  isCompressing: boolean;
  fileCount: number;
  completedCount: number;
}

export const CompressionSettings: React.FC<CompressionSettingsProps> = ({
  options,
  setOptions,
  onStartCompress,
  isCompressing,
  fileCount,
  completedCount,
}) => {
  const handlePresetChange = (preset: CompressionPreset) => {
    let quality = options.quality;
    if (preset === 'smart') quality = 0.78;
    if (preset === 'extreme') quality = 0.52;
    if (preset === 'light') quality = 0.88;

    setOptions((prev) => ({
      ...prev,
      preset,
      quality,
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-rose-600" />
          <h2 className="text-sm font-bold text-neutral-900">Compression Options</h2>
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {fileCount} {fileCount === 1 ? 'file' : 'files'} selected
        </span>
      </div>

      {/* Preset Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
        {/* Smart */}
        <button
          type="button"
          onClick={() => handlePresetChange('smart')}
          className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
            options.preset === 'smart'
              ? 'border-rose-600 bg-rose-50/50 text-rose-950 ring-1 ring-rose-600'
              : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended</span>
          </div>
          <div className="text-sm font-semibold text-neutral-900 leading-tight">Smart Compression</div>
          <div className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Best quality & filesize ratio. Visually lossless.
          </div>
        </button>

        {/* Extreme */}
        <button
          type="button"
          onClick={() => handlePresetChange('extreme')}
          className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
            options.preset === 'extreme'
              ? 'border-rose-600 bg-rose-50/50 text-rose-950 ring-1 ring-rose-600'
              : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Max Reduction</span>
          </div>
          <div className="text-sm font-semibold text-neutral-900 leading-tight">Extreme</div>
          <div className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Smallest file size (~80–90% reduction).
          </div>
        </button>

        {/* Crisp / Light */}
        <button
          type="button"
          onClick={() => handlePresetChange('light')}
          className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
            options.preset === 'light'
              ? 'border-rose-600 bg-rose-50/50 text-rose-950 ring-1 ring-rose-600'
              : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High Fidelity</span>
          </div>
          <div className="text-sm font-semibold text-neutral-900 leading-tight">Crisp / Light</div>
          <div className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Maximum detail preservation, strips metadata.
          </div>
        </button>

        {/* Custom */}
        <button
          type="button"
          onClick={() => handlePresetChange('custom')}
          className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
            options.preset === 'custom'
              ? 'border-rose-600 bg-rose-50/50 text-rose-950 ring-1 ring-rose-600'
              : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual</span>
          </div>
          <div className="text-sm font-semibold text-neutral-900 leading-tight">Custom Settings</div>
          <div className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Fine-tune slider, format & max resolution.
          </div>
        </button>
      </div>

      {/* Custom Fine-Tuning Controls */}
      {options.preset === 'custom' && (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4 mb-4">
          {/* Quality Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1.5">
              <span>Quality Target:</span>
              <span className="font-mono font-bold text-rose-600 tabular-nums">
                {Math.round(options.quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={Math.round(options.quality * 100)}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  quality: parseInt(e.target.value, 10) / 100,
                }))
              }
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-mono">
              <span>10% (Smallest file)</span>
              <span>75% (Balanced)</span>
              <span>100% (High fidelity)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Output format */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Output Format
              </label>
              <select
                value={options.outputFormat}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    outputFormat: e.target.value as OutputFormatChoice,
                  }))
                }
                className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="original">Keep original format</option>
                <option value="image/webp">Convert to WebP (High compression)</option>
                <option value="image/jpeg">Convert to JPG</option>
                <option value="image/png">Convert to PNG</option>
              </select>
            </div>

            {/* Max resolution */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Max Dimension
              </label>
              <select
                value={options.maxDimension}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    maxDimension: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="0">Original Dimensions (No resize)</option>
                <option value="2560">Cap at 2560px (2K / QHD)</option>
                <option value="1920">Cap at 1920px (Full HD 1080p)</option>
                <option value="1280">Cap at 1280px (HD 720p)</option>
                <option value="800">Cap at 800px (Web optimized)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Compress Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>Client-side private processing — images never leave your browser.</span>
        </div>

        <button
          type="button"
          onClick={onStartCompress}
          disabled={isCompressing || fileCount === 0}
          className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isCompressing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>
                Compressing ({completedCount}/{fileCount})...
              </span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>
                {completedCount > 0 ? 'Re-compress Images' : `Compress Images (${fileCount})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
