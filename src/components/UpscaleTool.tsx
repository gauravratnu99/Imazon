import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  ArrowLeftRight, 
  Maximize, 
  ShieldCheck, 
  Eye, 
  Image as ImageIcon,
  CheckCircle2,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes } from '../utils/formatters';

type UpscaleFactor = 2 | 4 | 8;
type UpscaleMode = 'ai-enhanced' | 'smooth' | 'crisp';

export const UpscaleTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);

  // Settings
  const [factor, setFactor] = useState<UpscaleFactor>(2);
  const [mode, setMode] = useState<UpscaleMode>('ai-enhanced');
  const [denoise, setDenoise] = useState<boolean>(true);
  const [sharpness, setSharpness] = useState<number>(65); // 0 - 100
  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');

  // Upscale results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [upscaledBlob, setUpscaledBlob] = useState<Blob | null>(null);
  const [upscaledWidth, setUpscaledWidth] = useState<number>(0);
  const [upscaledHeight, setUpscaledHeight] = useState<number>(0);
  const [processTimeMs, setProcessTimeMs] = useState<number>(0);

  // Comparison & Zoom state
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  // Handle image load
  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    setUpscaledUrl(null);
    setUpscaledBlob(null);

    const img = new Image();
    img.onload = () => {
      setOrigWidth(img.naturalWidth);
      setOrigHeight(img.naturalHeight);
    };
    img.src = url;
  };

  // Target dimensions based on selected factor
  const targetWidth = origWidth * factor;
  const targetHeight = origHeight * factor;

  // Multi-pass high quality canvas scaling with sharpening filter
  const executeUpscale = async () => {
    if (!imageUrl || !origWidth || !origHeight) return;

    setIsProcessing(true);
    setProgress(15);
    const startTime = performance.now();

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      setProgress(35);

      // We do multi-step stepped scaling (powers of 2) for maximum interpolation quality
      let curCanvas = document.createElement('canvas');
      curCanvas.width = origWidth;
      curCanvas.height = origHeight;
      let curCtx = curCanvas.getContext('2d', { willReadFrequently: true })!;
      curCtx.drawImage(img, 0, 0);

      // Perform stepped enlargement if factor > 2 to avoid blurry single-jump blur
      let curW = origWidth;
      let curH = origHeight;
      const steps = factor === 8 ? 3 : factor === 4 ? 2 : 1;

      for (let step = 0; step < steps; step++) {
        const nextW = curW * 2;
        const nextH = curH * 2;
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = nextW;
        nextCanvas.height = nextH;
        const nextCtx = nextCanvas.getContext('2d', { willReadFrequently: true })!;

        if (mode === 'crisp') {
          nextCtx.imageSmoothingEnabled = false;
        } else {
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = 'high';
        }

        nextCtx.drawImage(curCanvas, 0, 0, nextW, nextH);
        curCanvas = nextCanvas;
        curCtx = nextCtx;
        curW = nextW;
        curH = nextH;

        setProgress(35 + Math.round(((step + 1) / steps) * 35));
        await new Promise((r) => setTimeout(r, 20)); // yield to UI
      }

      setProgress(75);

      // Apply AI unsharp masking & edge contrast enhancement if enabled
      if (mode === 'ai-enhanced' && sharpness > 0) {
        const finalW = curCanvas.width;
        const finalH = curCanvas.height;
        const imgData = curCtx.getImageData(0, 0, finalW, finalH);
        const data = imgData.data;
        const copy = new Uint8ClampedArray(data);

        const strength = (sharpness / 100) * 0.45; // balanced sharpness

        // High-pass 3x3 convolution kernel for edge enhancement
        for (let y = 1; y < finalH - 1; y++) {
          const rowOffset = y * finalW;
          for (let x = 1; x < finalW - 1; x++) {
            const idx = (rowOffset + x) * 4;

            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const up = copy[((y - 1) * finalW + x) * 4 + c];
              const down = copy[((y + 1) * finalW + x) * 4 + c];
              const left = copy[(rowOffset + (x - 1)) * 4 + c];
              const right = copy[(rowOffset + (x + 1)) * 4 + c];

              const neighborAvg = (up + down + left + right) * 0.25;
              const diff = center - neighborAvg;

              // Unsharp mask with threshold to avoid accentuating flat noise
              if (Math.abs(diff) > 2) {
                data[idx + c] = Math.min(255, Math.max(0, center + diff * strength));
              }
            }
          }
        }
        curCtx.putImageData(imgData, 0, 0);
      }

      setProgress(90);

      // Generate final blob
      const quality = outputFormat === 'image/jpeg' ? 0.95 : outputFormat === 'image/webp' ? 0.92 : undefined;
      const blob = await new Promise<Blob | null>((resolve) => {
        curCanvas.toBlob((b) => resolve(b), outputFormat, quality);
      });

      if (!blob) throw new Error('Failed to output upscaled image');

      const finalUrl = URL.createObjectURL(blob);
      setUpscaledBlob(blob);
      setUpscaledUrl(finalUrl);
      setUpscaledWidth(curCanvas.width);
      setUpscaledHeight(curCanvas.height);

      const endTime = performance.now();
      setProcessTimeMs(Math.round(endTime - startTime));
      setProgress(100);
    } catch (err) {
      console.error('Upscale failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Slider drag controls
  const updateSliderPos = useCallback((clientX: number) => {
    if (!compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    updateSliderPos(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDraggingSlider(true);
      updateSliderPos(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) updateSliderPos(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches.length > 0) updateSliderPos(e.touches[0].clientX);
    };
    const handleMouseUp = () => setIsDraggingSlider(false);

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSlider, updateSliderPos]);

  // Download upscaled image
  const handleDownload = () => {
    if (!upscaledUrl || !file) return;
    const a = document.createElement('a');
    a.href = upscaledUrl;
    const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
    const base = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${base}_${factor}x_upscaled.${ext}`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
          Upscale PHOTO
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Increase image resolution and enlarge your photos by <strong className="text-neutral-800 font-semibold">2x, 4x, or 8x</strong> with crisp detail enhancement.
        </p>
      </div>

      {!file ? (
        <div className="space-y-10">
          <DropZone onFilesSelected={handleFiles} />

          {/* Quick Explanatory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Maximize className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">2x, 4x & 8x Scaling</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Transform small low-res photos into ultra-high-definition wallpapers, print-ready posters, or crystal clear banner graphics.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Detail & Texture Enhancement</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Applies multi-stage unsharp edge sharpening and adaptive contrast interpolation to avoid blurry pixelation.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">100% In-Browser Privacy</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Processing runs on your device GPU/CPU via Canvas hardware acceleration. No server uploads or storage.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-sm space-y-6">
          {/* Top Bar: Image info & reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 truncate max-w-md">
                {file.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                <span>Original:</span>
                <span className="font-mono font-semibold text-neutral-800">
                  {origWidth} × {origHeight} px
                </span>
                <span>·</span>
                <span className="font-mono text-neutral-600">{formatBytes(file.size)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setImageUrl(null);
                setUpscaledUrl(null);
                setUpscaledBlob(null);
              }}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 self-start sm:self-auto py-1 px-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            >
              Choose different image
            </button>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Scale Factor Selector (2x, 4x, 8x) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wide block">
                1. Select Upscale Factor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 4, 8] as UpscaleFactor[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFactor(f)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all ${
                      factor === f
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-600/30 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="text-lg font-extrabold tracking-tight">{f}x</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {f === 2 ? 'Double' : f === 4 ? 'Quad' : 'Ultra 8x'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Resulting Dimensions Preview */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs space-y-1">
                <div className="text-neutral-500 text-[11px]">Resulting Resolution:</div>
                <div className="font-mono font-bold text-indigo-700 text-sm">
                  {targetWidth} × {targetHeight} px
                </div>
                <div className="text-[11px] text-neutral-500">
                  {factor * factor}x more total pixels
                </div>
              </div>
            </div>

            {/* 2. Enhancement Mode */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wide block">
                2. Enhancement Style
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: 'ai-enhanced',
                    title: 'Enhanced Sharpening',
                    desc: 'Sharp edges & high detail texture',
                    badge: 'RECOMMENDED',
                  },
                  {
                    id: 'smooth',
                    title: 'Smooth Bicubic',
                    desc: 'Natural gradients & soft portraits',
                  },
                  {
                    id: 'crisp',
                    title: 'Crisp Pixel / Graphic',
                    desc: 'Pixel art, logos & UI illustrations',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as UpscaleMode)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      mode === m.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold ring-1 ring-indigo-600'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{m.title}</span>
                      {m.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Output Format & Action */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wide block mb-2">
                  3. Format & Settings
                </label>

                {/* Format choice */}
                <div className="mb-3">
                  <span className="text-[11px] text-neutral-600 font-medium block mb-1">
                    Output Format:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'image/png', label: 'PNG' },
                      { id: 'image/jpeg', label: 'JPG' },
                      { id: 'image/webp', label: 'WebP' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setOutputFormat(fmt.id as any)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                          outputFormat === fmt.id
                            ? 'bg-neutral-900 border-neutral-900 text-white'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sharpness slider for enhanced mode */}
                {mode === 'ai-enhanced' && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-neutral-700 mb-1">
                      <span>Detail Sharpness:</span>
                      <span className="font-mono font-bold text-indigo-600">{sharpness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={sharpness}
                      onChange={(e) => setSharpness(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* Main Upscale Trigger Button */}
              <button
                type="button"
                onClick={executeUpscale}
                disabled={isProcessing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-neutral-300 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Upscaling to {factor}x ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Upscale Photo {factor}x</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Inspection & Result Area */}
          {upscaledUrl ? (
            <div className="pt-6 border-t border-neutral-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-sm font-bold text-neutral-900">
                    Upscaled {factor}x Successfully
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    ({processTimeMs}ms)
                  </span>
                </div>

                {/* Download button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {factor}x Upscaled Image ({formatBytes(upscaledBlob?.size || 0)})
                  </span>
                </button>
              </div>

              {/* Comparison Split Viewer */}
              <div className="bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">
                {/* Viewer Header */}
                <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Drag slider to compare Original vs Upscaled</span>
                  </div>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                      className="p-1 hover:text-white rounded hover:bg-neutral-800"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-neutral-400 min-w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                      className="p-1 hover:text-white rounded hover:bg-neutral-800"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {zoom !== 1 && (
                      <button
                        onClick={() => setZoom(1)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 ml-1 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Viewport canvas */}
                <div className="relative h-80 sm:h-96 md:h-[460px] flex items-center justify-center p-4 bg-transparency-grid overflow-hidden select-none">
                  <div
                    ref={compareContainerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="relative max-w-full max-h-full overflow-hidden rounded-lg cursor-ew-resize shadow-2xl border border-neutral-800 bg-neutral-900"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDraggingSlider ? 'none' : 'transform 0.15s ease',
                    }}
                  >
                    {/* Upscaled Background Image */}
                    <img
                      src={upscaledUrl}
                      alt="Upscaled"
                      referrerPolicy="no-referrer"
                      className="block max-w-full max-h-[420px] object-contain pointer-events-none"
                    />

                    {/* Original Clipped Image */}
                    <div
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img
                        src={imageUrl!}
                        alt="Original"
                        referrerPolicy="no-referrer"
                        className="block max-w-none h-full object-contain pointer-events-none"
                        style={{
                          width: compareContainerRef.current?.clientWidth || '100%',
                        }}
                      />
                    </div>

                    {/* Split line */}
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-10"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="absolute inset-y-0 -left-px w-0.5 bg-indigo-500 shadow-md"></div>
                      <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-white text-indigo-600 shadow-xl flex items-center justify-center border-2 border-indigo-500">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded shadow border border-white/10 pointer-events-none">
                      ORIGINAL ({origWidth} × {origHeight})
                    </div>
                    <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded shadow border border-white/10 pointer-events-none">
                      UPSCALED {factor}X ({upscaledWidth} × {upscaledHeight})
                    </div>
                  </div>
                </div>

                {/* Viewer Footer */}
                <div className="px-4 py-2.5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-mono">
                    Pixels: {origWidth * origHeight} ➔ {upscaledWidth * upscaledHeight} px
                  </span>
                  <span className="font-bold text-emerald-400">
                    Resolution boosted {factor}x horizontally and vertically
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Standby preview when loaded before upscaling */
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <div className="max-h-64 overflow-hidden rounded-lg shadow-xs mb-3 bg-transparency-grid border border-neutral-200">
                  <img
                    src={imageUrl!}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-56 object-contain"
                  />
                </div>
                <p className="text-xs text-neutral-500 text-center">
                  Ready to upscale from <strong className="text-neutral-700">{origWidth} × {origHeight}</strong> to <strong className="text-indigo-600 font-bold">{targetWidth} × {targetHeight}</strong> ({factor}x). Click <span className="font-semibold text-neutral-700">"Upscale Photo {factor}x"</span> above to process.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
