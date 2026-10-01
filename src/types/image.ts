export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'image/gif';

export type CompressionPreset = 'smart' | 'extreme' | 'light' | 'custom';

export type OutputFormatChoice = 'original' | 'image/jpeg' | 'image/webp' | 'image/png';

export interface CompressionOptions {
  preset: CompressionPreset;
  quality: number; // 0.1 to 1.0 (e.g., 0.78 for smart)
  maxDimension: number; // 0 for original, or e.g., 2560, 1920, 1280
  outputFormat: OutputFormatChoice;
  stripMetadata: boolean;
  convertPngToWebpIfSmaller: boolean;
}

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalFormat: string;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;

  // Compression status
  status: 'idle' | 'compressing' | 'done' | 'error';
  progress: number; // 0 - 100
  errorMessage?: string;

  // Result
  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedSize?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  compressedFormat?: string;
  savedBytes?: number;
  percentageSaved?: number; // e.g. 68 for 68% saved
  compressionTimeMs?: number;

  // Specific per-item settings override (optional)
  customOptions?: Partial<CompressionOptions>;
}

export interface BatchStats {
  totalFiles: number;
  completedFiles: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  overallSavedPercentage: number;
}
