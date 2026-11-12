import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Eraser, 
  Pipette, 
  Download, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeftRight, 
  Sparkles, 
  Paintbrush, 
  Undo2, 
  Redo2, 
  Eye, 
  CheckCircle2, 
  ShieldCheck, 
  SlidersHorizontal,
  Layers,
  Crosshair
} from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes } from '../utils/formatters';

type ToolMode = 'auto' | 'eyedropper' | 'eraser' | 'restore';
type PreviewBg = 'checkerboard' | 'white' | 'dark' | 'green' | 'custom';

interface HistoryState {
  imageData: ImageData;
}

export const TransparentTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);

  // Settings
  const [activeTool, setActiveTool] = useState<ToolMode>('auto');
  const [tolerance, setTolerance] = useState<number>(32); // 0 - 100
  const [feather, setFeather] = useState<number>(2); // 0 - 10 px
  const [contiguousOnly, setContiguousOnly] = useState<boolean>(true);
  const [brushSize, setBrushSize] = useState<number>(28);
  const [previewBg, setPreviewBg] = useState<PreviewBg>('checkerboard');
  const [customBgColor, setCustomBgColor] = useState<string>('#3b82f6');

  // Targeted background color (RGB)
  const [targetColor, setTargetColor] = useState<{ r: number; g: number; b: number } | null>(null);

  // Comparison & Zoom
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(1);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'editor' | 'compare'>('editor');

  // Canvases
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const currentImageDataRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isPaintingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Output
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load image
  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    setOutputUrl(null);
    setOutputBlob(null);
    historyRef.current = [];
    historyIndexRef.current = -1;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOrigWidth(img.naturalWidth);
      setOrigHeight(img.naturalHeight);
      setTimeout(() => initCanvas(img), 50);
    };
    img.src = url;
  };

  // Initialize canvas with loaded image and auto-detect background color
  const initCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    originalImageDataRef.current = new ImageData(
      new Uint8ClampedArray(initialData.data),
      initialData.width,
      initialData.height
    );
    currentImageDataRef.current = initialData;

    // Auto detect corner color
    const d = initialData.data;
    // Sample top-left corner pixel
    const cornerR = d[0];
    const cornerG = d[1];
    const cornerB = d[2];
    setTargetColor({ r: cornerR, g: cornerG, b: cornerB });

    pushHistory(initialData);
    // Automatically apply initial background removal on corner color!
    applyColorRemoval({ r: cornerR, g: cornerG, b: cornerB }, tolerance, contiguousOnly, feather);
  };

  const pushHistory = (data: ImageData) => {
    const copy = new ImageData(
      new Uint8ClampedArray(data.data),
      data.width,
      data.height
    );
    // Discard any forward history if we're branching
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(copy);
    historyIndexRef.current = historyRef.current.length - 1;
    updateOutputBlob();
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prevData = historyRef.current[historyIndexRef.current];
      restoreImageData(prevData);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextData = historyRef.current[historyIndexRef.current];
      restoreImageData(nextData);
    }
  };

  const restoreImageData = (sourceData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const copy = new ImageData(
      new Uint8ClampedArray(sourceData.data),
      sourceData.width,
      sourceData.height
    );
    currentImageDataRef.current = copy;
    ctx.putImageData(copy, 0, 0);
    updateOutputBlob();
  };

  // Color distance formula (Euclidean RGB delta)
  const colorDistance = (
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ) => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // Color Removal (Flood fill or Global with smooth feathering)
  const applyColorRemoval = (
    color: { r: number; g: number; b: number },
    tol: number,
    contiguous: boolean,
    featherPx: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setIsProcessing(true);

    const width = canvas.width;
    const height = canvas.height;
    // Start fresh from original image
    const origData = originalImageDataRef.current.data;
    const outputData = ctx.createImageData(width, height);
    const out = outputData.data;

    // Copy original pixels
    out.set(origData);

    const maxDist = (tol / 100) * 441.67; // max distance between (0,0,0) and (255,255,255) is ~441.67
    const softRange = Math.max(8, featherPx * 6);

    if (!contiguous) {
      // Global removal
      for (let i = 0; i < out.length; i += 4) {
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        const dist = colorDistance(r, g, b, color.r, color.g, color.b);

        if (dist <= maxDist) {
          out[i + 3] = 0; // Fully transparent
        } else if (dist < maxDist + softRange) {
          // Feather boundary smoothly
          const alphaFactor = (dist - maxDist) / softRange;
          out[i + 3] = Math.round(out[i + 3] * alphaFactor);
        }
      }
    } else {
      // Contiguous Flood Fill from image boundaries
      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      // Seed from all four edges (top, bottom, left, right)
      for (let x = 0; x < width; x++) {
        queue.push(x, 0);
        queue.push(x, height - 1);
        visited[0 * width + x] = 1;
        visited[(height - 1) * width + x] = 1;
      }
      for (let y = 1; y < height - 1; y++) {
        queue.push(0, y);
        queue.push(width - 1, y);
        visited[y * width + 0] = 1;
        visited[y * width + (width - 1)] = 1;
      }

      let head = 0;
      while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];
        const idx = (y * width + x) * 4;

        const r = origData[idx];
        const g = origData[idx + 1];
        const b = origData[idx + 2];
        const dist = colorDistance(r, g, b, color.r, color.g, color.b);

        if (dist <= maxDist + softRange) {
          if (dist <= maxDist) {
            out[idx + 3] = 0;
          } else {
            const alphaFactor = (dist - maxDist) / softRange;
            out[idx + 3] = Math.min(out[idx + 3], Math.round(out[idx + 3] * alphaFactor));
          }

          // Check 4-connected neighbors
          const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
          ];

          for (let n = 0; n < neighbors.length; n++) {
            const nx = neighbors[n][0];
            const ny = neighbors[n][1];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nCoord = ny * width + nx;
              if (!visited[nCoord]) {
                visited[nCoord] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }
    }

    ctx.putImageData(outputData, 0, 0);
    currentImageDataRef.current = outputData;
    pushHistory(outputData);
    setIsProcessing(false);
  };

  // Re-apply when tolerance / feather / contiguous change
  const handleSettingsReapply = () => {
    if (targetColor) {
      applyColorRemoval(targetColor, tolerance, contiguousOnly, feather);
    }
  };

  // Update exported blob
  const updateOutputBlob = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        const url = URL.createObjectURL(blob);
        setOutputBlob(blob);
        setOutputUrl(url);
      }
    }, 'image/png');
  };

  // Convert client coordinate to Canvas pixel coordinate
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  // Mouse Handlers for Eyedropper and Eraser/Restore Brush
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeTool === 'eyedropper' || activeTool === 'auto') {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || !originalImageDataRef.current) return;
      const idx = (y * canvas.width + x) * 4;
      const r = originalImageDataRef.current.data[idx];
      const g = originalImageDataRef.current.data[idx + 1];
      const b = originalImageDataRef.current.data[idx + 2];
      const pickedColor = { r, g, b };
      setTargetColor(pickedColor);
      applyColorRemoval(pickedColor, tolerance, contiguousOnly, feather);
    } else if (activeTool === 'eraser' || activeTool === 'restore') {
      isPaintingRef.current = true;
      lastMousePosRef.current = { x, y };
      paintBrush(x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current) return;
    const { x, y } = getCanvasCoords(e);
    paintBrush(x, y);
    lastMousePosRef.current = { x, y };
  };

  const handleCanvasMouseUp = () => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastMousePosRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const curData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          pushHistory(curData);
        }
      }
    }
  };

  // Brush painting (Eraser or Restore)
  const paintBrush = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const curData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = curData.data;
    const origData = originalImageDataRef.current.data;
    const radius = Math.round(brushSize / 2);
    const rSquared = radius * radius;
    const width = canvas.width;
    const height = canvas.height;

    const minX = Math.max(0, x - radius);
    const maxX = Math.min(width - 1, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(height - 1, y + radius);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= rSquared) {
          const idx = (py * width + px) * 4;
          if (activeTool === 'eraser') {
            data[idx + 3] = 0; // erase to transparent
          } else if (activeTool === 'restore') {
            data[idx] = origData[idx];
            data[idx + 1] = origData[idx + 1];
            data[idx + 2] = origData[idx + 2];
            data[idx + 3] = origData[idx + 3];
          }
        }
      }
    }

    ctx.putImageData(curData, 0, 0);
    currentImageDataRef.current = curData;
  };

  // Download transparent PNG
  const handleDownload = () => {
    if (!outputUrl || !file) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    const base = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${base}-transparent.png`;
    a.click();
  };

  // Slider controls for compare mode
  const updateSliderPos = useCallback((clientX: number, container: HTMLElement | null) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
          Make Transparent Background
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Instantly remove backgrounds from photos, graphics, and logos with smart color isolation and manual touch-up tools.
        </p>
      </div>

      {!file ? (
        <div className="space-y-10">
          <DropZone onFilesSelected={handleFiles} />

          {/* Quick Explanatory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">1-Click Auto Removal</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Automatically detects background color from corners and borders to extract your subject cleanly with zero effort.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Pipette className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Color Eyedropper & Threshold</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Click anywhere to select the exact backdrop shade. Adjust tolerance and edge feathering for smooth, artifact-free cutout edges.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Paintbrush className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Precision Brush & Restore</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Erase stray pixels or brush back fine details like hair or logos with unlimited undo/redo history.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Top Bar: File info, mode tabs & download */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                <h2 className="text-base font-bold text-neutral-900 truncate max-w-sm">
                  {file.name}
                </h2>
              </div>
              <div className="text-xs text-neutral-500 font-mono mt-0.5">
                {origWidth} × {origHeight} px · Original: {formatBytes(file.size)}
              </div>
            </div>

            {/* View Mode Toggle (Editor vs Before/After Compare) */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'editor'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Transparent Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'compare'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Before & After Compare</span>
              </button>
            </div>

            {/* Primary Download button & Image reset */}
            <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setImageUrl(null);
                  setOutputUrl(null);
                  setOutputBlob(null);
                }}
                className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Change Image
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!outputUrl}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>
                  Download Transparent PNG {outputBlob && `(${formatBytes(outputBlob.size)})`}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Tool Control Panel */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tool selector buttons */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-neutral-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTool('auto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTool === 'auto'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Detect</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('eyedropper')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTool === 'eyedropper'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>Click to Remove Color</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTool === 'eraser'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Manual Eraser</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('restore')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTool === 'restore'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Restore Brush</span>
                </button>
              </div>

              {/* Undo / Redo buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors shadow-2xs"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors shadow-2xs"
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (originalImageDataRef.current) {
                      restoreImageData(originalImageDataRef.current);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors shadow-2xs"
                  title="Reset to Original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Sub-controls based on active tool */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-neutral-200/80 items-center">
              {/* Tolerance Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                  <span>Color Tolerance:</span>
                  <span className="font-mono font-bold text-violet-600">{tolerance}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="85"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                  onMouseUp={handleSettingsReapply}
                  onTouchEnd={handleSettingsReapply}
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>

              {/* Edge Feathering Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                  <span>Edge Feather (Smooth):</span>
                  <span className="font-mono font-bold text-violet-600">{feather}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={feather}
                  onChange={(e) => setFeather(parseInt(e.target.value, 10))}
                  onMouseUp={handleSettingsReapply}
                  onTouchEnd={handleSettingsReapply}
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>

              {/* Brush Size Slider (for eraser and restore) */}
              {(activeTool === 'eraser' || activeTool === 'restore') && (
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1">
                    <span>Brush Diameter:</span>
                    <span className="font-mono font-bold text-violet-600">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="120"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
              )}

              {/* Flood Fill vs All instances */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={contiguousOnly}
                    onChange={(e) => {
                      setContiguousOnly(e.target.checked);
                      if (targetColor) {
                        applyColorRemoval(targetColor, tolerance, e.target.checked, feather);
                      }
                    }}
                    className="rounded text-violet-600 focus:ring-violet-500 accent-violet-600"
                  />
                  <span>Outer Boundary Only (Keep inside colors)</span>
                </label>
              </div>

              {/* Background Preview Backdrop Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500 mr-1">Preview BG:</span>
                {[
                  { id: 'checkerboard', title: 'Transparent Grid', class: 'bg-transparency-grid' },
                  { id: 'white', title: 'White', class: 'bg-white' },
                  { id: 'dark', title: 'Dark Slate', class: 'bg-slate-900' },
                  { id: 'green', title: 'Green Screen', class: 'bg-emerald-500' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    title={bg.title}
                    onClick={() => setPreviewBg(bg.id as PreviewBg)}
                    className={`w-6 h-6 rounded-md border transition-all ${bg.class} ${
                      previewBg === bg.id
                        ? 'border-violet-600 ring-2 ring-violet-500/40 scale-105'
                        : 'border-neutral-300 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Canvas Working Area */}
          {viewMode === 'editor' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-violet-600" />
                  {activeTool === 'auto' || activeTool === 'eyedropper' ? (
                    <span>Click anywhere on the image to sample and erase that background shade</span>
                  ) : activeTool === 'eraser' ? (
                    <span>Click and drag to manually erase unwanted background pixels</span>
                  ) : (
                    <span>Click and drag to restore erased pixels from original image</span>
                  )}
                </span>

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1 hover:text-neutral-900 rounded hover:bg-neutral-100"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-neutral-600 min-w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    className="p-1 hover:text-neutral-900 rounded hover:bg-neutral-100"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoom !== 1 && (
                    <button
                      onClick={() => setZoom(1)}
                      className="text-xs text-violet-600 hover:underline ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas Container with customizable backing */}
              <div
                className={`relative min-h-[380px] max-h-[580px] rounded-2xl overflow-auto border border-neutral-300 flex items-center justify-center p-6 ${
                  previewBg === 'checkerboard'
                    ? 'bg-transparency-grid'
                    : previewBg === 'white'
                    ? 'bg-white'
                    : previewBg === 'dark'
                    ? 'bg-slate-900'
                    : 'bg-emerald-500'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className={`max-w-full max-h-[520px] object-contain rounded-lg shadow-md transition-transform duration-100 cursor-${
                    activeTool === 'eyedropper' || activeTool === 'auto'
                      ? 'crosshair'
                      : activeTool === 'eraser'
                      ? 'cell'
                      : 'brush'
                  }`}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>
          ) : (
            /* Before & After Split Slider Compare Mode */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                <span>Drag the vertical divider line to compare original vs transparent output</span>
                <span className="font-mono font-medium text-emerald-600">
                  Ready to export transparent PNG
                </span>
              </div>

              <div className="relative h-80 sm:h-[480px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center select-none p-4">
                <div
                  onMouseDown={(e) => {
                    setIsDraggingSlider(true);
                    updateSliderPos(e.clientX, e.currentTarget);
                  }}
                  onMouseMove={(e) => {
                    if (isDraggingSlider) updateSliderPos(e.clientX, e.currentTarget);
                  }}
                  onMouseUp={() => setIsDraggingSlider(false)}
                  onMouseLeave={() => setIsDraggingSlider(false)}
                  className="relative max-w-full max-h-[440px] overflow-hidden rounded-lg cursor-ew-resize bg-transparency-grid shadow-2xl border border-neutral-700"
                >
                  {/* Transparent Result as background */}
                  {outputUrl && (
                    <img
                      src={outputUrl}
                      alt="Transparent Result"
                      referrerPolicy="no-referrer"
                      className="block max-w-full max-h-[440px] object-contain pointer-events-none"
                    />
                  )}

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
                    />
                  </div>

                  {/* Divider line */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute inset-y-0 -left-px w-0.5 bg-violet-500 shadow-md"></div>
                    <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-white text-violet-600 shadow-xl flex items-center justify-center border-2 border-violet-500">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded shadow border border-white/10 pointer-events-none">
                    ORIGINAL
                  </div>
                  <div className="absolute top-3 right-3 bg-violet-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded shadow border border-white/10 pointer-events-none">
                    TRANSPARENT PNG
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tips footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All pixels are processed in RGBA format with 8-bit alpha channels</span>
            </div>
            <span>Use the Eyedropper or Tolerance slider to fine-tune extraction thresholds</span>
          </div>
        </div>
      )}
    </div>
  );
};
