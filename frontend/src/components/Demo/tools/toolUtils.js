// Small browser-only helpers shared by the demo tools.
// Nothing here talks to the server: files are read, processed and handed back in memory.

export const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

export const savedPercent = (before, after) => (before > 0 ? Math.round((1 - after / before) * 100) : 0);

export const baseName = (name = 'file') => name.replace(/\.[^.]+$/, '') || 'file';

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const readAsArrayBuffer = (file) => file.arrayBuffer();

export const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('This browser could not encode the image.'))), type, quality);
});

// Decodes any browser-supported image with EXIF rotation applied
export const decodeImage = async (blob) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to <img> below (e.g. SVG) */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const sizeOf = (bitmap) => ({
  width: bitmap.width || bitmap.naturalWidth,
  height: bitmap.height || bitmap.naturalHeight
});

// Fit (w, h) inside maxDim on the longest side, never enlarging
export const fitWithin = (w, h, maxDim) => {
  if (!maxDim || (w <= maxDim && h <= maxDim)) return { width: w, height: h };
  const s = maxDim / Math.max(w, h);
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
};

// Draws an image onto a new canvas, optionally resized, rotated and flattened on white
export const drawToCanvas = (source, { width, height, rotate = 0, background = null } = {}) => {
  const src = sizeOf(source);
  const w = width || src.width;
  const h = height || src.height;
  const quarter = ((rotate % 360) + 360) % 360;
  const swap = quarter === 90 || quarter === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((quarter * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return canvas;
};

// Reads the EXIF orientation tag of a JPEG (1 = upright). Returns 1 when unknown.
export const jpegOrientation = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const entries = view.getUint16(ifd, little);
      for (let i = 0; i < entries; i += 1) {
        const e = ifd + 2 + i * 12;
        if (e + 10 > view.byteLength) break;
        if (view.getUint16(e, little) === 0x0112) return view.getUint16(e + 8, little);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00) break;
    offset += 2 + length;
  }
  return 1;
};

export const sniffImageType = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  return 'other';
};

let idSeq = 0;
export const newId = (prefix = 'f') => `${prefix}_${Date.now().toString(36)}_${(idSeq += 1)}`;
