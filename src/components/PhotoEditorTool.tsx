import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2,
  SlidersHorizontal,
  Sparkles,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  PenTool,
  Type,
  Frame,
  Download,
  Undo2,
  Redo2,
  Eye,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Plus,
  Move,
  Check,
} from 'lucide-react';
import { DropZone } from './DropZone';
import { formatBytes } from '../utils/formatters';

type EditorTab = 'adjust' | 'filters' | 'transform' | 'annotate' | 'frame';
type OutputFormat = 'original' | 'image/jpeg' | 'image/png' | 'image/webp';

interface Adjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100
  tint: number; // -100 to 100
  fade: number; // 0 to 100
  vignette: number; // 0 to 100
  blur: number; // 0 to 20
  sharpen: number; // 0 to 100
}

interface FilterPreset {
  id: string;
  name: string;
  adjustments: Partial<Adjustments>;
  grayscale?: number; // 0 to 100
  sepia?: number; // 0 to 100
  hueRotate?: number; // deg
}

interface BrushStroke {
  points: { nx: number; ny: number }[];
  color: string;
  sizePct: number; // % of image width
  opacity: number;
}

interface TextItem {
  id: string;
  text: string;
  nx: number;
  ny: number;
  color: string;
  bgEnabled: boolean;
  bgColor: string;
  sizePct: number; // % of image width
  fontFamily: string;
  bold: boolean;
}

interface EditorState {
  adjustments: Adjustments;
  activeFilterId: string;
  filterIntensity: number; // 0 to 100
  rotation: number; // 0, 90, 180, 270
  straighten: number; // -45 to 45
  flipH: boolean;
  flipV: boolean;
  aspectCrop: string; // 'original' | '1:1' | '16:9' | '4:3' | '4:5' | '9:16'
  strokes: BrushStroke[];
  texts: TextItem[];
  borderWidthPct: number; // 0 to 10
  borderColor: string;
  cornerRadiusPct: number; // 0 to 15
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  tint: 0,
  fade: 0,
  vignette: 0,
  blur: 0,
  sharpen: 0,
};

const INITIAL_EDITOR_STATE: EditorState = {
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  activeFilterId: 'none',
  filterIntensity: 100,
  rotation: 0,
  straighten: 0,
  flipH: false,
  flipV: false,
  aspectCrop: 'original',
  strokes: [],
  texts: [],
  borderWidthPct: 0,
  borderColor: '#ffffff',
  cornerRadiusPct: 0,
};

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', name: 'Original', adjustments: {} },
  {
    id: 'vivid',
    name: 'Vivid',
    adjustments: { contrast: 18, saturation: 35, brightness: 5, sharpen: 20 },
  },
  {
    id: 'golden',
    name: 'Golden',
    adjustments: { warmth: 38, brightness: 8, contrast: 10, saturation: 18 },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    adjustments: { warmth: -36, contrast: 12, brightness: 6, saturation: -8 },
  },
  {
    id: 'bw',
    name: 'B&W',
    grayscale: 100,
    adjustments: { contrast: 22 },
  },
  {
    id: 'noir',
    name: 'Noir',
    grayscale: 100,
    adjustments: { contrast: 45, brightness: -10, vignette: 55 },
  },
  {
    id: 'vintage',
    name: 'Vintage',
    sepia: 42,
    adjustments: { fade: 30, warmth: 20, contrast: -5, vignette: 35 },
  },
  {
    id: 'matte',
    name: 'Matte Film',
    adjustments: { fade: 45, contrast: 8, saturation: -15, warmth: 10 },
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    adjustments: { contrast: 42, saturation: -12, sharpen: 35, vignette: 40 },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    sepia: 85,
    adjustments: { contrast: 12, vignette: 20 },
  },
];

const ASPECT_OPTIONS = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

