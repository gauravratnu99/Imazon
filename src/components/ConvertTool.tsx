import React, { useState } from 'react';
import { RefreshCw, Download, ArrowRight, CheckCircle2 } from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes, getFileExtension } from '../utils/formatters';

export const ConvertTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setConvertedBlob(null);
    setConvertedUrl(null);
  };

  const handleConvert = async () => {
    if (!imageUrl || !file) return;
    setIsConverting(true);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), targetFormat, 0.92)
      );

      if (blob) {
        setConvertedBlob(blob);
        setConvertedUrl(URL.createObjectURL(blob));
      }
    } finally {
      setIsConverting(false);
    }
  };

  const downloadConverted = () => {
    if (!convertedUrl || !file) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/webp' ? 'webp' : 'png';
    const base = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${base}.${ext}`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Convert to JPG, WebP or PNG
        </h1>
        <p className="text-neutral-500 text-sm mt-1 max-w-lg mx-auto">
          Convert PNG, SVG, GIF, WebP or HEIC into optimized standard image formats.
        </p>
      </div>

      {!file ? (
        <DropZone onFilesSelected={handleFiles} />
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Preview */}
            <div className="flex flex-col items-center">
              <div className="w-full max-h-72 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 flex items-center justify-center p-2 bg-transparency-grid">
                <img
                  src={convertedUrl || imageUrl!}
                  alt="Convert target"
                  referrerPolicy="no-referrer"
                  className="max-h-64 object-contain"
                />
              </div>
              <div className="mt-2 text-xs text-neutral-500 font-mono">
                {file.name} ({formatBytes(file.size)})
              </div>
            </div>

            {/* Target Options */}
            <div className="space-y-4">
              <span className="text-sm font-bold text-neutral-900 block pb-2 border-b border-neutral-200">
                Choose Target Format
              </span>

              <div className="space-y-2">
                {[
                  { id: 'image/jpeg', name: 'JPG / JPEG', desc: 'Universal compatibility, great for photos' },
                  { id: 'image/webp', name: 'WebP', desc: 'Next-gen format with superior compression' },
                  { id: 'image/png', name: 'PNG', desc: 'Supports transparent backgrounds' },
                ].map((fmt) => (
                  <label
                    key={fmt.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      targetFormat === fmt.id
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={fmt.id}
                      checked={targetFormat === fmt.id}
                      onChange={() => setTargetFormat(fmt.id as any)}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">{fmt.name}</div>
                      <div className="text-xs text-neutral-500">{fmt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Convert Image</span>
                    </>
                  )}
                </button>

                {convertedBlob && (
                  <button
                    type="button"
                    onClick={downloadConverted}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Converted File ({formatBytes(convertedBlob.size)})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImageUrl(null);
                    setConvertedBlob(null);
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
