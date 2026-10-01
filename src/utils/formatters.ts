/**
 * Formats a byte number into human readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '-' + formatBytes(Math.abs(bytes), decimals);

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);

  const value = parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm));
  return `${value} ${sizes[safeI]}`;
}

/**
 * Formats compression percentage with a minus or plus sign.
 * E.g., -68% or -12%
 */
export function formatPercentage(percentage: number): string {
  if (percentage === 0) return '0%';
  if (percentage > 0) return `-${Math.round(percentage)}%`;
  return `+${Math.abs(Math.round(percentage))}%`;
}

/**
 * Returns extension from file name or MIME type.
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || '';
  }
  return '';
}

/**
 * Returns clean format label (JPG, PNG, SVG, GIF, WebP).
 */
export function getFormatLabel(mime: string, filename?: string): string {
  if (mime.includes('svg') || filename?.toLowerCase().endsWith('.svg')) return 'SVG';
  if (mime.includes('png') || filename?.toLowerCase().endsWith('.png')) return 'PNG';
  if (mime.includes('jpeg') || mime.includes('jpg') || filename?.toLowerCase().endsWith('.jpg') || filename?.toLowerCase().endsWith('.jpeg')) return 'JPG';
  if (mime.includes('webp') || filename?.toLowerCase().endsWith('.webp')) return 'WebP';
  if (mime.includes('gif') || filename?.toLowerCase().endsWith('.gif')) return 'GIF';
  return mime.split('/')[1]?.toUpperCase() || 'IMG';
}
