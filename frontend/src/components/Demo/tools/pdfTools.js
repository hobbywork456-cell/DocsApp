// In-browser PDF building and compression (pdf-lib + pdf.js). No uploads, no server.
import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFDict, PDFArray, PDFRef } from 'pdf-lib';
import { inflate } from 'pako';
import {
  decodeImage, drawToCanvas, canvasToBlob, fitWithin, sizeOf, jpegOrientation, sniffImageType
} from './toolUtils';

const MM = 72 / 25.4; // points per millimetre
export const PAGE_SIZES = {
  a4: { label: 'A4', w: 210 * MM, h: 297 * MM },
  letter: { label: 'US Letter', w: 8.5 * 72, h: 11 * 72 },
  fit: { label: 'Fit to image' }
};

/* ───────────────────────── Image → PDF ───────────────────────── */

// Returns bytes pdf-lib can embed as-is when possible (keeps original quality),
// otherwise re-encodes through a canvas (rotation, EXIF orientation, WebP/GIF/BMP…).
const prepareImage = async (item) => {
  const bytes = new Uint8Array(await item.file.arrayBuffer());
  const kind = sniffImageType(bytes);
  const rotate = item.rotate || 0;
  if (!rotate && kind === 'png') return { kind: 'png', bytes };
  if (!rotate && kind === 'jpeg' && jpegOrientation(bytes) === 1) return { kind: 'jpeg', bytes };

  const bitmap = await decodeImage(item.file);
  const canvas = drawToCanvas(bitmap, { rotate, background: kind === 'png' ? null : '#ffffff' });
  if (bitmap.close) bitmap.close();
  const usePng = kind === 'png' || item.file.type === 'image/gif';
  const blob = await canvasToBlob(canvas, usePng ? 'image/png' : 'image/jpeg', 0.92);
  return { kind: usePng ? 'png' : 'jpeg', bytes: new Uint8Array(await blob.arrayBuffer()) };
};

/**
 * items: [{ file, rotate }]
 * options: { pageSize: 'a4'|'letter'|'fit', orientation: 'auto'|'portrait'|'landscape', marginMm, title }
 */
