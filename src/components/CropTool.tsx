import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Download,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Maximize2,
  Grid3x3,
} from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes } from '../utils/formatters';

type AspectPresetId = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '4:5' | '9:16';

interface AspectPreset {
  id: AspectPresetId;
  label: string;
  ratio: number | null; // width / height, null for free
}

const ASPECT_PRESETS: AspectPreset[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

type DragHandle =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CropTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [imgHeight, setImgHeight] = useState<number>(0);

  // Transform state (rotation & flips applied before crop)
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Crop rectangle in natural image pixel coordinates (matching transformedUrl)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectPreset, setAspectPreset] = useState<AspectPresetId>('free');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Output options
  const [outputFormat, setOutputFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>('original');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  // Interaction refs
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    handle: DragHandle;
    startClientX: number;
    startClientY: number;
    startCrop: CropRect;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (transformedUrl && transformedUrl !== sourceUrl) URL.revokeObjectURL(transformedUrl);
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    };
  }, []);

  // Build transformed source image whenever rotation / flip changes
  const rebuildTransformedImage = useCallback(
    async (baseUrl: string, rot: number, fh: boolean, fv: boolean) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = baseUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Failed to load image'));
      });

      const swapDims = rot === 90 || rot === 270;
      const outW = swapDims ? img.naturalHeight : img.naturalWidth;
      const outH = swapDims ? img.naturalWidth : img.naturalHeight;

      let nextUrl = baseUrl;
      if (rot !== 0 || fh || fv) {
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(outW / 2, outH / 2);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          nextUrl = canvas.toDataURL('image/png');
        }
      }

      setTransformedUrl((prev) => {
        if (prev && prev !== baseUrl && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return nextUrl;
      });
      setImgWidth(outW);
      setImgHeight(outH);

      // Reset crop box cleanly to 80% centered (or full if small)
      const marginX = Math.round(outW * 0.1);
      const marginY = Math.round(outH * 0.1);
      setCrop({
        x: marginX,
        y: marginY,
        width: Math.max(20, outW - marginX * 2),
        height: Math.max(20, outH - marginY * 2),
      });
      setAspectPreset('free');
      setCroppedBlob(null);
      setCroppedUrl(null);
    },
    []
  );

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setSourceUrl(url);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCroppedBlob(null);
    setCroppedUrl(null);

    await rebuildTransformedImage(url, 0, false, false);
  };

  const handleRotate = async (delta: number) => {
    if (!sourceUrl) return;
    const nextRot = (rotation + delta + 360) % 360;
    setRotation(nextRot);
    await rebuildTransformedImage(sourceUrl, nextRot, flipH, flipV);
  };

  const handleFlip = async (axis: 'h' | 'v') => {
    if (!sourceUrl) return;
    const nextFh = axis === 'h' ? !flipH : flipH;
    const nextFv = axis === 'v' ? !flipV : flipV;
    setFlipH(nextFh);
    setFlipV(nextFv);
    await rebuildTransformedImage(sourceUrl, rotation, nextFh, nextFv);
  };

  const applyAspectPreset = (presetId: AspectPresetId) => {
    setAspectPreset(presetId);
    setCroppedBlob(null);
    setCroppedUrl(null);

    const preset = ASPECT_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.ratio === null || imgWidth === 0 || imgHeight === 0) return;

    const ratio = preset.ratio;
    // Compute largest centered rectangle fitting inside current image at this ratio
    let w = Math.round(imgWidth * 0.85);
    let h = Math.round(w / ratio);

    if (h > imgHeight * 0.85) {
      h = Math.round(imgHeight * 0.85);
      w = Math.round(h * ratio);
    }

    w = Math.max(20, Math.min(imgWidth, w));
    h = Math.max(20, Math.min(imgHeight, h));

    const x = Math.round((imgWidth - w) / 2);
    const y = Math.round((imgHeight - h) / 2);

    setCrop({ x, y, width: w, height: h });
  };

  const resetCropToFull = () => {
    if (!imgWidth || !imgHeight) return;
    setAspectPreset('free');
    setCrop({ x: 0, y: 0, width: imgWidth, height: imgHeight });
    setCroppedBlob(null);
    setCroppedUrl(null);
  };

  const activeRatio = ASPECT_PRESETS.find((p) => p.id === aspectPreset)?.ratio ?? null;

  // Pointer drag start on crop box or handle
  const startDrag = (handle: DragHandle, clientX: number, clientY: number) => {
    const imgEl = imgElementRef.current;
    if (!imgEl || !imgWidth || !imgHeight) return;
    const rect = imgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    dragStateRef.current = {
      handle,
      startClientX: clientX,
      startClientY: clientY,
      startCrop: { ...crop },
      scaleX: imgWidth / rect.width,
      scaleY: imgHeight / rect.height,
    };
  };

  useEffect(() => {
    const MIN_SIZE = 24;

    const handleMove = (clientX: number, clientY: number) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      const dx = Math.round((clientX - ds.startClientX) * ds.scaleX);
      const dy = Math.round((clientY - ds.startClientY) * ds.scaleY);
      const s = ds.startCrop;

      if (ds.handle === 'move') {
        const nextX = Math.max(0, Math.min(imgWidth - s.width, s.x + dx));
        const nextY = Math.max(0, Math.min(imgHeight - s.height, s.y + dy));
        setCrop({ ...s, x: nextX, y: nextY });
        return;
      }

      let left = s.x;
      let top = s.y;
      let right = s.x + s.width;
      let bottom = s.y + s.height;

      const movesWest = ds.handle.includes('w');
      const movesEast = ds.handle.includes('e');
      const movesNorth = ds.handle.includes('n');
      const movesSouth = ds.handle.includes('s');

      if (movesWest) left = Math.max(0, Math.min(right - MIN_SIZE, s.x + dx));
      if (movesEast) right = Math.min(imgWidth, Math.max(left + MIN_SIZE, s.x + s.width + dx));
      if (movesNorth) top = Math.max(0, Math.min(bottom - MIN_SIZE, s.y + dy));
      if (movesSouth) bottom = Math.min(imgHeight, Math.max(top + MIN_SIZE, s.y + s.height + dy));

      let newW = right - left;
      let newH = bottom - top;

      // Enforce aspect ratio lock if active
      if (activeRatio !== null) {
        if (ds.handle === 'n' || ds.handle === 's') {
          newW = Math.round(newH * activeRatio);
          if (left + newW > imgWidth) {
            newW = imgWidth - left;
            newH = Math.round(newW / activeRatio);
          }
          if (movesNorth) top = bottom - newH;
        } else {
          newH = Math.round(newW / activeRatio);
          if (movesNorth) {
            if (bottom - newH < 0) {
              newH = bottom;
              newW = Math.round(newH * activeRatio);
              if (movesWest) left = right - newW;
            }
            top = bottom - newH;
          } else {
            if (top + newH > imgHeight) {
              newH = imgHeight - top;
              newW = Math.round(newH * activeRatio);
              if (movesWest) left = right - newW;
            }
          }
        }

        // Guard minimum size under locked ratio
        if (newW < MIN_SIZE || newH < MIN_SIZE) return;
      }

      setCrop({
        x: Math.max(0, Math.round(left)),
        y: Math.max(0, Math.round(top)),
        width: Math.max(MIN_SIZE, Math.round(newW)),
        height: Math.max(MIN_SIZE, Math.round(newH)),
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dragStateRef.current && e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [imgWidth, imgHeight, activeRatio]);

  // Manual coordinate input updates
  const updateCropField = (field: keyof CropRect, rawVal: number) => {
    if (!imgWidth || !imgHeight) return;
    const val = Math.max(0, Math.round(rawVal || 0));
    setCroppedBlob(null);
    setCroppedUrl(null);

    setCrop((prev) => {
      const next = { ...prev };
      if (field === 'x') {
        next.x = Math.min(val, imgWidth - prev.width);
      } else if (field === 'y') {
        next.y = Math.min(val, imgHeight - prev.height);
      } else if (field === 'width') {
        const clampedW = Math.max(20, Math.min(val, imgWidth - prev.x));
        next.width = clampedW;
        if (activeRatio !== null) {
          const targetH = Math.round(clampedW / activeRatio);
          next.height = Math.max(20, Math.min(targetH, imgHeight - prev.y));
        }
      } else if (field === 'height') {
        const clampedH = Math.max(20, Math.min(val, imgHeight - prev.y));
        next.height = clampedH;
        if (activeRatio !== null) {
          const targetW = Math.round(clampedH * activeRatio);
          next.width = Math.max(20, Math.min(targetW, imgWidth - prev.x));
        }
      }
      return next;
    });
  };

  // Execute crop on offscreen canvas
  const executeCrop = async () => {
    if (!transformedUrl || crop.width <= 0 || crop.height <= 0) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = transformedUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Failed to load image for crop'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');

      let targetMime = outputFormat;
      if (targetMime === 'original') {
        if (file?.type === 'image/png' || file?.type === 'image/webp') {
          targetMime = file.type;
        } else {
          targetMime = 'image/jpeg';
        }
      }

      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      const quality = targetMime === 'image/png' ? undefined : 0.94;
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), targetMime, quality)
      );

      if (blob) {
        if (croppedUrl) URL.revokeObjectURL(croppedUrl);
        setCroppedBlob(blob);
        setCroppedUrl(URL.createObjectURL(blob));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCropped = () => {
    if (!croppedUrl || !croppedBlob || !file) return;
    const a = document.createElement('a');
    a.href = croppedUrl;
    const ext =
      croppedBlob.type === 'image/png'
        ? 'png'
        : croppedBlob.type === 'image/webp'
        ? 'webp'
        : 'jpg';
    const base = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${base}_cropped_${crop.width}x${crop.height}.${ext}`;
    a.click();
  };

  // Compute percentage coordinates for overlay rendering
  const leftPct = imgWidth > 0 ? (crop.x / imgWidth) * 100 : 0;
  const topPct = imgHeight > 0 ? (crop.y / imgHeight) * 100 : 0;
  const widthPct = imgWidth > 0 ? (crop.width / imgWidth) * 100 : 100;
  const heightPct = imgHeight > 0 ? (crop.height / imgHeight) * 100 : 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
          Crop IMAGE
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Crop <strong className="text-neutral-700 font-semibold">JPG, PNG, SVG, GIF or WebP</strong> by dragging the interactive frame, choosing aspect ratios, or defining exact pixel coordinates.
        </p>
      </div>

      {!file ? (
        <div className="space-y-10">
          <DropZone onFilesSelected={handleFiles} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Crop className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Interactive Free & Ratio Crop</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Drag any corner or edge handle to frame your subject, or lock to 1:1, 16:9, 4:3, 4:5, or 9:16 social ratios.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Maximize2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Rotate, Flip & Pixel Precision</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Rotate 90° or flip horizontally/vertically before cropping, and fine-tune X, Y, width, and height down to the pixel.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">100% Private In-Browser</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Your photos are cropped locally using hardware-accelerated Canvas rendering without leaving your device.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-sm space-y-6">
          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 truncate max-w-md">
                {file.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-0.5 font-mono">
                <span>
                  Canvas: {imgWidth} × {imgHeight} px
                </span>
                <span aria-hidden="true">·</span>
                <span>Original size: {formatBytes(file.size)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  showGrid
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>Rule of Thirds</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
                  if (croppedUrl) URL.revokeObjectURL(croppedUrl);
                  setFile(null);
                  setSourceUrl(null);
                  setTransformedUrl(null);
                  setCroppedBlob(null);
                  setCroppedUrl(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Change Image
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left / Center: Interactive Crop Workspace */}
            <div className="lg:col-span-8 space-y-3">
              {/* Transform Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRotate(-90)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Rotate 90° Left"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rotate Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate(90)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Rotate 90° Right"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rotate Right</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlip('h')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                      flipH
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flip H</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlip('v')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                      flipV
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flip V</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetCropToFull}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  Select Full Image
                </button>
              </div>

              {/* Interactive Canvas Surface */}
              <div className="relative bg-neutral-900 rounded-2xl border border-neutral-800 p-4 sm:p-6 flex items-center justify-center min-h-[360px] select-none overflow-hidden">
                {transformedUrl && (
                  <div className="relative inline-block max-w-full">
                    <img
                      ref={imgElementRef}
                      src={transformedUrl}
                      alt="Crop workspace"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="block max-w-full max-h-[520px] w-auto h-auto object-contain select-none pointer-events-none"
                    />

                    {/* Dimmed outside overlays (Top, Bottom, Left, Right) */}
                    <div
                      className="absolute left-0 right-0 top-0 bg-black/60 pointer-events-none"
                      style={{ height: `${topPct}%` }}
                    />
                    <div
                      className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none"
                      style={{ height: `${Math.max(0, 100 - (topPct + heightPct))}%` }}
                    />
                    <div
                      className="absolute left-0 bg-black/60 pointer-events-none"
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        width: `${leftPct}%`,
                      }}
                    />
                    <div
                      className="absolute right-0 bg-black/60 pointer-events-none"
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        width: `${Math.max(0, 100 - (leftPct + widthPct))}%`,
                      }}
                    />

                    {/* Active Interactive Crop Box */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        startDrag('move', e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        if (e.touches.length > 0) {
                          e.stopPropagation();
                          startDrag('move', e.touches[0].clientX, e.touches[0].clientY);
                        }
                      }}
                      className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] cursor-move touch-none"
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                    >
                      {/* Rule of Thirds Grid */}
                      {showGrid && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                        </div>
                      )}

                      {/* Live Dimension Badge */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-950/85 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded whitespace-nowrap pointer-events-none border border-white/15">
                        {crop.width} × {crop.height} px
                      </div>

                      {/* 4 Corner Handles */}
                      {(
                        [
                          { id: 'nw', cls: '-top-2 -left-2 cursor-nwse-resize' },
                          { id: 'ne', cls: '-top-2 -right-2 cursor-nesw-resize' },
                          { id: 'sw', cls: '-bottom-2 -left-2 cursor-nesw-resize' },
                          { id: 'se', cls: '-bottom-2 -right-2 cursor-nwse-resize' },
                        ] as { id: DragHandle; cls: string }[]
                      ).map((h) => (
                        <div
                          key={h.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            startDrag(h.id, e.clientX, e.clientY);
                          }}
                          onTouchStart={(e) => {
                            if (e.touches.length > 0) {
                              e.stopPropagation();
                              startDrag(h.id, e.touches[0].clientX, e.touches[0].clientY);
                            }
                          }}
                          className={`absolute w-4 h-4 bg-amber-500 border-2 border-white rounded-xs shadow-md touch-none ${h.cls}`}
                        />
                      ))}

                      {/* 4 Edge Midpoint Handles */}
                      {(
                        [
                          { id: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 cursor-ns-resize' },
                          { id: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 cursor-ns-resize' },
                          { id: 'w', cls: '-left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-6 cursor-ew-resize' },
                          { id: 'e', cls: '-right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-6 cursor-ew-resize' },
                        ] as { id: DragHandle; cls: string }[]
                      ).map((h) => (
                        <div
                          key={h.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            startDrag(h.id, e.clientX, e.clientY);
                          }}
                          onTouchStart={(e) => {
                            if (e.touches.length > 0) {
                              e.stopPropagation();
                              startDrag(h.id, e.touches[0].clientX, e.touches[0].clientY);
                            }
                          }}
                          className={`absolute bg-white border border-neutral-800 rounded-xs shadow-sm touch-none ${h.cls}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-500 flex items-center justify-between px-1">
                <span>Drag inside frame to reposition · Drag corner or edge handles to resize</span>
                <span className="font-mono text-neutral-600">
                  Selection: {crop.width} × {crop.height}
                </span>
              </div>
            </div>

            {/* Right: Crop Settings, Coordinates & Result */}
            <div className="lg:col-span-4 space-y-5">
              {/* Aspect Ratio Presets */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                    Aspect Ratio
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {aspectPreset === 'free' ? 'Unlocked' : `Locked (${aspectPreset})`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyAspectPreset(preset.id)}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${
                        aspectPreset === preset.id
                          ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Pixel Coordinates */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide block">
                  Crop Coordinates (px)
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={imgWidth}
                      value={crop.width || ''}
                      onChange={(e) => updateCropField('width', parseInt(e.target.value, 10))}
                      className="w-full text-xs font-mono p-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={imgHeight}
                      value={crop.height || ''}
                      onChange={(e) => updateCropField('height', parseInt(e.target.value, 10))}
                      className="w-full text-xs font-mono p-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Position X
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, imgWidth - crop.width)}
                      value={crop.x}
                      onChange={(e) => updateCropField('x', parseInt(e.target.value, 10))}
                      className="w-full text-xs font-mono p-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Position Y
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, imgHeight - crop.height)}
                      value={crop.y}
                      onChange={(e) => updateCropField('y', parseInt(e.target.value, 10))}
                      className="w-full text-xs font-mono p-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Output Format */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wide block">
                  Output Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => {
                    setOutputFormat(e.target.value as any);
                    setCroppedBlob(null);
                    setCroppedUrl(null);
                  }}
                  className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="original">Keep Original Format</option>
                  <option value="image/jpeg">JPG (Standard photo)</option>
                  <option value="image/png">PNG (Lossless / Transparent)</option>
                  <option value="image/webp">WebP (Modern web)</option>
                </select>
              </div>

              {/* Crop Trigger & Result Card */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={executeCrop}
                  disabled={isProcessing || crop.width < 1 || crop.height < 1}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] disabled:bg-neutral-300 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cropping...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="w-4 h-4" />
                      <span>Crop IMAGE ({crop.width} × {crop.height})</span>
                    </>
                  )}
                </button>

                {croppedUrl && croppedBlob && (
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Cropped Result Ready
                      </span>
                      <span className="font-mono text-emerald-700 font-semibold">
                        {formatBytes(croppedBlob.size)}
                      </span>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-emerald-200/80 bg-transparency-grid flex items-center justify-center p-2 max-h-40">
                      <img
                        src={croppedUrl}
                        alt="Cropped result preview"
                        referrerPolicy="no-referrer"
                        className="max-h-36 object-contain"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={downloadCropped}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Cropped Image</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