export const PhotoEditorTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<EditorTab>('adjust');
  const [editorState, setEditorState] = useState<EditorState>(INITIAL_EDITOR_STATE);

  // Undo / Redo History
  const [history, setHistory] = useState<EditorState[]>([INITIAL_EDITOR_STATE]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Compare original hold-to-peek
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Annotate tool sub-mode
  const [brushActive, setBrushActive] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#f43f5e');
  const [brushSizePct, setBrushSizePct] = useState<number>(1.5);
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Export options
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('original');
  const [exportQuality, setExportQuality] = useState<number>(92);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const activeStrokeRef = useRef<BrushStroke | null>(null);
  const draggingTextIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, []);

  const commitState = useCallback(
    (next: EditorState) => {
      setEditorState(next);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIdx + 1);
        const updated = [...sliced, next].slice(-30);
        setHistoryIdx(updated.length - 1);
        return updated;
      });
    },
    [historyIdx]
  );

  const handleUndo = () => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setEditorState(history[nextIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setEditorState(history[nextIdx]);
    }
  };

  const handleResetAll = () => {
    commitState(INITIAL_EDITOR_STATE);
    setSelectedTextId(null);
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    if (imageUrl) URL.revokeObjectURL(imageUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setImageUrl(url);
    setEditorState(INITIAL_EDITOR_STATE);
    setHistory([INITIAL_EDITOR_STATE]);
    setHistoryIdx(0);
    setSelectedTextId(null);
    setBrushActive(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImgRef.current = img;
      setOrigWidth(img.naturalWidth);
      setOrigHeight(img.naturalHeight);
    };
    img.src = url;
  };

  // Compute effective adjustments blending base adjustments + active filter preset
  const getEffectiveStyle = useCallback((state: EditorState) => {
    const preset = FILTER_PRESETS.find((p) => p.id === state.activeFilterId);
    const intensity = state.filterIntensity / 100;

    const adj: Adjustments = { ...state.adjustments };
    let grayscale = 0;
    let sepia = 0;

    if (preset && preset.id !== 'none') {
      if (preset.grayscale) grayscale = preset.grayscale * intensity;
      if (preset.sepia) sepia = preset.sepia * intensity;
      (Object.keys(preset.adjustments) as (keyof Adjustments)[]).forEach((key) => {
        const delta = (preset.adjustments[key] || 0) * intensity;
        adj[key] = adj[key] + delta;
      });
    }

    return { adj, grayscale, sepia };
  }, []);

  // Compute output dimensions based on rotation + aspect crop
  const getOutputDimensions = useCallback(
    (baseW: number, baseH: number, state: EditorState) => {
      const swap = state.rotation === 90 || state.rotation === 270;
      const rotW = swap ? baseH : baseW;
      const rotH = swap ? baseW : baseH;

      const aspectOpt = ASPECT_OPTIONS.find((a) => a.id === state.aspectCrop);
      if (!aspectOpt || aspectOpt.ratio === null) {
        return { width: rotW, height: rotH, rotW, rotH };
      }

      const targetRatio = aspectOpt.ratio;
      const currentRatio = rotW / rotH;
      if (currentRatio > targetRatio) {
        const width = Math.round(rotH * targetRatio);
        return { width, height: rotH, rotW, rotH };
      } else {
        const height = Math.round(rotW / targetRatio);
        return { width: rotW, height, rotW, rotH };
      }
    },
    []
  );

  // Render full pipeline onto target canvas
  const renderPipeline = useCallback(
    (
      canvas: HTMLCanvasElement,
      img: HTMLImageElement,
      state: EditorState,
      maxDimension: number | null,
      peekOriginal: boolean
    ) => {
      const baseW = img.naturalWidth || img.width;
      const baseH = img.naturalHeight || img.height;
      if (!baseW || !baseH) return;

      const dims = getOutputDimensions(baseW, baseH, state);
      const scale =
        maxDimension && Math.max(dims.width, dims.height) > maxDimension
          ? maxDimension / Math.max(dims.width, dims.height)
          : 1;

      const outW = Math.max(1, Math.round(dims.width * scale));
      const outH = Math.max(1, Math.round(dims.height * scale));

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      if (peekOriginal) {
        const origScale =
          maxDimension && Math.max(baseW, baseH) > maxDimension
            ? maxDimension / Math.max(baseW, baseH)
            : 1;
        const origOutW = Math.max(1, Math.round(baseW * origScale));
        const origOutH = Math.max(1, Math.round(baseH * origScale));
        if (canvas.width !== origOutW || canvas.height !== origOutH) {
          canvas.width = origOutW;
          canvas.height = origOutH;
        }
        ctx.clearRect(0, 0, origOutW, origOutH);
        ctx.drawImage(img, 0, 0, origOutW, origOutH);
        return;
      }

      if (canvas.width !== outW || canvas.height !== outH) {
        canvas.width = outW;
        canvas.height = outH;
      }

      ctx.clearRect(0, 0, outW, outH);

      const { adj, grayscale, sepia } = getEffectiveStyle(state);

      // 1. Border & Corner Radius Clipping
      const borderPx = Math.round((outW * state.borderWidthPct) / 100);
      const radiusPx = Math.round((Math.min(outW, outH) * state.cornerRadiusPct) / 200);

      if (borderPx > 0) {
        ctx.fillStyle = state.borderColor;
        if (radiusPx > 0) {
          ctx.beginPath();
          ctx.roundRect(0, 0, outW, outH, radiusPx);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, outW, outH);
        }
      }

      const innerX = borderPx;
      const innerY = borderPx;
      const innerW = Math.max(1, outW - borderPx * 2);
      const innerH = Math.max(1, outH - borderPx * 2);

      ctx.save();
      if (radiusPx > 0) {
        const innerRadius = Math.max(0, radiusPx - borderPx * 0.5);
        ctx.beginPath();
        ctx.roundRect(innerX, innerY, innerW, innerH, innerRadius);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(innerX, innerY, innerW, innerH);
        ctx.clip();
      }

      // 2. CSS-style hardware-accelerated tonal filters
      const brightnessVal = Math.max(0.1, 1 + adj.brightness / 100);
      const contrastVal = Math.max(0.1, 1 + adj.contrast / 100);
      const saturateVal = Math.max(0, 1 + adj.saturation / 100);
      const blurPx = adj.blur * scale;

      ctx.filter = [
        `brightness(${brightnessVal.toFixed(2)})`,
        `contrast(${contrastVal.toFixed(2)})`,
        `saturate(${saturateVal.toFixed(2)})`,
        grayscale > 0 ? `grayscale(${(grayscale / 100).toFixed(2)})` : '',
        sepia > 0 ? `sepia(${(sepia / 100).toFixed(2)})` : '',
        blurPx > 0 ? `blur(${blurPx.toFixed(1)}px)` : '',
      ]
        .filter(Boolean)
        .join(' ');

      // 3. Transform (Rotate + Straighten + Flip + Aspect Fit)
      ctx.save();
      ctx.translate(innerX + innerW / 2, innerY + innerH / 2);

      const totalAngleRad = ((state.rotation + state.straighten) * Math.PI) / 180;
      // Zoom slightly when straightening so rotated corners don't expose blank wedges
      let straightenZoom = 1;
      if (state.straighten !== 0) {
        const rad = (Math.abs(state.straighten) * Math.PI) / 180;
        straightenZoom = Math.cos(rad) + Math.sin(rad) * (Math.max(innerW, innerH) / Math.min(innerW, innerH));
      }

      ctx.scale(
        (state.flipH ? -1 : 1) * straightenZoom,
        (state.flipV ? -1 : 1) * straightenZoom
      );
      ctx.rotate(totalAngleRad);

      // Compute scale to cover inner crop frame after 90° rotation
      const swap = state.rotation === 90 || state.rotation === 270;
      const effBaseW = swap ? baseH : baseW;
      const effBaseH = swap ? baseW : baseH;
      const coverScale = Math.max(innerW / effBaseW, innerH / effBaseH);
      const drawW = baseW * coverScale;
      const drawH = baseH * coverScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      ctx.filter = 'none';

      // 4. Warmth, Tint & Matte Fade Overlays
      if (adj.warmth !== 0) {
        ctx.fillStyle =
          adj.warmth > 0
            ? `rgba(249, 115, 22, ${Math.min(0.35, (adj.warmth / 100) * 0.28)})`
            : `rgba(56, 189, 248, ${Math.min(0.35, (Math.abs(adj.warmth) / 100) * 0.28)})`;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (adj.tint !== 0) {
        ctx.fillStyle =
          adj.tint > 0
            ? `rgba(217, 70, 239, ${Math.min(0.3, (adj.tint / 100) * 0.25)})`
            : `rgba(34, 197, 94, ${Math.min(0.3, (Math.abs(adj.tint) / 100) * 0.25)})`;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (adj.fade > 0) {
        ctx.fillStyle = `rgba(30, 30, 38, ${(adj.fade / 100) * 0.38})`;
        ctx.globalCompositeOperation = 'lighten';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.globalCompositeOperation = 'source-over';
      }

      // 5. Sharpness (3x3 unsharp convolution if sharpen > 0)
      if (adj.sharpen > 0) {
        const imgData = ctx.getImageData(innerX, innerY, innerW, innerH);
        const data = imgData.data;
        const copy = new Uint8ClampedArray(data);
        const strength = (adj.sharpen / 100) * 0.55;

        for (let y = 1; y < innerH - 1; y++) {
          const rowOff = y * innerW;
          for (let x = 1; x < innerW - 1; x++) {
            const idx = (rowOff + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const avg =
                (copy[((y - 1) * innerW + x) * 4 + c] +
                  copy[((y + 1) * innerW + x) * 4 + c] +
                  copy[(rowOff + x - 1) * 4 + c] +
                  copy[(rowOff + x + 1) * 4 + c]) *
                0.25;
              const diff = center - avg;
              if (Math.abs(diff) > 2) {
                data[idx + c] = Math.min(255, Math.max(0, center + diff * strength));
              }
            }
          }
        }
        ctx.putImageData(imgData, innerX, innerY);
      }

      // 6. Vignette
      if (adj.vignette > 0) {
        const cx = innerX + innerW / 2;
        const cy = innerY + innerH / 2;
        const outerR = Math.sqrt(innerW * innerW + innerH * innerH) * 0.55;
        const grad = ctx.createRadialGradient(cx, cy, outerR * 0.32, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${(adj.vignette / 100) * 0.82})`);
        ctx.fillStyle = grad;
        ctx.fillRect(innerX, innerY, innerW, innerH);
      }

      // 7. Freehand Brush Strokes
      const allStrokes = activeStrokeRef.current
        ? [...state.strokes, activeStrokeRef.current]
        : state.strokes;

      allStrokes.forEach((stroke) => {
        if (stroke.points.length === 0) return;
        ctx.save();
        ctx.globalAlpha = stroke.opacity;
        ctx.strokeStyle = stroke.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, (outW * stroke.sizePct) / 100);
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          const px = pt.nx * outW;
          const py = pt.ny * outH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        if (stroke.points.length === 1) {
          const px = stroke.points[0].nx * outW;
          const py = stroke.points[0].ny * outH;
          ctx.lineTo(px + 0.1, py + 0.1);
        }
        ctx.stroke();
        ctx.restore();
      });

      // 8. Text Overlays
      state.texts.forEach((item) => {
        if (!item.text.trim()) return;
        const fontPx = Math.max(12, Math.round((outW * item.sizePct) / 100));
        ctx.save();
        ctx.font = `${item.bold ? '700 ' : '500 '}${fontPx}px ${item.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tx = item.nx * outW;
        const ty = item.ny * outH;
        const lines = item.text.split('\n');
        const lineHeight = fontPx * 1.25;

        if (item.bgEnabled) {
          let maxW = 0;
          lines.forEach((l) => {
            const w = ctx.measureText(l).width;
            if (w > maxW) maxW = w;
          });
          const padX = fontPx * 0.5;
          const padY = fontPx * 0.32;
          const boxW = maxW + padX * 2;
          const boxH = lines.length * lineHeight + padY * 2;
          ctx.fillStyle = item.bgColor;
          ctx.beginPath();
          ctx.roundRect(tx - boxW / 2, ty - boxH / 2, boxW, boxH, fontPx * 0.3);
          ctx.fill();
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.55)';
          ctx.shadowBlur = Math.max(4, fontPx * 0.2);
        }

        ctx.fillStyle = item.color;
        const totalH = (lines.length - 1) * lineHeight;
        lines.forEach((l, idx) => {
          ctx.fillText(l, tx, ty + idx * lineHeight - totalH / 2);
        });
        ctx.restore();
      });

      ctx.restore();
    },
    [getEffectiveStyle, getOutputDimensions]
  );

  // Re-render preview canvas whenever state changes
  const redrawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = sourceImgRef.current;
    if (!canvas || !img) return;
    renderPipeline(canvas, img, editorState, 1200, showOriginal);
  }, [editorState, showOriginal, renderPipeline]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview, origWidth, origHeight]);

  // Adjustment updater helper
  const updateAdjustment = (key: keyof Adjustments, val: number) => {
    setEditorState((prev) => ({
      ...prev,
      adjustments: { ...prev.adjustments, [key]: val },
    }));
  };

  const commitAdjustmentSlider = () => {
    commitState(editorState);
  };

  // Auto Enhance preset calculation
  const handleAutoEnhance = () => {
    commitState({
      ...editorState,
      adjustments: {
        ...editorState.adjustments,
        brightness: 6,
        contrast: 18,
        saturation: 16,
        sharpen: 25,
      },
    });
  };

  // Add Text overlay
  const handleAddText = () => {
    const newId = `txt-${Date.now()}`;
    const newText: TextItem = {
      id: newId,
      text: 'Your Caption',
      nx: 0.5,
      ny: 0.5,
      color: '#ffffff',
      bgEnabled: true,
      bgColor: 'rgba(17, 24, 39, 0.72)',
      sizePct: 6,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      bold: true,
    };
    const next = { ...editorState, texts: [...editorState.texts, newText] };
    commitState(next);
    setSelectedTextId(newId);
    setBrushActive(false);
  };

  const selectedText = editorState.texts.find((t) => t.id === selectedTextId) || null;

  const updateSelectedText = (patch: Partial<TextItem>, commit = false) => {
    if (!selectedTextId) return;
    const nextTexts = editorState.texts.map((t) =>
      t.id === selectedTextId ? { ...t, ...patch } : t
    );
    const next = { ...editorState, texts: nextTexts };
    if (commit) commitState(next);
    else setEditorState(next);
  };

  // Canvas pointer handlers (Brush drawing OR Text dragging)
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { nx: 0.5, ny: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      nx: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      ny: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleCanvasPointerDown = (clientX: number, clientY: number) => {
    const { nx, ny } = getNormalizedCoords(clientX, clientY);

    if (activeTab === 'annotate' && brushActive) {
      activeStrokeRef.current = {
        points: [{ nx, ny }],
        color: brushColor,
        sizePct: brushSizePct,
        opacity: brushOpacity,
      };
      redrawPreview();
      return;
    }

    // Check if clicking near any text item to drag it
    if (editorState.texts.length > 0) {
      let closestId: string | null = null;
      let minDist = 0.14;
      editorState.texts.forEach((t) => {
        const d = Math.hypot(t.nx - nx, t.ny - ny);
        if (d < minDist) {
          minDist = d;
          closestId = t.id;
        }
      });
      if (closestId) {
        setSelectedTextId(closestId);
        draggingTextIdRef.current = closestId;
      }
    }
  };

  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (activeStrokeRef.current) {
        const { nx, ny } = getNormalizedCoords(clientX, clientY);
        activeStrokeRef.current.points.push({ nx, ny });
        redrawPreview();
      } else if (draggingTextIdRef.current) {
        const { nx, ny } = getNormalizedCoords(clientX, clientY);
        const id = draggingTextIdRef.current;
        setEditorState((prev) => ({
          ...prev,
          texts: prev.texts.map((t) => (t.id === id ? { ...t, nx, ny } : t)),
        }));
      }
    };

    const handlePointerUp = () => {
      if (activeStrokeRef.current) {
        const finished = activeStrokeRef.current;
        activeStrokeRef.current = null;
        commitState({
          ...editorState,
          strokes: [...editorState.strokes, finished],
        });
      }
      if (draggingTextIdRef.current) {
        draggingTextIdRef.current = null;
        commitState(editorState);
      }
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if ((activeStrokeRef.current || draggingTextIdRef.current) && e.touches.length > 0) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [editorState, commitState, redrawPreview]);

  // Full-resolution export & download
  const handleDownload = async () => {
    const img = sourceImgRef.current;
    if (!img || !file) return;
    setIsExporting(true);

    try {
      const offscreen = document.createElement('canvas');
      renderPipeline(offscreen, img, editorState, null, false);

      let mime = outputFormat;
      if (mime === 'original') {
        if (file.type === 'image/png' || file.type === 'image/webp') {
          mime = file.type;
        } else {
          mime = 'image/jpeg';
        }
      }

      const quality = mime === 'image/png' ? undefined : exportQuality / 100;
      const blob = await new Promise<Blob | null>((res) =>
        offscreen.toBlob((b) => res(b), mime, quality)
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
        const base = file.name.replace(/\.[^/.]+$/, '');
        a.download = `${base}-edited.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const outDims =
    origWidth > 0 ? getOutputDimensions(origWidth, origHeight, editorState) : { width: 0, height: 0 };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight font-sans">
          Photo Editor
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Adjust light and color, apply curated filters, rotate or straighten, draw, add captions, and frame your photos directly in the browser.
        </p>
      </div>

      {!file ? (
        <div className="space-y-10">
          <DropZone onFilesSelected={handleFiles} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Color, Light & Detail</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Fine-tune brightness, contrast, saturation, warmth, tint, fade, vignette, blur, and edge sharpness in real time.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">1-Click Filters & Transforms</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Apply Vivid, Golden, Arctic, B&W, Noir, or Vintage presets with adjustable intensity, plus straighten, rotate, flip, and aspect framing.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Draw, Captions & Frames</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Sketch with the freehand brush, drag custom text captions anywhere, add rounded borders, and export at full native resolution.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 shadow-sm space-y-5 transition-colors">
          {/* Top Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h2>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                {outDims.width} × {outDims.height} px · Original: {formatBytes(file.size)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Undo / Redo */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIdx <= 0}
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-35 rounded-lg transition-colors"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIdx >= history.length - 1}
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-35 rounded-lg transition-colors"
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Hold to Compare Original */}
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors select-none ${
                  showOriginal
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showOriginal ? 'Showing Original' : 'Hold for Original'}</span>
              </button>

              {/* Reset All */}
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              {/* Change Photo */}
              <button
                type="button"
                onClick={() => {
                  if (imageUrl) URL.revokeObjectURL(imageUrl);
                  setFile(null);
                  setImageUrl(null);
                  sourceImgRef.current = null;
                }}
                className="px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Change Photo
              </button>
            </div>
          </div>

          {/* Main Studio Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Live Interactive Canvas */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
              <div className="relative bg-neutral-950 rounded-2xl border border-neutral-800 p-4 sm:p-6 flex items-center justify-center min-h-[380px] max-h-[600px] overflow-hidden select-none">
                <canvas
                  ref={previewCanvasRef}
                  onMouseDown={(e) => handleCanvasPointerDown(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                      handleCanvasPointerDown(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className={`max-w-full max-h-[540px] w-auto h-auto object-contain rounded-sm shadow-2xl bg-transparency-grid ${
                    activeTab === 'annotate' && brushActive
                      ? 'cursor-crosshair'
                      : editorState.texts.length > 0
                      ? 'cursor-move'
                      : 'cursor-default'
                  }`}
                />

                {showOriginal && (
                  <div className="absolute top-3 left-3 bg-neutral-900/85 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/15 pointer-events-none">
                    ORIGINAL PHOTO
                  </div>
                )}

                {activeTab === 'annotate' && brushActive && (
                  <div className="absolute bottom-3 left-3 bg-purple-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg pointer-events-none flex items-center gap-1.5">
                    <PenTool className="w-3 h-3" />
                    <span>Brush Active — Draw directly on the photo</span>
                  </div>
                )}

                {!brushActive && editorState.texts.length > 0 && (
                  <div className="absolute bottom-3 left-3 bg-neutral-900/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/10 pointer-events-none flex items-center gap-1.5">
                    <Move className="w-3 h-3 text-purple-400" />
                    <span>Drag text caption directly on the photo to reposition</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Tabbed Photo Editing Controls */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              {/* Tool Category Tabs */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                {(
                  [
                    { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
                    { id: 'filters', label: 'Filters', icon: Sparkles },
                    { id: 'transform', label: 'Transform', icon: RotateCw },
                    { id: 'annotate', label: 'Draw/Text', icon: PenTool },
                    { id: 'frame', label: 'Frame', icon: Frame },
                  ] as { id: EditorTab; label: string; icon: any }[]
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isActive
                          ? 'bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-400 shadow-2xs border border-neutral-200/80 dark:border-neutral-700'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      <span className="truncate max-w-full">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tool Panel Content */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[420px] overflow-y-auto">
                {/* 1. ADJUST PANEL */}
                {activeTab === 'adjust' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                        Light & Color
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoEnhance}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 rounded-lg transition-colors"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Auto Enhance</span>
                      </button>
                    </div>

                    {(
                      [
                        { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
                        { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
                        { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                        { key: 'warmth', label: 'Warmth / Temp', min: -100, max: 100 },
                        { key: 'tint', label: 'Tint', min: -100, max: 100 },
                        { key: 'fade', label: 'Matte Fade', min: 0, max: 100 },
                        { key: 'sharpen', label: 'Sharpness', min: 0, max: 100 },
                        { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
                        { key: 'blur', label: 'Blur', min: 0, max: 20 },
                      ] as { key: keyof Adjustments; label: string; min: number; max: number }[]
                    ).map((ctrl) => (
                      <div key={ctrl.key}>
                        <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          <span>{ctrl.label}</span>
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-400 tabular-nums">
                            {editorState.adjustments[ctrl.key] > 0 && ctrl.min < 0 ? '+' : ''}
                            {editorState.adjustments[ctrl.key]}
                            {ctrl.key === 'blur' ? 'px' : ''}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={ctrl.min}
                          max={ctrl.max}
                          value={editorState.adjustments[ctrl.key]}
                          onChange={(e) =>
                            updateAdjustment(ctrl.key, parseInt(e.target.value, 10))
                          }
                          onMouseUp={commitAdjustmentSlider}
                          onTouchEnd={commitAdjustmentSlider}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. FILTERS PANEL */}
                {activeTab === 'filters' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        <span>Filter Intensity</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {editorState.filterIntensity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editorState.filterIntensity}
                        onChange={(e) =>
                          setEditorState((prev) => ({
                            ...prev,
                            filterIntensity: parseInt(e.target.value, 10),
                          }))
                        }
                        onMouseUp={commitAdjustmentSlider}
                        onTouchEnd={commitAdjustmentSlider}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {FILTER_PRESETS.map((preset) => {
                        const isActive = editorState.activeFilterId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              commitState({ ...editorState, activeFilterId: preset.id })
                            }
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                            }`}
                          >
                            <span>{preset.name}</span>
                            {isActive && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. TRANSFORM PANEL */}
                {activeTab === 'transform' && (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide block mb-2">
                        Rotate & Flip
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            commitState({
                              ...editorState,
                              rotation: (editorState.rotation + 270) % 360,
                            })
                          }
                          className="flex flex-col items-center justify-center py-2.5 px-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-[11px] font-semibold text-neutral-700 dark:text-neutral-300"
                        >
                          <RotateCcw className="w-4 h-4 mb-1" />
                          <span>-90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            commitState({
                              ...editorState,
                              rotation: (editorState.rotation + 90) % 360,
                            })
                          }
                          className="flex flex-col items-center justify-center py-2.5 px-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-[11px] font-semibold text-neutral-700 dark:text-neutral-300"
                        >
                          <RotateCw className="w-4 h-4 mb-1" />
                          <span>+90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            commitState({ ...editorState, flipH: !editorState.flipH })
                          }
                          className={`flex flex-col items-center justify-center py-2.5 px-2 border rounded-xl text-[11px] font-semibold transition-colors ${
                            editorState.flipH
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <FlipHorizontal className="w-4 h-4 mb-1" />
                          <span>Flip H</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            commitState({ ...editorState, flipV: !editorState.flipV })
                          }
                          className={`flex flex-col items-center justify-center py-2.5 px-2 border rounded-xl text-[11px] font-semibold transition-colors ${
                            editorState.flipV
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <FlipVertical className="w-4 h-4 mb-1" />
                          <span>Flip V</span>
                        </button>
                      </div>
                    </div>

                    {/* Straighten Angle */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        <span>Straighten Angle</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {editorState.straighten}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={editorState.straighten}
                        onChange={(e) =>
                          setEditorState((prev) => ({
                            ...prev,
                            straighten: parseInt(e.target.value, 10),
                          }))
                        }
                        onMouseUp={commitAdjustmentSlider}
                        onTouchEnd={commitAdjustmentSlider}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Aspect Framing */}
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide block mb-2">
                        Aspect Frame Crop
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ASPECT_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              commitState({ ...editorState, aspectCrop: opt.id })
                            }
                            className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                              editorState.aspectCrop === opt.id
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DRAW & TEXT PANEL */}
                {activeTab === 'annotate' && (
                  <div className="space-y-4">
                    {/* Brush Section */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Freehand Brush</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setBrushActive((b) => !b)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            brushActive
                              ? 'bg-purple-600 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {brushActive ? 'Drawing ON' : 'Enable Brush'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {['#f43f5e', '#ffffff', '#111827', '#f59e0b', '#3b82f6', '#10b981'].map(
                            (c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setBrushColor(c)}
                                className={`w-5 h-5 rounded-full border ${
                                  brushColor === c
                                    ? 'border-purple-600 ring-2 ring-purple-400 scale-110'
                                    : 'border-neutral-300 dark:border-neutral-600'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            )
                          )}
                        </div>
                        {editorState.strokes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => commitState({ ...editorState, strokes: [] })}
                            className="text-[11px] font-medium text-red-600 dark:text-red-400 hover:underline"
                          >
                            Clear Drawings
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400 mb-0.5">
                            <span>Size</span>
                            <span className="font-mono font-semibold">{brushSizePct}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.4"
                            max="6"
                            step="0.2"
                            value={brushSizePct}
                            onChange={(e) => setBrushSizePct(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400 mb-0.5">
                            <span>Opacity</span>
                            <span className="font-mono font-semibold">
                              {Math.round(brushOpacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            value={Math.round(brushOpacity * 100)}
                            onChange={(e) => setBrushOpacity(parseInt(e.target.value, 10) / 100)}
                            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Text Caption Section */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Text Captions</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleAddText}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Text</span>
                        </button>
                      </div>

                      {selectedText ? (
                        <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <input
                            type="text"
                            value={selectedText.text}
                            onChange={(e) => updateSelectedText({ text: e.target.value })}
                            onBlur={() => commitState(editorState)}
                            className="w-full text-xs p-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Write caption..."
                          />

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={selectedText.color}
                                onChange={(e) =>
                                  updateSelectedText({ color: e.target.value }, true)
                                }
                                className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent cursor-pointer"
                                title="Text Color"
                              />
                              <label className="inline-flex items-center gap-1 text-[11px] text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedText.bgEnabled}
                                  onChange={(e) =>
                                    updateSelectedText({ bgEnabled: e.target.checked }, true)
                                  }
                                  className="accent-purple-600"
                                />
                                <span>Pill BG</span>
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const remaining = editorState.texts.filter(
                                  (t) => t.id !== selectedText.id
                                );
                                commitState({ ...editorState, texts: remaining });
                                setSelectedTextId(remaining[0]?.id || null);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400 mb-0.5">
                              <span>Text Size</span>
                              <span className="font-mono font-semibold">
                                {selectedText.sizePct}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="16"
                              step="0.5"
                              value={selectedText.sizePct}
                              onChange={(e) =>
                                updateSelectedText({ sizePct: parseFloat(e.target.value) })
                              }
                              onMouseUp={() => commitState(editorState)}
                              onTouchEnd={() => commitState(editorState)}
                              className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Click "Add Text" to place a draggable caption onto your photo.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. FRAME & BORDER PANEL */}
                {activeTab === 'frame' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        <span>Border Frame Width</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {editorState.borderWidthPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={editorState.borderWidthPct}
                        onChange={(e) =>
                          setEditorState((prev) => ({
                            ...prev,
                            borderWidthPct: parseFloat(e.target.value),
                          }))
                        }
                        onMouseUp={commitAdjustmentSlider}
                        onTouchEnd={commitAdjustmentSlider}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Border Color
                      </span>
                      <div className="flex items-center gap-2">
                        {['#ffffff', '#111827', '#f5f5f4', '#fef3c7', '#ffe4e6'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => commitState({ ...editorState, borderColor: c })}
                            className={`w-7 h-7 rounded-lg border ${
                              editorState.borderColor === c
                                ? 'border-purple-600 ring-2 ring-purple-400 scale-105'
                                : 'border-neutral-300 dark:border-neutral-600'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={editorState.borderColor}
                          onChange={(e) =>
                            commitState({ ...editorState, borderColor: e.target.value })
                          }
                          className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        <span>Corner Roundness</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {editorState.cornerRadiusPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="1"
                        value={editorState.cornerRadiusPct}
                        onChange={(e) =>
                          setEditorState((prev) => ({
                            ...prev,
                            cornerRadiusPct: parseInt(e.target.value, 10),
                          }))
                        }
                        onMouseUp={commitAdjustmentSlider}
                        onTouchEnd={commitAdjustmentSlider}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Export & Download Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Export Format
                    </label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                      className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-800 dark:text-neutral-100"
                    >
                      <option value="original">Original Format</option>
                      <option value="image/jpeg">JPG</option>
                      <option value="image/png">PNG (Lossless)</option>
                      <option value="image/webp">WebP</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      <span>Quality</span>
                      <span className="font-mono text-purple-700 dark:text-purple-400">{exportQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={exportQuality}
                      onChange={(e) => setExportQuality(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600 mt-2.5"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Exporting Full Resolution...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Edited Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