export async function imagesToPdf(items, { pageSize = 'a4', orientation = 'auto', marginMm = 10, title = 'Images', onProgress } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer('DocsApp');
  pdf.setCreator('DocsApp image to PDF');

  for (let i = 0; i < items.length; i += 1) {
    onProgress?.(i, items.length);
    const { kind, bytes } = await prepareImage(items[i]);
    const img = kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const iw = img.width;
    const ih = img.height;

    if (pageSize === 'fit') {
      // Page matches the image (at 96 dpi), plus the margin
      const m = marginMm * MM;
      const w = iw * 0.75;
      const h = ih * 0.75;
      const page = pdf.addPage([w + m * 2, h + m * 2]);
      page.drawImage(img, { x: m, y: m, width: w, height: h });
      continue;
    }

    const base = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
    const landscape = orientation === 'landscape' || (orientation === 'auto' && iw > ih);
    const pw = landscape ? base.h : base.w;
    const ph = landscape ? base.w : base.h;
    const page = pdf.addPage([pw, ph]);
    const m = marginMm * MM;
    const boxW = pw - m * 2;
    const boxH = ph - m * 2;
    const s = Math.min(boxW / iw, boxH / ih, 1.5); // don't blow tiny images up too far
    const w = iw * s;
    const h = ih * s;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  onProgress?.(items.length, items.length);
  const out = await pdf.save({ useObjectStreams: true });
  return new Blob([out], { type: 'application/pdf' });
}

/* ───────────────────────── PDF compression ───────────────────────── */

export const COMPRESSION_LEVELS = {
  light: { label: 'Light', note: 'Best quality. Text stays sharp and selectable.', quality: 0.82, maxDim: 2400, minBytes: 60 * 1024 },
  balanced: { label: 'Balanced', note: 'Good quality, noticeably smaller. Text stays sharp and selectable.', quality: 0.68, maxDim: 1700, minBytes: 30 * 1024 },
  maximum: { label: 'Maximum', note: 'Smallest file. Each page becomes an image, so text can no longer be selected.', dpi: 110, quality: 0.6 }
};

const nameOf = (obj) => (obj instanceof PDFName ? obj.asString() : null);
const numOf = (obj) => (obj instanceof PDFNumber ? obj.asNumber() : null);

const filtersOf = (dict) => {
  const f = dict.get(PDFName.of('Filter'));
  if (!f) return [];
  if (f instanceof PDFName) return [f.asString()];
  if (f instanceof PDFArray) return f.asArray().map(nameOf).filter(Boolean);
  return ['?'];
};

// Colour space components we can safely re-encode as RGB/gray JPEG, else null
const componentsOf = (ctx, dict) => {
  let cs = dict.get(PDFName.of('ColorSpace'));
  if (cs instanceof PDFRef) cs = ctx.lookup(cs);
  const n = nameOf(cs);
  if (n === '/DeviceRGB' || n === '/CalRGB') return 3;
  if (n === '/DeviceGray' || n === '/CalGray') return 1;
  if (cs instanceof PDFArray) {
    const kind = nameOf(cs.get(0));
    if (kind === '/ICCBased') {
      const profile = ctx.lookup(cs.get(1));
      const comps = profile && profile.dict ? numOf(profile.dict.get(PDFName.of('N'))) : null;
      return comps === 3 || comps === 1 ? comps : null;
    }
    if (kind === '/CalRGB') return 3;
    if (kind === '/CalGray') return 1;
  }
  return null;
};

// Reverses PNG predictors (Predictor >= 10) used by many FlateDecode images
const unpredict = (data, columns, colors, bpc) => {
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLen = Math.ceil((columns * colors * bpc) / 8);
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  let prev = new Uint8Array(rowLen);
  for (let r = 0; r < rows; r += 1) {
    const type = data[r * (rowLen + 1)];
    const line = data.subarray(r * (rowLen + 1) + 1, (r + 1) * (rowLen + 1));
    const cur = out.subarray(r * rowLen, (r + 1) * rowLen);
    for (let i = 0; i < rowLen; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (type === 1) v += a;
      else if (type === 2) v += b;
      else if (type === 3) v += (a + b) >> 1;
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    prev = cur;
  }
  return out;
};

// Turns an image XObject into a canvas, or null when it isn't a safe candidate
const imageStreamToCanvas = async (ctx, stream) => {
  const dict = stream.dict;
  if (dict.get(PDFName.of('ImageMask'))) return null;
  if (dict.get(PDFName.of('Mask'))) return null; // colour-key or stencil masks
  if (dict.get(PDFName.of('Decode'))) return null;
  const filters = filtersOf(dict);
  const comps = componentsOf(ctx, dict);
  if (!comps) return null;
  const width = numOf(dict.get(PDFName.of('Width')));
  const height = numOf(dict.get(PDFName.of('Height')));
  if (!width || !height) return null;
  const bytes = stream.getContents();

  if (filters.length === 1 && filters[0] === '/DCTDecode') {
    const bmp = await decodeImage(new Blob([bytes], { type: 'image/jpeg' }));
    const c = drawToCanvas(bmp, { background: '#ffffff' });
    if (bmp.close) bmp.close();
    return { canvas: c, original: bytes.length };
  }

  if (filters.length === 1 && filters[0] === '/FlateDecode') {
    const bpc = numOf(dict.get(PDFName.of('BitsPerComponent')));
    if (bpc !== 8) return null;
    let raw = inflate(bytes);
    let parms = dict.get(PDFName.of('DecodeParms'));
    if (parms instanceof PDFArray) parms = parms.get(0);
    if (parms instanceof PDFRef) parms = ctx.lookup(parms);
    if (parms instanceof PDFDict) {
      const predictor = numOf(parms.get(PDFName.of('Predictor'))) || 1;
      if (predictor >= 10) raw = unpredict(raw, numOf(parms.get(PDFName.of('Columns'))) || width, numOf(parms.get(PDFName.of('Colors'))) || comps, 8);
      else if (predictor !== 1) return null;
    }
    if (raw.length < width * height * comps) return null;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const g = c.getContext('2d');
    const img = g.createImageData(width, height);
    const px = img.data;
    for (let i = 0, j = 0; i < width * height; i += 1, j += comps) {
      const o = i * 4;
      if (comps === 3) { px[o] = raw[j]; px[o + 1] = raw[j + 1]; px[o + 2] = raw[j + 2]; } else { px[o] = px[o + 1] = px[o + 2] = raw[j]; }
      px[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return { canvas: c, original: bytes.length };
  }
  return null;
};

// Recompress the images inside the PDF; text and vector graphics are untouched
const compressImagesInPlace = async (bytes, level, onProgress) => {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = pdf.context;
  const images = ctx.enumerateIndirectObjects().filter(([, obj]) => (
    obj instanceof PDFRawStream && nameOf(obj.dict.get(PDFName.of('Subtype'))) === '/Image'
  ));
  let replaced = 0;
  for (let i = 0; i < images.length; i += 1) {
    onProgress?.(i, images.length);
    const [ref, stream] = images[i];
    if (stream.getContents().length < level.minBytes) continue;
    let decoded;
    try {
      decoded = await imageStreamToCanvas(ctx, stream);
    } catch {
      decoded = null;
    }
    if (!decoded) continue;
    const { canvas, original } = decoded;
    const target = fitWithin(canvas.width, canvas.height, level.maxDim);
    const out = target.width === canvas.width ? canvas : drawToCanvas(canvas, { ...target, background: '#ffffff' });
    const blob = await canvasToBlob(out, 'image/jpeg', level.quality);
    if (blob.size >= original * 0.92) continue; // not worth it
    const jpeg = new Uint8Array(await blob.arrayBuffer());

    const dict = stream.dict.clone(ctx);
    dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
    dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
    dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
    dict.set(PDFName.of('Width'), PDFNumber.of(out.width));
    dict.set(PDFName.of('Height'), PDFNumber.of(out.height));
    dict.set(PDFName.of('Length'), PDFNumber.of(jpeg.length));
    dict.delete(PDFName.of('DecodeParms'));
    ctx.assign(ref, PDFRawStream.of(dict, jpeg));
    replaced += 1;
  }
  onProgress?.(images.length, images.length);
  const out = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  return { blob: new Blob([out], { type: 'application/pdf' }), images: images.length, replaced, pages: pdf.getPageCount() };
};

// pdf.js is large, so it is only downloaded when someone actually uses maximum compression
let pdfjsPromise = null;
const loadPdfJs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjsPromise;
};

const rasterizePdf = async (bytes, level, onProgress) => {
  const pdfjs = await loadPdfJs();
  const base = `${import.meta.env.BASE_URL || '/'}pdfjs/`;
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`
  });
  const doc = await task.promise;
  const out = await PDFDocument.create();
  out.setProducer('DocsApp');
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      onProgress?.(n - 1, doc.numPages);
      const page = await doc.getPage(n);
      const base1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: level.dpi / 72 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const g = canvas.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: g, canvas, viewport }).promise;
      const blob = await canvasToBlob(canvas, 'image/jpeg', level.quality);
      const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const p = out.addPage([base1.width, base1.height]);
      p.drawImage(img, { x: 0, y: 0, width: base1.width, height: base1.height });
      page.cleanup();
    }
  } finally {
    // Frees the worker and page caches (the loading task owns the document)
    await task.destroy();
  }
  onProgress?.(1, 1);
  const saved = await out.save({ useObjectStreams: true });
  return { blob: new Blob([saved], { type: 'application/pdf' }), pages: out.getPageCount() };
};

export async function compressPdf(file, levelId = 'balanced', onProgress) {
  const level = COMPRESSION_LEVELS[levelId] || COMPRESSION_LEVELS.balanced;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let result;
  try {
    result = levelId === 'maximum'
      ? await rasterizePdf(bytes, level, onProgress)
      : await compressImagesInPlace(bytes, level, onProgress);
  } catch (err) {
    const msg = String(err?.message || err);
    if (/encrypt|password/i.test(msg)) throw new Error('This PDF is password-protected. Remove the password, then try again.');
    if (/invalid|parse|header|xref/i.test(msg)) throw new Error('This file could not be read as a PDF. It may be damaged.');
    throw err;
  }
  const smaller = result.blob.size < file.size;
  return { ...result, before: file.size, after: smaller ? result.blob.size : file.size, smaller };
}
