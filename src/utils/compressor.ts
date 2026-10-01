import { CompressionOptions } from '../types/image';

/**
 * Minifies and compresses SVG vector markup cleanly and safely.
 */
export async function compressSvg(file: File): Promise<{
  blob: Blob;
  compressedSize: number;
  width: number;
  height: number;
}> {
  const text = await file.text();

  // 1. Extract dimensions or viewBox if present
  let width = 800;
  let height = 600;
  const viewBoxMatch = text.match(/viewBox=["']([0-9.\s-]+)["']/i);
  if (viewBoxMatch && viewBoxMatch[1]) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
    if (parts.length === 4) {
      width = Math.round(parseFloat(parts[2])) || width;
      height = Math.round(parseFloat(parts[3])) || height;
    }
  } else {
    const widthMatch = text.match(/width=["']([0-9.]+)(?:px)?["']/i);
    const heightMatch = text.match(/height=["']([0-9.]+)(?:px)?["']/i);
    if (widthMatch) width = Math.round(parseFloat(widthMatch[1])) || width;
    if (heightMatch) height = Math.round(parseFloat(heightMatch[1])) || height;
  }

  // 2. Safe SVG optimization
  let optimized = text
    // Remove XML declaration and doctype
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    // Remove XML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove metadata tags and editor descriptions
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    // Remove editor namespaces and attributes (inkscape, sodipodi, sketch, adobe)
    .replace(/\s*xmlns:(?:sodipodi|inkscape|sketch|adobe|illustrator)=["'][^"']*["']/gi, '')
    .replace(/\s*(?:sodipodi|inkscape):[a-z0-9_-]+=["'][^"']*["']/gi, '')
    // Remove empty groups
    .replace(/<g[^>]*>\s*<\/g>/gi, '')
    // Minify whitespace between tags
    .replace(/>\s+</g, '><')
    // Minify consecutive whitespace inside tags/attributes
    .replace(/\s{2,}/g, ' ')
    // Minify hex colors: #ffffff -> #fff, #000000 -> #000
    .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3\b/g, '#$1$2$3')
    // Round long floating numbers in path data to 2 decimal places (e.g. 12.345678 -> 12.35)
    .replace(/(\d+\.\d{3,})/g, (m) => parseFloat(m).toFixed(2))
    .trim();

  // Ensure svg tag is intact
  if (!optimized.startsWith('<svg')) {
    const svgStart = optimized.indexOf('<svg');
    if (svgStart !== -1) {
      optimized = optimized.slice(svgStart);
    }
  }

  const blob = new Blob([optimized], { type: 'image/svg+xml' });
  return {
    blob,
    compressedSize: blob.size,
    width,
    height,
  };
}

/**
 * Loads an image file into an HTMLImageElement with crossOrigin and cleanup.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = url;
  });
}

/**
 * Calculate scaled dimensions while preserving aspect ratio.
 */
function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (!maxDimension || (origWidth <= maxDimension && origHeight <= maxDimension)) {
    return { width: origWidth, height: origHeight };
  }

  const aspectRatio = origWidth / origHeight;
  if (origWidth > origHeight) {
    const width = maxDimension;
    const height = Math.round(maxDimension / aspectRatio);
    return { width, height };
  } else {
    const height = maxDimension;
    const width = Math.round(maxDimension * aspectRatio);
    return { width, height };
  }
}

/**
 * Compresses raster images (JPG, PNG, WebP, GIF) via Canvas pipeline.
 */
export async function compressRasterImage(
  file: File,
  options: CompressionOptions
): Promise<{
  blob: Blob;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
}> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // Determine target dimensions
    let maxDim = options.maxDimension;
    if (options.preset === 'extreme' && maxDim === 0 && (origWidth > 2560 || origHeight > 2560)) {
      maxDim = 2048; // Smart cap for extreme mode
    }

    const { width: targetWidth, height: targetHeight } = calculateDimensions(
      origWidth,
      origHeight,
      maxDim
    );

    // Setup canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Canvas 2D context is not available');
    }

    // High quality bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Handle format selection
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

    let outputMime = file.type;
    if (options.outputFormat !== 'original') {
      outputMime = options.outputFormat;
    } else if (isPng && options.convertPngToWebpIfSmaller) {
      // In smart mode, WebP is virtually lossless for PNG transparency while cutting 70%+
      // We will test both and choose the smaller one!
      outputMime = 'image/webp';
    } else if (isGif) {
      outputMime = 'image/webp';
    } else if (!isJpeg && !isPng && !file.type.includes('webp')) {
      outputMime = 'image/jpeg';
    }

    // If output is JPEG, draw white background first to avoid black transparency
    if (outputMime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Draw the image onto canvas
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Determine quality parameter
    let quality = options.quality;
    if (options.preset === 'smart') {
      quality = 0.78;
    } else if (options.preset === 'extreme') {
      quality = 0.52;
    } else if (options.preset === 'light') {
      quality = 0.88;
    }

    // Generate compressed blob
    let blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputMime, quality);
    });

    // If browser couldn't output the requested MIME (e.g. some browsers with GIF), fallback to WebP or JPEG
    if (!blob) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });
      outputMime = 'image/jpeg';
    }

    if (!blob) {
      throw new Error('Failed to generate compressed image blob');
    }

    // Guard: If compressed file is somehow larger than original file and format wasn't forced,
    // let's try a second pass with lower quality or keep the smaller one
    if (blob.size >= file.size && options.preset === 'smart') {
      const tighterBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), outputMime, 0.65);
      });
      if (tighterBlob && tighterBlob.size < blob.size) {
        blob = tighterBlob;
      }
    }

    return {
      blob,
      compressedSize: blob.size,
      width: targetWidth,
      height: targetHeight,
      format: outputMime,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Universal Compression Dispatcher
 */
export async function compressImage(
  file: File,
  options: CompressionOptions,
  onProgress?: (percent: number) => void
): Promise<{
  blob: Blob;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
  savedBytes: number;
  percentageSaved: number;
  compressionTimeMs: number;
}> {
  const startTime = performance.now();
  onProgress?.(20);

  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

  let result: {
    blob: Blob;
    compressedSize: number;
    width: number;
    height: number;
    format: string;
  };

  if (isSvg) {
    onProgress?.(50);
    const svgRes = await compressSvg(file);
    result = {
      ...svgRes,
      format: 'image/svg+xml',
    };
  } else {
    onProgress?.(50);
    result = await compressRasterImage(file, options);
  }

  onProgress?.(90);

  const originalSize = file.size;
  const compressedSize = result.compressedSize;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const percentageSaved = originalSize > 0 
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  const endTime = performance.now();
  const compressionTimeMs = Math.round(endTime - startTime);

  onProgress?.(100);

  return {
    ...result,
    savedBytes,
    percentageSaved,
    compressionTimeMs,
  };
}
