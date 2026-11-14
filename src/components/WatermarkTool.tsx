import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Stamp,
  UploadCloud,
  Image as ImageIcon,
  Type,
  Download,
  FolderDown,
  Grid,
  Plus,
  Trash2,
  Bold,
  Italic,
  RefreshCw,
  ShieldCheck,
  Move,
  Sparkles,
  X,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

type WatermarkType = 'text' | 'image';
type OutputFormat = 'original' | 'image/png' | 'image/jpeg' | 'image/webp';
type PositionPreset =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br'
  | 'custom';

interface BasePhotoItem {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}

interface WatermarkConfig {
  type: WatermarkType;
  // Text settings
  text: string;
  fontFamily: string;
  fontSizePct: number; // % of image shorter/width dimension
  textColor: string;
  isBold: boolean;
  isItalic: boolean;
  textShadow: boolean;
  // Image settings
  wmImageUrl: string | null;
  wmImageName: string | null;
  wmImageWidth: number;
  wmImageHeight: number;
  wmScalePct: number; // % of base image width
  // Placement & Appearance
  opacity: number; // 0.1 to 1.0
  rotation: number; // -180 to 180 degrees
  normX: number; // 0 to 1 center anchor X
  normY: number; // 0 to 1 center anchor Y
  positionPreset: PositionPreset;
  marginPct: number; // 0 to 15%
  tiled: boolean;
  tileDensity: number; // 2 to 6 columns
}

const PRESET_POSITIONS: { id: PositionPreset; label: string; nx: number; ny: number }[] = [
  { id: 'tl', label: 'Top Left', nx: 0, ny: 0 },
  { id: 'tc', label: 'Top Center', nx: 0.5, ny: 0 },
  { id: 'tr', label: 'Top Right', nx: 1, ny: 0 },
  { id: 'ml', label: 'Mid Left', nx: 0, ny: 0.5 },
  { id: 'mc', label: 'Center', nx: 0.5, ny: 0.5 },
  { id: 'mr', label: 'Mid Right', nx: 1, ny: 0.5 },
  { id: 'bl', label: 'Bottom Left', nx: 0, ny: 1 },
  { id: 'bc', label: 'Bottom Center', nx: 0.5, ny: 1 },
  { id: 'br', label: 'Bottom Right', nx: 1, ny: 1 },
];

const COLOR_SWATCHES = ['#ffffff', '#111827', '#e11d48', '#f59e0b', '#2563eb', '#10b981'];

