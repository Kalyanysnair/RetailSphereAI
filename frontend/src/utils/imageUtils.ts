/**
 * Utility functions for parsing and rendering reference images in custom orders.
 * Fixes issues where Base64 data URLs containing commas (e.g. data:image/png;base64,...)
 * were improperly split into fragments causing 404 image errors and incorrect counts.
 */

export function parseReferenceImages(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Split by comma
  const rawParts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  const result: string[] = [];

  let i = 0;
  while (i < rawParts.length) {
    const part = rawParts[i];

    // Case A: Part is a data URL header without its base64 payload (e.g., "data:image/png;base64")
    if (part.startsWith('data:') && !part.includes(';base64,') && i + 1 < rawParts.length) {
      const nextPart = rawParts[i + 1];
      // Verify next part is not a new URL
      if (!nextPart.startsWith('http://') && !nextPart.startsWith('https://') && !nextPart.startsWith('data:')) {
        result.push(`${part},${nextPart}`);
        i += 2;
        continue;
      }
    }

    // Case B: Raw base64 string without data header (e.g. starts with standard image base64 headers)
    if (
      !part.startsWith('data:') &&
      !part.startsWith('http://') &&
      !part.startsWith('https://') &&
      !part.startsWith('/') &&
      !part.startsWith('./')
    ) {
      if (part.startsWith('iVBORw')) {
        result.push(`data:image/png;base64,${part}`);
        i++;
        continue;
      } else if (part.startsWith('/9j/')) {
        result.push(`data:image/jpeg;base64,${part}`);
        i++;
        continue;
      } else if (part.startsWith('R0lGOD')) {
        result.push(`data:image/gif;base64,${part}`);
        i++;
        continue;
      } else if (part.startsWith('UklGR')) {
        result.push(`data:image/webp;base64,${part}`);
        i++;
        continue;
      } else if (part.startsWith('PHN2Zw')) {
        result.push(`data:image/svg+xml;base64,${part}`);
        i++;
        continue;
      }
    }

    result.push(part);
    i++;
  }

  return result.filter(Boolean);
}

/**
 * Safely opens an image URL in a new browser tab.
 * For Base64 data URLs, converts them to a Blob URL (URL.createObjectURL)
 * to bypass browser top-frame navigation security blocks on data URLs.
 */
export function openImageInNewTab(url: string): void {
  if (!url) return;

  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      if (parts.length >= 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) {
          win.focus();
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to open data URL as blob, falling back to direct window.open:', err);
    }
  }

  window.open(url, '_blank');
}

/**
 * Validates if an image string is non-empty and formatted.
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return false;
  const u = url.trim();
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/') || u.startsWith('/') || u.length > 50;
}
