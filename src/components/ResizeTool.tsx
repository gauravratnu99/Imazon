import React, { useState } from 'react';
import { Maximize2, Download, ArrowRight, RefreshCw, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes } from '../utils/formatters';

export const ResizeTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number>(100);

  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    setResizedBlob(null);
    setResizedUrl(null);

    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
      setTargetWidth(img.naturalWidth);
      setTargetHeight(img.naturalHeight);
      setScalePercent(100);
    };
    img.src = url;
  };

  const handleWidthChange = (w: number) => {
    setTargetWidth(w);
    if (maintainAspect && originalWidth > 0) {
      const h = Math.round((w / originalWidth) * originalHeight);
      setTargetHeight(h);
      setScalePercent(Math.round((w / originalWidth) * 100));
    }
  };

  const handleHeightChange = (h: number) => {
    setTargetHeight(h);
    if (maintainAspect && originalHeight > 0) {
      const w = Math.round((h / originalHeight) * originalWidth);
      setTargetWidth(w);
      setScalePercent(Math.round((h / originalHeight) * 100));
    }
  };

  const handlePercentPreset = (pct: number) => {
    setScalePercent(pct);
    if (originalWidth > 0) {
      setTargetWidth(Math.round((originalWidth * pct) / 100));
      setTargetHeight(Math.round((originalHeight * pct) / 100));
    }
  };

  const executeResize = async () => {
    if (!imageUrl || targetWidth <= 0 || targetHeight <= 0) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mime = file?.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), mime, 0.92));

      if (blob) {
        setResizedBlob(blob);
        setResizedUrl(URL.createObjectURL(blob));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResized = () => {
    if (!resizedUrl || !file) return;
    const a = document.createElement('a');
    a.href = resizedUrl;
    const ext = file.name.split('.').pop() || 'jpg';
    const base = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${base}_${targetWidth}x${targetHeight}.${ext}`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Resize IMAGE
        </h1>
        <p className="text-neutral-500 text-sm mt-1 max-w-lg mx-auto">
          Resize JPG, PNG, SVG or WebP by defining new height and width pixels or percentages.
        </p>
      </div>

      {!file ? (
        <DropZone onFilesSelected={handleFiles} />
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Preview */}
            <div className="flex flex-col items-center">
              <div className="w-full max-h-72 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 flex items-center justify-center p-2 bg-transparency-grid">
                <img
                  src={resizedUrl || imageUrl!}
                  alt="Resize target"
                  referrerPolicy="no-referrer"
                  className="max-h-64 object-contain"
                />
              </div>
              <div className="mt-2 text-xs text-neutral-500 font-mono">
                Original: {originalWidth} × {originalHeight} px ({formatBytes(file.size)})
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-sm font-bold text-neutral-900">Resize Settings</span>
                <button
                  onClick={() => setMaintainAspect(!maintainAspect)}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-medium ${
                    maintainAspect
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                  }`}
                >
                  {maintainAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{maintainAspect ? 'Maintain Aspect Ratio' : 'Free Aspect'}</span>
                </button>
              </div>

              {/* Pixel inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={targetWidth || ''}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-sm font-mono p-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={targetHeight || ''}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-sm font-mono p-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Percentage Presets */}
              <div>
                <span className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Or Quick Percentage Presets
                </span>
                <div className="flex items-center gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentPreset(pct)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                        scalePercent === pct
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={executeResize}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resizing...</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span>Apply Resize</span>
                    </>
                  )}
                </button>

                {resizedBlob && (
                  <button
                    type="button"
                    onClick={downloadResized}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Resized Image ({formatBytes(resizedBlob.size)})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImageUrl(null);
                    setResizedBlob(null);
                  }}
                  className="w-full py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
                >
                  Choose another image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