export const WatermarkTool: React.FC = () => {
  const [photos, setPhotos] = useState<BasePhotoItem[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const [config, setConfig] = useState<WatermarkConfig>({
    type: 'text',
    text: '© Imazon',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSizePct: 6,
    textColor: '#ffffff',
    isBold: true,
    isItalic: false,
    textShadow: true,
    wmImageUrl: null,
    wmImageName: null,
    wmImageWidth: 0,
    wmImageHeight: 0,
    wmScalePct: 24,
    opacity: 0.75,
    rotation: 0,
    normX: 0.85,
    normY: 0.88,
    positionPreset: 'br',
    marginPct: 5,
    tiled: false,
    tileDensity: 3,
  });

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('original');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isDraggingBase, setIsDraggingBase] = useState<boolean>(false);
  const [isDraggingWmDrop, setIsDraggingWmDrop] = useState<boolean>(false);

  const baseInputRef = useRef<HTMLInputElement>(null);
  const wmInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedBaseImgRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const loadedWmImgRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const isDraggingOnCanvasRef = useRef<boolean>(false);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) || photos[0] || null;

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      if (config.wmImageUrl) URL.revokeObjectURL(config.wmImageUrl);
    };
  }, []);

  // Load image helper
  const loadHtmlImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  // Handle uploading target photo(s)
  const handleBasePhotosSelected = async (fileList: File[]) => {
    const valid = fileList.filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f.name)
    );
    if (valid.length === 0) return;

    const added: BasePhotoItem[] = [];
    for (const file of valid) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadHtmlImage(url);
        added.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          url,
          width: img.naturalWidth || img.width || 1200,
          height: img.naturalHeight || img.height || 800,
        });
      } catch {
        URL.revokeObjectURL(url);
      }
    }

    if (added.length > 0) {
      setPhotos((prev) => [...prev, ...added]);
      if (!selectedPhotoId) {
        setSelectedPhotoId(added[0].id);
      }
    }
  };

  // Handle uploading watermark image/logo
  const handleWatermarkImageSelected = async (fileList: File[]) => {
    const file = fileList[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      if (config.wmImageUrl) URL.revokeObjectURL(config.wmImageUrl);
      loadedWmImgRef.current = { url, img };
      setConfig((prev) => ({
        ...prev,
        type: 'image',
        wmImageUrl: url,
        wmImageName: file.name,
        wmImageWidth: img.naturalWidth || img.width,
        wmImageHeight: img.naturalHeight || img.height,
      }));
    } catch {
      URL.revokeObjectURL(url);
    }
  };

  const removeWatermarkImage = () => {
    if (config.wmImageUrl) URL.revokeObjectURL(config.wmImageUrl);
    loadedWmImgRef.current = null;
    setConfig((prev) => ({
      ...prev,
      wmImageUrl: null,
      wmImageName: null,
      wmImageWidth: 0,
      wmImageHeight: 0,
    }));
  };

  const removeBasePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const remaining = prev.filter((p) => p.id !== id);
      if (selectedPhotoId === id) {
        setSelectedPhotoId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  const handleClearAllPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setSelectedPhotoId(null);
  };

  // Core rendering function onto any target Canvas 2D context
  const drawWatermarkedImage = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      baseImg: HTMLImageElement,
      width: number,
      height: number,
      wmImg: HTMLImageElement | null,
      cfg: WatermarkConfig
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(baseImg, 0, 0, width, height);

      const hasText = cfg.type === 'text' && cfg.text.trim().length > 0;
      const hasWmImg = cfg.type === 'image' && wmImg !== null;
      if (!hasText && !hasWmImg) return;

      const rad = (cfg.rotation * Math.PI) / 180;

      // Helper to measure watermark box size
      let boxW = 0;
      let boxH = 0;
      const fontPx = Math.max(12, Math.round((width * cfg.fontSizePct) / 100));
      const lines = cfg.text.split('\n');
      const lineHeight = Math.round(fontPx * 1.2);

      if (hasText) {
        ctx.save();
        ctx.font = `${cfg.isItalic ? 'italic ' : ''}${cfg.isBold ? '700 ' : '400 '}${fontPx}px ${cfg.fontFamily}`;
        let maxW = 0;
        for (const line of lines) {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxW) maxW = metrics.width;
        }
        boxW = Math.max(10, maxW);
        boxH = Math.max(fontPx, lines.length * lineHeight);
        ctx.restore();
      } else if (hasWmImg && wmImg) {
        boxW = Math.max(16, (width * cfg.wmScalePct) / 100);
        const ratio = (wmImg.naturalHeight || wmImg.height || 1) / (wmImg.naturalWidth || wmImg.width || 1);
        boxH = boxW * ratio;
      }

      const drawSingleStamp = (cx: number, cy: number) => {
        ctx.save();
        ctx.globalAlpha = cfg.opacity;
        ctx.translate(cx, cy);
        ctx.rotate(rad);

        if (hasText) {
          ctx.font = `${cfg.isItalic ? 'italic ' : ''}${cfg.isBold ? '700 ' : '400 '}${fontPx}px ${cfg.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (cfg.textShadow) {
            ctx.shadowColor = cfg.textColor.toLowerCase() === '#111827'
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(0,0,0,0.55)';
            ctx.shadowBlur = Math.max(4, Math.round(fontPx * 0.18));
            ctx.shadowOffsetX = Math.max(1, Math.round(fontPx * 0.04));
            ctx.shadowOffsetY = Math.max(1, Math.round(fontPx * 0.06));
          }

          ctx.fillStyle = cfg.textColor;
          const totalH = (lines.length - 1) * lineHeight;
          lines.forEach((line, idx) => {
            const offsetY = idx * lineHeight - totalH / 2;
            ctx.fillText(line, 0, offsetY);
          });
        } else if (hasWmImg && wmImg) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(wmImg, -boxW / 2, -boxH / 2, boxW, boxH);
        }

        ctx.restore();
      };

      if (cfg.tiled) {
        // Draw repeatable tiled pattern across canvas
        const cols = Math.max(2, cfg.tileDensity);
        const stepX = width / cols;
        const stepY = Math.max(boxH * 1.8, height / cols);
        for (let row = 0; row * stepY <= height + stepY; row++) {
          const offsetX = row % 2 === 1 ? stepX * 0.5 : 0;
          for (let col = -1; col <= cols + 1; col++) {
            const cx = col * stepX + offsetX;
            const cy = row * stepY + stepY * 0.4;
            drawSingleStamp(cx, cy);
          }
        }
      } else {
        // Compute anchor coordinates accounting for margin when using edge presets
        let cx = cfg.normX * width;
        let cy = cfg.normY * height;

        if (cfg.positionPreset !== 'custom') {
          const preset = PRESET_POSITIONS.find((p) => p.id === cfg.positionPreset);
          if (preset) {
            const marginX = (width * cfg.marginPct) / 100;
            const marginY = (height * cfg.marginPct) / 100;

            if (preset.nx === 0) cx = marginX + boxW / 2;
            else if (preset.nx === 1) cx = width - marginX - boxW / 2;
            else cx = width / 2;

            if (preset.ny === 0) cy = marginY + boxH / 2;
            else if (preset.ny === 1) cy = height - marginY - boxH / 2;
            else cy = height / 2;
          }
        }

        drawSingleStamp(cx, cy);
      }
    },
    []
  );

  // Render live preview whenever photo or config changes
  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !selectedPhoto) return;

      let baseImg: HTMLImageElement;
      if (loadedBaseImgRef.current?.url === selectedPhoto.url) {
        baseImg = loadedBaseImgRef.current.img;
      } else {
        baseImg = await loadHtmlImage(selectedPhoto.url);
        if (cancelled) return;
        loadedBaseImgRef.current = { url: selectedPhoto.url, img: baseImg };
      }

      let wmImg: HTMLImageElement | null = null;
      if (config.type === 'image' && config.wmImageUrl) {
        if (loadedWmImgRef.current?.url === config.wmImageUrl) {
          wmImg = loadedWmImgRef.current.img;
        } else {
          wmImg = await loadHtmlImage(config.wmImageUrl);
          if (cancelled) return;
          loadedWmImgRef.current = { url: config.wmImageUrl, img: wmImg };
        }
      }

      // Scale preview canvas proportionally for fast 60fps interaction (max 1400px)
      const maxPreviewDim = 1400;
      const scale = Math.min(1, maxPreviewDim / Math.max(selectedPhoto.width, selectedPhoto.height));
      const pWidth = Math.max(1, Math.round(selectedPhoto.width * scale));
      const pHeight = Math.max(1, Math.round(selectedPhoto.height * scale));

      if (canvas.width !== pWidth || canvas.height !== pHeight) {
        canvas.width = pWidth;
        canvas.height = pHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawWatermarkedImage(ctx, baseImg, pWidth, pHeight, wmImg, config);
    };

    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedPhoto, config, drawWatermarkedImage]);

  // Drag directly on preview canvas to reposition watermark
  const updatePositionFromPointer = (clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const nx = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    const ny = Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height));
    setConfig((prev) => ({
      ...prev,
      tiled: false,
      positionPreset: 'custom',
      normX: nx,
      normY: ny,
    }));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingOnCanvasRef.current) {
        updatePositionFromPointer(e.clientX, e.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingOnCanvasRef.current && e.touches.length > 0) {
        e.preventDefault();
        updatePositionFromPointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onUp = () => {
      isDraggingOnCanvasRef.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // Full resolution render & export helper
  const renderFullResolutionBlob = async (photo: BasePhotoItem): Promise<{ blob: Blob; ext: string }> => {
    const baseImg = await loadHtmlImage(photo.url);
    let wmImg: HTMLImageElement | null = null;
    if (config.type === 'image' && config.wmImageUrl) {
      wmImg = await loadHtmlImage(config.wmImageUrl);
    }

    const canvas = document.createElement('canvas');
    canvas.width = photo.width;
    canvas.height = photo.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    let mime = outputFormat;
    if (mime === 'original') {
      if (photo.file.type === 'image/png' || photo.file.type === 'image/webp') {
        mime = photo.file.type;
      } else {
        mime = 'image/jpeg';
      }
    }

    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawWatermarkedImage(ctx, baseImg, photo.width, photo.height, wmImg, config);

    const quality = mime === 'image/png' ? undefined : 0.94;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), mime, quality)
    );
    if (!blob) throw new Error('Export failed');

    const ext =
      mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    return { blob, ext };
  };

  // Download single selected photo
  const handleDownloadCurrent = async () => {
    if (!selectedPhoto) return;
    setIsExporting(true);
    try {
      const { blob, ext } = await renderFullResolutionBlob(selectedPhoto);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = selectedPhoto.name.replace(/\.[^/.]+$/, '');
      a.download = `${base}-watermarked.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setIsExporting(false);
    }
  };

  // Download all photos as ZIP
  const handleDownloadAllZip = async () => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const zip = new JSZip();
      const nameCounts: Record<string, number> = {};

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const { blob, ext } = await renderFullResolutionBlob(photo);
        const base = photo.name.replace(/\.[^/.]+$/, '');
        let finalName = `${base}-watermarked.${ext}`;
        if (nameCounts[finalName]) {
          nameCounts[finalName]++;
          finalName = `${base}-watermarked-${nameCounts[finalName]}.${ext}`;
        } else {
          nameCounts[finalName] = 1;
        }
        zip.file(finalName, blob);
        setExportProgress(Math.round(((i + 1) / photos.length) * 80));
      }

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (meta) => setExportProgress(80 + Math.round(meta.percent * 0.2))
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imazon_watermarked_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Generate sample photo for quick testing
  const handleLoadSamplePhoto = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#0e7490');
    grad.addColorStop(1, '#14b8a6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1000);

    // Subtle geometric mountains
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, 1000);
    ctx.lineTo(0, 650);
    ctx.lineTo(420, 420);
    ctx.lineTo(860, 680);
    ctx.lineTo(1280, 380);
    ctx.lineTo(1600, 580);
    ctx.lineTo(1600, 1000);
    ctx.closePath();
    ctx.fill();

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92)
    );
    const sampleFile = new File([blob], 'sample-landscape.jpg', { type: 'image/jpeg' });
    await handleBasePhotosSelected([sampleFile]);
  };

  const hasValidWatermark =
    (config.type === 'text' && config.text.trim().length > 0) ||
    (config.type === 'image' && Boolean(config.wmImageUrl));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hidden File Inputs */}
      <input
        ref={baseInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,.jpg,.jpeg,.png,.webp,.svg,.gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleBasePhotosSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
      <input
        ref={wmInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg,image/gif,.png,.svg,.webp,.jpg,.jpeg,.gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleWatermarkImageSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
          Watermark IMAGE
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Upload the photo(s) you want to protect, then add your own <strong className="text-neutral-700 font-semibold">Watermark Image / Logo</strong> or write custom <strong className="text-neutral-700 font-semibold">Watermark Text</strong>.
        </p>
      </div>

      {/* Main Two-Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (7 cols): Photo Upload & Live Interactive Watermark Canvas */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">
                    Target Photo(s) to Watermark
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    {selectedPhoto
                      ? 'Drag watermark directly on the photo preview to position it'
                      : 'Upload the image(s) where the watermark will be stamped'}
                  </p>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => baseInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllPhotos}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              )}
            </div>

            {!selectedPhoto ? (
              /* Base Photo Upload Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBase(true);
                }}
                onDragLeave={() => setIsDraggingBase(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBase(false);
                  if (e.dataTransfer.files) {
                    handleBasePhotosSelected(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => baseInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
                  isDraggingBase
                    ? 'border-teal-500 bg-teal-50/50 scale-[1.005]'
                    : 'border-neutral-300 hover:border-teal-400 bg-neutral-50/60 hover:bg-neutral-50'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-teal-50/50">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <button
                  type="button"
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-all inline-flex items-center gap-2 mb-3"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Select Photo(s) to Watermark</span>
                </button>

                <p className="text-xs text-neutral-500 mb-4">
                  or drag & drop JPG, PNG, SVG, WebP, or GIF images here
                </p>

                <div className="pt-3 border-t border-neutral-200/80 flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSamplePhoto();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Try with a sample photo</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Watermarked Canvas Preview */
              <div className="space-y-3">
                <div className="relative bg-neutral-900 rounded-2xl border border-neutral-800 p-3 sm:p-5 flex items-center justify-center min-h-[340px] max-h-[560px] overflow-hidden select-none">
                  <canvas
                    ref={previewCanvasRef}
                    onMouseDown={(e) => {
                      isDraggingOnCanvasRef.current = true;
                      updatePositionFromPointer(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length > 0) {
                        isDraggingOnCanvasRef.current = true;
                        updatePositionFromPointer(e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                    className={`max-w-full max-h-[500px] w-auto h-auto object-contain rounded-lg shadow-lg bg-transparency-grid ${
                      config.tiled ? 'cursor-default' : 'cursor-move'
                    }`}
                  />

                  {/* Subtle helper chip */}
                  {!config.tiled && hasValidWatermark && (
                    <div className="absolute bottom-3 left-3 bg-neutral-950/80 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/10 pointer-events-none flex items-center gap-1.5">
                      <Move className="w-3 h-3 text-teal-400" />
                      <span>Click or drag on photo to move watermark</span>
                    </div>
                  )}
                </div>

                {/* Selected Photo Metadata & Multi-Photo Thumbnail Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 px-1">
                  <span className="font-medium text-neutral-700 truncate max-w-xs">
                    {selectedPhoto.name}
                  </span>
                  <span className="font-mono tabular-nums">
                    {selectedPhoto.width} × {selectedPhoto.height} px · {formatBytes(selectedPhoto.file.size)}
                  </span>
                </div>

                {photos.length > 1 && (
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="text-[11px] font-semibold text-neutral-600 mb-2">
                      Uploaded Photos ({photos.length}) — click to preview:
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {photos.map((p) => {
                        const isSel = p.id === selectedPhoto.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPhotoId(p.id)}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer group transition-all ${
                              isSel
                                ? 'border-teal-600 ring-2 ring-teal-500/30'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <img
                              src={p.url}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBasePhoto(p.id);
                              }}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-neutral-900/75 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              title="Remove photo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (5 cols): Watermark Area (Text or Image Upload + Placement & Export) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-5">
            {/* Panel Header */}
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <span className="w-6 h-6 rounded-md bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Your Watermark
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Write watermark text or upload your own watermark image
                </p>
              </div>
            </div>

            {/* Watermark Mode Selector: Text vs Image Upload */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, type: 'text' }))}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  config.type === 'text'
                    ? 'bg-white text-teal-700 shadow-2xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Add Text</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, type: 'image' }))}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  config.type === 'image'
                    ? 'bg-white text-teal-700 shadow-2xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Image</span>
              </button>
            </div>

            {/* Watermark Source Content */}
            {config.type === 'text' ? (
              <div className="space-y-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Watermark Text
                  </label>
                  <textarea
                    rows={2}
                    value={config.text}
                    placeholder="Type your watermark text (e.g. © Your Brand)"
                    onChange={(e) => setConfig((prev) => ({ ...prev, text: e.target.value }))}
                    className="w-full text-sm p-2.5 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 resize-none"
                  />
                </div>

                {/* Font & Style Row */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7">
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Font Style
                    </label>
                    <select
                      value={config.fontFamily}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, fontFamily: e.target.value }))
                      }
                      className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="Plus Jakarta Sans, sans-serif">Modern Sans</option>
                      <option value="Georgia, serif">Editorial Serif</option>
                      <option value="JetBrains Mono, monospace">Monospace</option>
                      <option value="Impact, Arial Black, sans-serif">Heavy Display</option>
                    </select>
                  </div>

                  <div className="col-span-5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, isBold: !prev.isBold }))}
                      className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-colors ${
                        config.isBold
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, isItalic: !prev.isItalic }))}
                      className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-colors ${
                        config.isItalic
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Text Size Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                    <span>Text Size</span>
                    <span className="font-mono font-bold text-teal-700">{config.fontSizePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    step="0.5"
                    value={config.fontSizePct}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, fontSizePct: parseFloat(e.target.value) }))
                    }
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                {/* Color Picker & Shadow */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, textColor: swatch }))}
                        className={`w-6 h-6 rounded-md border transition-transform ${
                          config.textColor.toLowerCase() === swatch
                            ? 'border-teal-600 ring-2 ring-teal-500/40 scale-110'
                            : 'border-neutral-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch }}
                        title={swatch}
                      />
                    ))}
                    <label
                      className="w-6 h-6 rounded-md border border-neutral-300 overflow-hidden cursor-pointer relative"
                      title="Custom Color"
                    >
                      <input
                        type="color"
                        value={config.textColor}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, textColor: e.target.value }))
                        }
                        className="absolute -inset-2 w-10 h-10 cursor-pointer"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.textShadow}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, textShadow: e.target.checked }))
                      }
                      className="rounded accent-teal-600"
                    />
                    <span>Shadow</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Image Watermark Upload Section */
              <div className="space-y-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                {!config.wmImageUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingWmDrop(true);
                    }}
                    onDragLeave={() => setIsDraggingWmDrop(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingWmDrop(false);
                      if (e.dataTransfer.files) {
                        handleWatermarkImageSelected(Array.from(e.dataTransfer.files));
                      }
                    }}
                    onClick={() => wmInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDraggingWmDrop
                        ? 'border-teal-500 bg-teal-50/50'
                        : 'border-neutral-300 hover:border-teal-400 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2.5">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-neutral-800">
                      Upload Your Watermark Image
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      PNG (transparent), SVG, JPG, or WebP logo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-neutral-200">
                      <div className="w-14 h-14 rounded-lg border border-neutral-200 bg-transparency-grid flex items-center justify-center overflow-hidden shrink-0 p-1">
                        <img
                          src={config.wmImageUrl}
                          alt="Watermark logo"
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-neutral-900 truncate">
                          {config.wmImageName}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {config.wmImageWidth} × {config.wmImageHeight} px
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => wmInputRef.current?.click()}
                            className="text-[11px] font-semibold text-teal-700 hover:underline"
                          >
                            Replace
                          </button>
                          <span className="text-neutral-300">·</span>
                          <button
                            type="button"
                            onClick={removeWatermarkImage}
                            className="text-[11px] font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                        <span>Watermark Scale</span>
                        <span className="font-mono font-bold text-teal-700">
                          {config.wmScalePct}% width
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={config.wmScalePct}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            wmScalePct: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Placement & Opacity Controls */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                  Position & Appearance
                </span>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.tiled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tiled: e.target.checked,
                        rotation: e.target.checked && prev.rotation === 0 ? -30 : prev.rotation,
                      }))
                    }
                    className="rounded accent-teal-600"
                  />
                  <Grid className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tile Mosaic</span>
                </label>
              </div>

              {!config.tiled ? (
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* 3x3 Anchor Grid */}
                  <div className="col-span-5">
                    <div className="grid grid-cols-3 gap-1 p-1.5 bg-neutral-100 rounded-xl border border-neutral-200 w-24">
                      {PRESET_POSITIONS.map((pos) => {
                        const isActive = config.positionPreset === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            title={pos.label}
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                positionPreset: pos.id,
                                normX: pos.nx,
                                normY: pos.ny,
                              }))
                            }
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-neutral-200 text-neutral-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-white' : 'bg-neutral-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edge Margin Slider */}
                  <div className="col-span-7 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-neutral-700">
                      <span>Edge Margin</span>
                      <span className="font-mono font-bold text-teal-700">
                        {config.marginPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={config.marginPct}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          marginPct: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <div className="text-[10px] text-neutral-400">
                      {config.positionPreset === 'custom'
                        ? 'Custom dragged position'
                        : 'Click grid or drag on photo'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Mosaic Density Slider */
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                    <span>Mosaic Tile Density</span>
                    <span className="font-mono font-bold text-teal-700">
                      {config.tileDensity}× grid
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={config.tileDensity}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tileDensity: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
              )}

              {/* Opacity & Rotation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                    <span>Opacity</span>
                    <span className="font-mono font-bold text-teal-700">
                      {Math.round(config.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={Math.round(config.opacity * 100)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        opacity: parseInt(e.target.value, 10) / 100,
                      }))
                    }
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                    <span>Rotation</span>
                    <span className="font-mono font-bold text-teal-700">{config.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={config.rotation}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        rotation: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Output Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                  className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="original">Keep Original Format</option>
                  <option value="image/jpeg">JPG (Standard photo)</option>
                  <option value="image/png">PNG (Lossless quality)</option>
                  <option value="image/webp">WebP (Optimized web)</option>
                </select>
              </div>
            </div>

            {/* Download / Apply Action Buttons */}
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <button
                type="button"
                onClick={handleDownloadCurrent}
                disabled={!selectedPhoto || !hasValidWatermark || isExporting}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Watermark...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {photos.length > 1
                        ? 'Download Current Photo'
                        : 'Download Watermarked Image'}
                    </span>
                  </>
                )}
              </button>

              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={!hasValidWatermark || isExporting}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>
                    {isExporting && exportProgress > 0
                      ? `Creating ZIP (${exportProgress}%)...`
                      : `Download All (${photos.length}) as ZIP`}
                  </span>
                </button>
              )}

              {!selectedPhoto && (
                <p className="text-[11px] text-center text-neutral-400">
                  Upload at least one photo on the left to enable download
                </p>
              )}
              {selectedPhoto && !hasValidWatermark && (
                <p className="text-[11px] text-center text-amber-600 font-medium">
                  Enter watermark text or upload a watermark image above
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Trust Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="p-5 rounded-xl bg-white border border-neutral-200">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <Stamp className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Text & Custom Logo Support</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Stamp crisp typography with custom fonts and colors, or upload your transparent PNG/SVG brand logo directly onto your photos.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-neutral-200">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Grid className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Free Drag, 9-Grid & Mosaic</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Position your watermark anywhere by dragging on the preview, snapping to corners, or repeating in a diagonal protective grid.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-neutral-200">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Batch Processing & Privacy</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Stamp multiple photos at once at full native resolution and download them together in a ZIP — 100% locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};
