import React, { useState, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  Layers, 
  Trash2, 
  Plus, 
  Download, 
  FolderDown, 
  CheckCircle2, 
  Zap, 
  Sliders, 
  Info,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { ImageFileItem, CompressionOptions, BatchStats } from '../types/image';
import { compressImage } from '../utils/compressor';
import { downloadAllAsZip, downloadSingleFile } from '../utils/zipDownloader';
import { DropZone } from './DropZone';
import { CompressionSettings } from './CompressionSettings';
import { BatchImageList } from './BatchImageList';
import { SummaryBar } from './SummaryBar';
import { ComparisonModal } from './ComparisonModal';
import { formatBytes, formatPercentage } from '../utils/formatters';

interface CompressorAppProps {
  onStateChange?: (hasFiles: boolean, completedCount: number, resetFn: () => void, zipFn: () => void) => void;
}

export const CompressorApp: React.FC<CompressorAppProps> = ({ onStateChange }) => {
  const [items, setItems] = useState<ImageFileItem[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [activeCompareItem, setActiveCompareItem] = useState<ImageFileItem | null>(null);

  const [options, setOptions] = useState<CompressionOptions>({
    preset: 'smart',
    quality: 0.78,
    maxDimension: 0,
    outputFormat: 'original',
    stripMetadata: true,
    convertPngToWebpIfSmaller: true,
  });

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to read image dimensions
  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        resolve({ width: 0, height: 0 });
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  };

  // Add files to batch
  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    const newItems: ImageFileItem[] = [];

    for (const file of newFiles) {
      const { width, height } = await readImageDimensions(file);
      const originalUrl = URL.createObjectURL(file);

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file,
        name: file.name,
        originalSize: file.size,
        originalFormat: file.type || 'image/jpeg',
        originalWidth: width,
        originalHeight: height,
        originalUrl,
        status: 'idle',
        progress: 0,
      });
    }

    setItems((prev) => [...prev, ...newItems]);

    // Automatically trigger compression on the new items for seamless user experience!
    runBatchCompression(newItems);
  }, [options]);

  // Execute batch compression
  const runBatchCompression = async (targetItems?: ImageFileItem[]) => {
    const itemsToProcess = targetItems || items;
    if (itemsToProcess.length === 0) return;

    setIsCompressing(true);

    for (const item of itemsToProcess) {
      // Mark as compressing
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'compressing', progress: 15 } : i))
      );

      try {
        const result = await compressImage(item.file, options, (prog) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: prog } : i))
          );
        });

        const compressedUrl = URL.createObjectURL(result.blob);

        setItems((prev) =>
          prev.map((i) => {
            if (i.id === item.id) {
              return {
                ...i,
                status: 'done',
                progress: 100,
                compressedBlob: result.blob,
                compressedUrl,
                compressedSize: result.compressedSize,
                compressedWidth: result.width,
                compressedHeight: result.height,
                compressedFormat: result.format,
                savedBytes: result.savedBytes,
                percentageSaved: result.percentageSaved,
                compressionTimeMs: result.compressionTimeMs,
              };
            }
            return i;
          })
        );
      } catch (err: any) {
        console.error('Compression error for', item.name, err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  errorMessage: err?.message || 'Compression failed',
                }
              : i
          )
        );
      }
    }

    setIsCompressing(false);
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    const doneItems = items.filter((i) => i.status === 'done');
    if (doneItems.length === 0) return;

    setIsZipping(true);
    setZipProgress(0);

    try {
      await downloadAllAsZip(doneItems, (prog) => setZipProgress(prog));
    } catch (err) {
      console.error('Zip creation error', err);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Compute stats
  const completedItems = items.filter((i) => i.status === 'done');
  const totalOriginalBytes = completedItems.reduce((acc, i) => acc + i.originalSize, 0);
  const totalCompressedBytes = completedItems.reduce(
    (acc, i) => acc + (i.compressedSize || i.originalSize),
    0
  );
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const overallSavedPercentage =
    totalOriginalBytes > 0
      ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
      : 0;

  const handleClearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    setItems([]);
  }, [items]);

  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(
        items.length > 0,
        completedItems.length,
        handleClearAll,
        handleDownloadAllZip
      );
    }
  }, [items.length, completedItems.length, handleClearAll, handleDownloadAllZip, onStateChange]);

  const stats: BatchStats = {
    totalFiles: items.length,
    completedFiles: completedItems.length,
    totalOriginalBytes,
    totalCompressedBytes,
    totalSavedBytes,
    overallSavedPercentage,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hidden file input for adding more files */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Hero Header */}
      <div className="text-center pt-2 pb-1">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
          Compress IMAGE
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
          Compress <strong className="text-neutral-700 font-semibold">JPG, PNG, SVG or GIF</strong> with the best quality and compression ratio. Reduce filesize of multiple images at once.
        </p>
      </div>

      {items.length === 0 ? (
        /* Empty / Initial State */
        <div className="space-y-12">
          <DropZone onFilesSelected={handleFilesSelected} />

          {/* Value Props / Anti-slop clean proof highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Best Quality & Size Ratio</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Smart perceptual compression algorithms remove redundant byte bloat and EXIF data while preserving pixel-perfect visual fidelity.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Batch Processing</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Upload tens of images simultaneously. Process in parallel and download individually or packaged into a single clean ZIP archive.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">100% Private & In-Browser</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Your images never leave your computer. Everything is processed directly in your browser using high-speed client-side rendering.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Active State with Files */
        <div className="space-y-6">
          {/* Summary Banner (when images are processed) */}
          <SummaryBar
            stats={stats}
            onDownloadAllZip={handleDownloadAllZip}
            isZipping={isZipping}
            zipProgress={zipProgress}
            onAddMoreClick={() => hiddenFileInputRef.current?.click()}
          />

          {/* Compression Options Bar */}
          <CompressionSettings
            options={options}
            setOptions={setOptions}
            onStartCompress={() => runBatchCompression()}
            isCompressing={isCompressing}
            fileCount={items.length}
            completedCount={completedItems.length}
          />

          {/* Batch Images List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 px-1">
              <span>Selected Images ({items.length})</span>
              <button
                type="button"
                onClick={() => hiddenFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add more images</span>
              </button>
            </div>

            <BatchImageList
              items={items}
              onRemoveItem={handleRemoveItem}
              onDownloadSingle={downloadSingleFile}
              onOpenCompare={(item) => setActiveCompareItem(item)}
            />
          </div>

          {/* Add more dropzone at the bottom */}
          <div className="pt-2">
            <DropZone onFilesSelected={handleFilesSelected} compact />
          </div>
        </div>
      )}

      {/* Visual Comparison Modal */}
      {activeCompareItem && (
        <ComparisonModal
          item={activeCompareItem}
          onClose={() => setActiveCompareItem(null)}
        />
      )}
    </div>
  );
};
