import JSZip from 'jszip';
import { ImageFileItem } from '../types/image';
import { getFileExtension } from './formatters';

/**
 * Download a single compressed image file.
 */
export function downloadSingleFile(item: ImageFileItem) {
  if (!item.compressedBlob) return;

  const url = URL.createObjectURL(item.compressedBlob);
  const a = document.createElement('a');
  a.href = url;

  // Compute filename extension based on compressed MIME type
  let ext = getFileExtension(item.name);
  if (item.compressedFormat === 'image/webp' && ext !== 'webp') {
    ext = 'webp';
  } else if (item.compressedFormat === 'image/jpeg' && ext !== 'jpg' && ext !== 'jpeg') {
    ext = 'jpg';
  } else if (item.compressedFormat === 'image/png' && ext !== 'png') {
    ext = 'png';
  }

  const baseName = item.name.replace(/\.[^/.]+$/, '');
  a.download = `${baseName}-min.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Bundle all compressed images into a single ZIP archive and download it.
 */
export async function downloadAllAsZip(
  items: ImageFileItem[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();
  const validItems = items.filter((item) => item.status === 'done' && item.compressedBlob);

  if (validItems.length === 0) return;

  // Track filenames to avoid duplicates in zip
  const nameCounts: Record<string, number> = {};

  validItems.forEach((item) => {
    let ext = getFileExtension(item.name);
    if (item.compressedFormat === 'image/webp' && ext !== 'webp') {
      ext = 'webp';
    } else if (item.compressedFormat === 'image/jpeg' && ext !== 'jpg' && ext !== 'jpeg') {
      ext = 'jpg';
    }

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    let finalName = `${baseName}-min.${ext}`;

    if (nameCounts[finalName]) {
      nameCounts[finalName]++;
      finalName = `${baseName}-min-${nameCounts[finalName]}.${ext}`;
    } else {
      nameCounts[finalName] = 1;
    }

    if (item.compressedBlob) {
      zip.file(finalName, item.compressedBlob);
    }
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().slice(0, 10);
  a.download = `imazon_compressed_${timestamp}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
