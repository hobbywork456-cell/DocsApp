import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createSheetEvaluator, parseCoord, sheetToMatrix } from '../components/DocumentEditor/sheet/spreadsheetUtils';
import { SLIDE_THEMES } from '../components/DocumentEditor/ppt/presentationConstants';
import { SVG_SHAPES } from '../components/DocumentEditor/ppt/SlideShape';

// Convert column index to Letter (0 -> A, 1 -> B, ...)
function getColLetter(colIdx) {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// ─────────────────────────────────────────────────────────────
// 1. DOC EXPORTERS
// ─────────────────────────────────────────────────────────────

// Page geometry shared with the editor's A4 view (DocumentEditor.css: 210mm page, 25.4mm margins)
const A4 = { width: 210, height: 297, margin: 25.4, headerY: 12.7 };
const DOC_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const LIST_TAG = { bullet: 'ul', checked: 'ul', unchecked: 'ul', ordered: 'ol' };
const ORDERED_BY_LEVEL = ['decimal', 'alpha', 'roman'];
const BULLET_CHARS = { circle: '◦', square: '▪', dash: '–', arrow: '➢' };

const toAlpha = (n, upper) => {
  let s = '';
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(97 + ((k - 1) % 26)) + s;
  return upper ? s.toUpperCase() : s;
};
const toRoman = (n) => {
  const map = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let out = '';
  map.forEach(([v, r]) => { while (n >= v) { out += r; n -= v; } });
  return out;
};

// Markers are written as real text: canvas-based PDF rendering misplaces native list markers
const markerFor = (type, variant, level, count) => {
  if (type === 'checked') return '☑';
  if (type === 'unchecked') return '☐';
  if (type !== 'ordered') return BULLET_CHARS[variant] || '•';
  const style = variant === 'alpha' ? 'alpha' : variant === 'upper-alpha' ? 'upper-alpha' : variant === 'roman' ? 'roman'
    : variant === 'paren' ? 'paren' : ORDERED_BY_LEVEL[level % 3];
  if (style === 'alpha') return `${toAlpha(count)}.`;
  if (style === 'upper-alpha') return `${toAlpha(count, true)}.`;
  if (style === 'roman') return `${toRoman(count)}.`;
  if (style === 'paren') return `${count})`;
  return `${count}.`;
};

// Quill 2 stores every list as a flat <ol><li data-list="…" class="ql-indent-N"> and draws markers with CSS.
// Rebuild real nested <ul>/<ol> so the list renders correctly anywhere (PDF renderer, Word).
const rebuildList = (list) => {
  const frag = document.createDocumentFragment();
  const stack = [];
  [...list.children].filter((li) => li.tagName === 'LI').forEach((li) => {
    const type = li.getAttribute('data-list') || 'bullet';
    const level = Number((li.className.match(/ql-indent-(\d+)/) || [])[1] || 0);
    const variant = (li.className.match(/ql-list-([a-z-]+)/) || [])[1] || '';
    const tag = LIST_TAG[type] || 'ul';
    const isCheck = type === 'checked' || type === 'unchecked';
    const key = `${tag}:${variant}:${isCheck}`;

    while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    let top = stack[stack.length - 1];
    if (top && top.level === level && top.key !== key) {
      stack.pop();
      top = stack[stack.length - 1];
    }
    if (!top || top.level < level) {
      const el = document.createElement(tag);
      el.className = 'doc-list';
      if (top && top.lastLi) top.lastLi.appendChild(el);
      else frag.appendChild(el);
      top = { level, key, el, count: 0, variant, type };
      stack.push(top);
    }
    top.count++;
    const item = document.createElement('li');
    item.innerHTML = li.innerHTML;
    if (li.style.cssText) item.style.cssText = li.style.cssText;
    const marker = document.createElement('span');
    marker.className = 'doc-marker';
    marker.textContent = markerFor(type, variant, level, top.count);
    item.prepend(marker);
    top.el.appendChild(item);
    top.lastLi = item;
  });
  list.replaceWith(frag);
};

// Turn the editor's markup into self-contained semantic HTML (inline styles, real lists, page breaks)
export const normalizeDocHtml = (html) => {
  const root = document.createElement('div');
  root.innerHTML = html || '';
  root.querySelectorAll('.ql-ui').forEach((el) => el.remove());
  root.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));

  root.querySelectorAll('[class]').forEach((el) => {
    el.classList.forEach((c) => {
      let m;
      if ((m = /^ql-align-(center|right|justify)$/.exec(c))) el.style.textAlign = m[1];
      else if (c === 'ql-direction-rtl') el.setAttribute('dir', 'rtl');
      else if ((m = /^ql-indent-(\d+)$/.exec(c)) && el.tagName !== 'LI') el.style.paddingLeft = `${Number(m[1]) * 3}em`;
    });
  });

  root.querySelectorAll('ol, ul').forEach((list) => {
    if (root.contains(list) && list.querySelector(':scope > li[data-list]')) rebuildList(list);
  });

  root.querySelectorAll('.ql-code-block-container').forEach((box) => {
    const pre = document.createElement('pre');
    pre.textContent = [...box.querySelectorAll('.ql-code-block')].map((b) => b.textContent).join('\n');
    box.replaceWith(pre);
  });

  root.querySelectorAll('hr.page-break').forEach((hr) => {
    const br = document.createElement('div');
    br.className = 'html2pdf__page-break doc-page-break';
    hr.replaceWith(br);
  });

  // Drop remaining editor-only classes
  root.querySelectorAll('[class]').forEach((el) => {
    [...el.classList].filter((c) => c.startsWith('ql-')).forEach((c) => el.classList.remove(c));
    if (!el.className) el.removeAttribute('class');
  });
  return root.innerHTML;
};

// Typography mirrors the editor's A4 view so the download looks like the page on screen
const DOC_EXPORT_CSS = `
  .doc-export { width: ${A4.width - A4.margin * 2}mm; box-sizing: border-box; background: #ffffff; color: #000000;
    font-family: ${DOC_FONT}; font-size: 11pt; line-height: 1.3; text-align: left; white-space: normal;
    word-wrap: break-word; overflow-wrap: break-word; tab-size: 4; }
  .doc-export > *:first-child { margin-top: 0 !important; }
  .doc-export p, .doc-export li, .doc-export h1, .doc-export h2, .doc-export h3, .doc-export h4, .doc-export h5, .doc-export h6,
  .doc-export td, .doc-export th, .doc-export blockquote { white-space: pre-wrap; }
  .doc-export p { margin: 0; font-size: 11pt; line-height: 1.3; }
  .doc-export h1 { font-size: 2rem; font-weight: 800; color: #111827; margin: 2rem 0 0.75rem; line-height: 1.2; letter-spacing: -0.03em; }
  .doc-export h2 { font-size: 1.6rem; font-weight: 700; color: #1f2937; margin: 1.75rem 0 0.6rem; line-height: 1.25; letter-spacing: -0.02em; }
  .doc-export h3 { font-size: 1.3rem; font-weight: 600; color: #374151; margin: 1.5rem 0 0.5rem; line-height: 1.3; }
  .doc-export h4, .doc-export h5, .doc-export h6 { font-size: 1.1rem; font-weight: 600; margin: 1.2rem 0 0.4rem; }
  .doc-export ul, .doc-export ol { margin: 0 0 0.75rem; padding-left: 1.75rem; list-style: none; }
  .doc-export li ul, .doc-export li ol { margin: 0.15rem 0 0; padding-left: 1.6rem; }
  .doc-export li { font-size: 11pt; line-height: 1.4; margin-bottom: 0.25rem; list-style: none; }
  .doc-export .doc-marker { display: inline-block; min-width: 1.5em; margin-left: -1.75em; padding-right: 0.25em; text-align: right; }
  .doc-export blockquote { border-left: 4px solid #427c36; padding: 0.75rem 1.25rem; margin: 1.25rem 0;
    color: #4b5563; font-style: italic; background: #f3faf2; border-radius: 0 10px 10px 0; }
  .doc-export pre { font-family: Consolas, 'Courier New', monospace; font-size: 9.5pt; background: #f3f4f6;
    border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; margin: 0.75rem 0; white-space: pre-wrap; }
  .doc-export table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  .doc-export td, .doc-export th { border: 1px solid #d1d5db; padding: 1px 10px 9px; vertical-align: middle; font-size: 10.5pt; line-height: 1.25; }
  .doc-export th { background: #f0fdf4; font-weight: 700; }
  .doc-export img { display: inline-block; max-width: 100%; height: auto; vertical-align: bottom; }
  .doc-export video, .doc-export iframe { display: none; }
  .doc-export a { color: #2563eb; text-decoration: underline; }
  .doc-export hr { border: none; border-top: 1px solid #cbd5e1; margin: 12px 0; }
  .doc-export .doc-page-break { height: 0; margin: 0; }
`;

/// ─────────────────────────────────────────────────────────────
// PDF engine: render HTML once, then paginate ourselves so page cuts
// land in blank space (never through a line of text), with exact margins
// and a header/footer drawn on every page.
// ─────────────────────────────────────────────────────────────

const PAGE = {
  portrait: { width: 210, height: 297, margin: 25.4, headerY: 12.7 },
  landscape: { width: 297, height: 210, margin: 15, headerY: 8 }
};


const waitForAssets = async (root) => {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    setTimeout(resolve, 8000);
  }))));
  if (document.fonts?.ready) await document.fonts.ready;
};

// Off-screen host at the exact printable width, so text wraps exactly as it will on paper
const mountOffscreen = (html, widthMm) => {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${widthMm}mm;background:#ffffff;z-index:-1;`;
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
};

const snapshot = (el, scale = 2) => html2canvas(el, {
  scale,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  windowWidth: Math.max(1400, el.scrollWidth + 100),
  // Dark mode must never leak into the printed page
  onclone: (doc) => doc.documentElement.classList.remove('dark')
});

const isBlankRow = (ctx, width, y) => {
  const row = ctx.getImageData(0, y, width, 1).data;
  for (let i = 0; i < row.length; i += 4) {
    if (row[i] < 238 || row[i + 1] < 238 || row[i + 2] < 238) return false;
  }
  return true;
};

// A row is safe to cut when it holds no text: only white space, light fills or thin table borders
const isCuttableRow = (ctx, width, y) => {
  const row = ctx.getImageData(0, y, width, 1).data;
  for (let i = 0; i < row.length; i += 4) {
    if (0.299 * row[i] + 0.587 * row[i + 1] + 0.114 * row[i + 2] < 200) return false;
  }
  return true;
};

// Walk up from the ideal cut to the nearest text-free row (gap between lines, rows or blocks)
const findCut = (ctx, width, target, minY) => {
  try {
    for (let y = Math.floor(target); y > minY; y--) if (isBlankRow(ctx, width, y)) return y;
    for (let y = Math.floor(target); y > minY; y--) if (isCuttableRow(ctx, width, y)) return y;
  } catch {
    // Canvas unreadable (cross-origin image) — fall back to the plain cut
  }
  return Math.floor(target);
};

const contentBottom = (ctx, canvas) => {
  try {
    for (let y = canvas.height - 1; y > 0; y--) if (!isBlankRow(ctx, canvas.width, y)) return Math.min(canvas.height, y + 8);
    return 1;
  } catch {
    return canvas.height;
  }
};

const paginate = (canvas, pageHeightPx, forcedBreaks) => {
  const ctx = canvas.getContext('2d');
  const end = contentBottom(ctx, canvas);
  const cuts = [];
  let y = 0;
  while (y < end - 2) {
    const target = y + pageHeightPx;
    const forced = forcedBreaks.find((b) => b > y + 4 && b <= target);
    let cut;
    if (forced) cut = forced;
    else if (target >= end) cut = end;
    else cut = findCut(ctx, canvas.width, target, y + pageHeightPx * 0.6);
    if (cut <= y) cut = Math.min(end, Math.floor(target));
    cuts.push([y, cut]);
    y = cut;
    // Skip the blank gap at the top of the next page so every page starts at the margin
    try {
      while (y < end - 2 && isBlankRow(ctx, canvas.width, y) && !forcedBreaks.includes(y)) y++;
    } catch {
      // ignore
    }
  }
  return cuts.length ? cuts : [[0, Math.max(1, end)]];
};

// Header text goes through canvas so any script (₹, Tamil, Malayalam, Arabic…) prints correctly
const textToImage = (text, { fontPx = 30, color = '#6b7280', weight = 600, maxWidthPx = 1400 } = {}) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${weight} ${fontPx}px ${DOC_FONT}`;
  ctx.font = font;
  let t = text;
  while (ctx.measureText(t).width > maxWidthPx && t.length > 4) t = `${t.slice(0, -2)}…`;
  canvas.width = Math.ceil(ctx.measureText(t).width) + 4;
  canvas.height = Math.ceil(fontPx * 1.4);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(t, 2, canvas.height / 2);
  return { data: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height };
};

const drawHeaderFooter = (pdf, title, page) => {
  const pages = pdf.internal.getNumberOfPages();
  const left = page.margin;
  const right = page.width - page.margin;
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const titleImg = textToImage(title || 'Untitled Document');
  const titleH = 3.2;
  const titleW = Math.min(titleImg.ratio * titleH, (right - left) * 0.7);
  const footerY = page.height - page.headerY;

  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.25);
    // Header: title left, date right, hairline below
    pdf.addImage(titleImg.data, 'PNG', left, page.headerY - titleW / titleImg.ratio / 2, titleW, titleW / titleImg.ratio);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(107, 114, 128);
    pdf.text(date, right, page.headerY, { align: 'right', baseline: 'middle' });
    pdf.line(left, page.headerY + 2.8, right, page.headerY + 2.8);
    // Footer: hairline above, page number centred
    pdf.line(left, footerY - 2.8, right, footerY - 2.8);
    pdf.text(`Page ${i} of ${pages}`, page.width / 2, footerY, { align: 'center', baseline: 'middle' });
  }
};

/**
 * Render `html` into a paginated PDF.
 * The HTML is laid out at the printable width; wider content (e.g. big sheets) is scaled down to fit.
 */
const renderHtmlToPdf = async ({ html, title, filename, orientation = 'portrait' }) => {
  const page = PAGE[orientation];
  const contentW = page.width - page.margin * 2;
  const contentH = page.height - page.margin * 2;
  const host = mountOffscreen(html, contentW);
  try {
    // Content wider than the page (large sheets) widens the render area and is scaled down to fit
    if (host.scrollWidth > host.clientWidth + 1) host.style.width = `${host.scrollWidth}px`;
    await waitForAssets(host);
    const scale = 2;
    const canvas = await snapshot(host, scale);
    const cssToCanvas = canvas.height / host.offsetHeight;
    const pxPerMm = canvas.width / contentW; // > normal when content was wider than the page
    const hostTop = host.getBoundingClientRect().top;
    const forced = [...host.querySelectorAll('.doc-page-break')]
      .map((el) => Math.round((el.getBoundingClientRect().top - hostTop) * cssToCanvas))
      .filter((y) => y > 0)
      .sort((a, b) => a - b);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation });
    pdf.setProperties({ title: title || 'Document' });
    paginate(canvas, Math.floor(contentH * pxPerMm), forced).forEach(([a, b], i) => {
      if (i) pdf.addPage();
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = b - a;
      const sctx = slice.getContext('2d');
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, slice.width, slice.height);
      sctx.drawImage(canvas, 0, a, canvas.width, b - a, 0, 0, canvas.width, b - a);
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', page.margin, page.margin, contentW, (b - a) / pxPerMm, undefined, 'FAST');
    });
    drawHeaderFooter(pdf, title, page);
    pdf.save(filename);
  } finally {
    host.remove();
  }
};

export const downloadDocAsPdf = (title, content) => renderHtmlToPdf({
  html: `<style>${DOC_EXPORT_CSS}</style><div class="doc-export">${normalizeDocHtml(content)}</div>`,
  title,
  filename: `${title || 'document'}.pdf`,
  orientation: 'portrait'
});

const escapeDocHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const downloadDocAsWord = (title, content) => {
  // Word understands real page breaks only in this form
  const body = normalizeDocHtml(content).replace(
    /<div class="html2pdf__page-break doc-page-break"><\/div>/g,
    '<br clear="all" style="mso-special-character:line-break;page-break-before:always">'
  );
  const safeTitle = escapeDocHtml(title || 'Untitled Document');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    @page Section1 { size: 21cm 29.7cm; margin: 2.54cm 2.54cm 2.54cm 2.54cm; mso-header-margin: 1.27cm; mso-footer-margin: 1.27cm; mso-header: h1; mso-footer: f1; }
    div.Section1 { page: Section1; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.3; color: #000000; }
    p { margin: 0; }
    h1 { font-size: 22pt; font-weight: bold; color: #111827; margin: 18pt 0 6pt; }
    h2 { font-size: 17pt; font-weight: bold; color: #1f2937; margin: 14pt 0 5pt; }
    h3 { font-size: 13.5pt; font-weight: bold; color: #374151; margin: 12pt 0 4pt; }
    ul, ol { margin-top: 0; margin-bottom: 6pt; }
    li { margin-bottom: 2pt; }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #d1d5db; padding: 4pt 7pt; vertical-align: top; }
    th { background: #f0fdf4; font-weight: bold; }
    blockquote { border-left: 3pt solid #427c36; padding: 4pt 10pt; margin: 8pt 0; color: #4b5563; font-style: italic; }
    pre { font-family: Consolas, 'Courier New', monospace; font-size: 9.5pt; background: #f3f4f6; padding: 6pt; }
    img { max-width: 100%; }
    a { color: #2563eb; }
    p.MsoHeader, p.MsoFooter { margin: 0; font-size: 8.5pt; color: #6b7280; }
  </style>
</head>
<body>
<div class="Section1">
${body}
<table style="margin-left:-1000mm" border="0" cellspacing="0" cellpadding="0"><tr><td>
  <div style="mso-element:header" id="h1">
    <p class="MsoHeader" style="border-bottom:0.5pt solid #d1d5db; padding-bottom:3pt">${safeTitle}<span style="mso-tab-count:2"></span>${escapeDocHtml(new Date().toLocaleDateString())}</p>
  </div>
  <div style="mso-element:footer" id="f1">
    <p class="MsoFooter" align="center" style="text-align:center; border-top:0.5pt solid #d1d5db; padding-top:3pt">Page <span style="mso-field-code:' PAGE '"></span> of <span style="mso-field-code:' NUMPAGES '"></span></p>
  </div>
</td></tr></table>
</div>
</body>
</html>`;

  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'document'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadDocAsText = (title, content) => {
  const temp = document.createElement('div');
  temp.innerHTML = content || '';
  const text = `${title || 'Document'}\n${'='.repeat(title?.length || 8)}\n\n${temp.innerText || temp.textContent || ''}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'document'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────
// 2. SPREADSHEET EXPORTERS
// ─────────────────────────────────────────────────────────────

const parseWorkbookContent = (content) => {
  try {
    const wb = typeof content === 'string' ? JSON.parse(content) : content;
    return wb && Array.isArray(wb.sheets) && wb.sheets.length ? wb : null;
  } catch {
    return null;
  }
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const XLSX_NUMBER_FORMATS = {
  currency: (c) => `"${c.currencySymbol || '$'}"#,##0.${'0'.repeat(c.decimals ?? 2)}`,
  accounting: (c) => `_("${c.currencySymbol || '$'}"* #,##0.${'0'.repeat(c.decimals ?? 2)}_)`,
  percent: (c) => `0.${'0'.repeat(c.decimals ?? 2)}%`,
  comma: (c) => `#,##0.${'0'.repeat(c.decimals ?? 2)}`,
  number: (c) => `#,##0.${'0'.repeat(c.decimals ?? 2)}`,
  shortDate: () => 'm/d/yyyy',
  longDate: () => 'dddd, mmmm d, yyyy',
  time: () => 'h:mm:ss AM/PM',
  scientific: (c) => `0.${'0'.repeat(c.decimals ?? 2)}E+00`,
  fraction: () => '# ?/?'
};

export const downloadSheetAsXlsx = (title, content) => {
  const workbookData = parseWorkbookContent(content);
  const wb = XLSX.utils.book_new();

  if (!workbookData) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'Sheet1');
    XLSX.writeFile(wb, `${title || 'spreadsheet'}.xlsx`);
    return;
  }

  workbookData.sheets.forEach((sheet) => {
    const cells = sheet.cells || {};
    const ev = createSheetEvaluator(cells, { sheets: workbookData.sheets });
    const ws = {};
    const merges = [];
    let maxR = 0, maxC = 0;

    Object.entries(cells).forEach(([coord, cell]) => {
      const p = parseCoord(coord);
      if (!p || !cell) return;
      if (cell.mergeRows > 1 || cell.mergeCols > 1) {
        merges.push({ s: { r: p.row - 1, c: p.col }, e: { r: p.row - 2 + (cell.mergeRows || 1), c: p.col - 1 + (cell.mergeCols || 1) } });
      }
      const hasValue = cell.formula || (cell.value !== undefined && cell.value !== '');
      if (!hasValue) return;
      // Write the cached result and, for formulas, the formula itself so Excel recalculates
      const v = ev.display(p.row, p.col);
      let out;
      if (typeof v === 'number') out = { t: 'n', v };
      else if (v === 'TRUE' || v === 'FALSE') out = { t: 'b', v: v === 'TRUE' };
      else out = { t: 's', v: String(v) };
      if (cell.formula) out.f = cell.formula.slice(1);
      const fmt = XLSX_NUMBER_FORMATS[cell.format];
      if (fmt && out.t === 'n') out.z = fmt(cell);
      ws[`${getColLetter(p.col)}${p.row}`] = out;
      maxR = Math.max(maxR, p.row);
      maxC = Math.max(maxC, p.col);
    });

    ws['!ref'] = `A1:${getColLetter(Math.max(maxC, 0))}${Math.max(maxR, 1)}`;
    if (merges.length) ws['!merges'] = merges;
    if (sheet.colWidths) {
      ws['!cols'] = Array.from({ length: maxC + 1 }, (_, c) => ({ wpx: sheet.colWidths[c] || 100 }));
    }
    XLSX.utils.book_append_sheet(wb, ws, (sheet.name || 'Sheet').substring(0, 31));
  });

  XLSX.writeFile(wb, `${title || 'spreadsheet'}.xlsx`);
};

const activeSheetOf = (wb) => wb.sheets.find((s) => s.id === wb.activeSheetId) || wb.sheets[0];

export const downloadSheetAsCsv = (title, content) => {
  const workbookData = parseWorkbookContent(content);
  if (!workbookData) {
    triggerDownload(new Blob([''], { type: 'text/csv;charset=utf-8;' }), `${title || 'sheet'}.csv`);
    return;
  }
  const sheet = activeSheetOf(workbookData);
  const csv = sheetToMatrix(sheet, workbookData)
    .map((row) => row.map((v) => {
      const s = String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\r\n');
  // BOM so Excel opens UTF-8 (₹, €, accents) correctly
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `${title || sheet.name || 'sheet'}.csv`);
};

export const downloadSheetAsPdf = (title, content) => {
  const workbookData = parseWorkbookContent(content);
  const sheets = workbookData ? workbookData.sheets : [];

  const sections = sheets.map((sheet, idx) => {
    const ev = createSheetEvaluator(sheet.cells || {}, { sheets });
    const matrix = sheetToMatrix(sheet, workbookData);
    if (!matrix.length) return '';
    const width = matrix[0].length;
    const heading = sheets.length > 1 ? `${title || 'Spreadsheet'} — ${sheet.name}` : (title || sheet.name || 'Spreadsheet');
    let html = `${idx ? '<div class="doc-page-break"></div>' : ''}<section>`;
    html += `<div class="sheet-title">${escapeHtml(heading)}</div>`;
    html += '<table class="sheet-table"><thead><tr><th class="row-num"></th>';
    for (let c = 0; c < width; c++) html += `<th>${getColLetter(c)}</th>`;
    html += '</tr></thead><tbody>';
    matrix.forEach((row, r) => {
      html += `<tr><td class="row-num">${r + 1}</td>`;
      row.forEach((val, c) => {
        const cell = sheet.cells?.[`${getColLetter(c)}${r + 1}`] || {};
        const raw = ev.display(r + 1, c);
        const styles = [
          cell.bold ? 'font-weight:700' : '',
          cell.italic ? 'font-style:italic' : '',
          cell.color ? `color:${cell.color}` : '',
          cell.bg ? `background:${cell.bg}` : '',
          `text-align:${cell.align || (typeof raw === 'number' ? 'right' : 'left')}`
        ].filter(Boolean).join(';');
        html += `<td style="${styles}">${escapeHtml(val)}</td>`;
      });
      html += '</tr>';
    });
    return html + '</tbody></table></section>';
  }).join('');

  const element = document.createElement('div');
  element.innerHTML = `
    <style>
      .sheet-pdf { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; width: max-content; min-width: 100%; }
      .sheet-title { font-size: 15pt; font-weight: 700; color: #107c41; margin: 0 0 10px; }
      .sheet-table { border-collapse: collapse; font-size: 8.5pt; width: auto; min-width: 100%; }
      .sheet-table th, .sheet-table td { border: 1px solid #d1d5db; padding: 4px 7px; white-space: nowrap; }
      .sheet-table th { background: #f3f4f6; font-weight: 600; color: #4b5563; text-align: center; }
      .sheet-table tr { page-break-inside: avoid; }
      .row-num { background: #f3f4f6; color: #9ca3af; text-align: center; width: 26px; }
    </style>
    <div class="sheet-pdf">${sections || '<p>This spreadsheet is empty.</p>'}</div>`;

  // Landscape A4 with the same header/footer as documents; wide sheets are scaled to fit the page width
  return renderHtmlToPdf({ html: element.innerHTML, title: title || 'Spreadsheet', filename: `${title || 'spreadsheet'}.pdf`, orientation: 'landscape' });
};

// ─────────────────────────────────────────────────────────────
// 3. PRESENTATION (PPT) EXPORTERS
// ─────────────────────────────────────────────────────────────

// '#rrggbb' | 'rgba(r,g,b,a)' | 'transparent' -> { color: 'RRGGBB', transparency: 0-100 } (pptxgenjs format)
const toPptColor = (c, fallback = '000000') => {
  if (!c || c === 'transparent') return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((x) => x + x).join('') : hex[1];
    return { color: h.toUpperCase(), transparency: 0 };
  }
  const rgba = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i.exec(c);
  if (rgba) {
    const h = [rgba[1], rgba[2], rgba[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    const a = rgba[4] !== undefined ? Number(rgba[4]) : 1;
    return { color: h.toUpperCase(), transparency: Math.round((1 - a) * 100) };
  }
  return { color: fallback, transparency: 0 };
};

// Solid background colour that best represents a theme (gradients use their middle stop)
const themeBackground = (bg) => {
  const stops = String(bg || '').match(/#[0-9a-f]{6}/gi) || [];
  if (!stops.length) return 'FFFFFF';
  return stops[Math.floor((stops.length - 1) / 2)].slice(1).toUpperCase();
};

const PPT_SHAPES = {
  rect: 'rect',
  rounded_rect: 'roundRect',
  oval: 'ellipse',
  triangle: 'triangle',
  right_arrow: 'rightArrow',
  down_arrow: 'downArrow',
  star: 'star5',
  callout: 'wedgeRoundRectCallout',
  brackets: 'bracketPair',
  textbox: 'rect',
  line: 'line',
  arrow: 'line'
};

export const downloadPptAsPptx = async (title, content) => {
  let deck;
  try {
    deck = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    deck = { slides: [] };
  }

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in, 16:9
  pres.title = title || 'Presentation';
  const W = 13.333;
  const H = 7.5;
  const theme = SLIDE_THEMES[deck.themeId] || SLIDE_THEMES.emeraldGradient;
  const bg = themeBackground(theme.bg);
  const titleColor = toPptColor(theme.titleColor, '1F2937').color;
  const textColor = toPptColor(theme.textColor, '334155').color;
  const accent = toPptColor(theme.accentColor, '2563EB').color;
  const card = toPptColor(theme.cardBg, 'F8FAFC');
  const font = 'Calibri';

  const slides = deck.slides || [];
  if (!slides.length) {
    const slide = pres.addSlide();
    slide.background = { color: bg };
    slide.addText(title || 'Untitled Presentation', { x: 0.8, y: 3, w: W - 1.6, h: 1.2, fontSize: 40, bold: true, color: titleColor, fontFace: font });
  }

  slides.forEach((s) => {
    const slide = pres.addSlide();
    slide.background = { color: bg };
    const tColor = s.customColor ? toPptColor(s.customColor).color : titleColor;
    const bColor = s.customColor ? toPptColor(s.customColor).color : textColor;
    const base = { fontFace: s.fontFamily || font, bold: !!s.isBold, italic: !!s.isItalic, underline: s.isUnderline ? { style: 'sng' } : undefined };
    const heading = (text, y = 0.5) => text && slide.addText(text, { ...base, x: 0.7, y, w: W - 1.4, h: 0.9, fontSize: 32, bold: true, color: tColor });
    const cardBox = (x, y, w, h, head, body) => {
      slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.12, fill: { color: card.color, transparency: card.transparency }, line: { color: accent, transparency: 70, width: 1 } });
      if (head) slide.addText(head, { ...base, x: x + 0.25, y: y + 0.2, w: w - 0.5, h: 0.6, fontSize: 20, bold: true, color: accent });
      if (body) slide.addText(body, { ...base, x: x + 0.25, y: y + (head ? 0.85 : 0.25), w: w - 0.5, h: h - (head ? 1.05 : 0.5), fontSize: 15, color: bColor, valign: 'top' });
    };

    switch (s.layout) {
      case 'title':
      case 'section':
        slide.addText(s.title || '', { ...base, x: 0.8, y: 2.3, w: W - 1.6, h: 1.4, fontSize: s.layout === 'section' ? 40 : 44, bold: true, color: tColor, align: 'center' });
        if (s.subtitle) slide.addText(s.subtitle, { ...base, x: 1.2, y: 3.8, w: W - 2.4, h: 0.9, fontSize: 20, color: bColor, align: 'center' });
        slide.addShape('rect', { x: W / 2 - 0.6, y: 3.65, w: 1.2, h: 0.05, fill: { color: accent }, line: { color: accent } });
        break;
      case 'bullets': {
        heading(s.title);
        let y = 1.45;
        if (s.subtitle) {
          slide.addText(s.subtitle, { ...base, x: 0.7, y: 1.35, w: W - 1.4, h: 0.6, fontSize: 17, color: bColor, transparency: 20 });
          y = 2.05;
        }
        const bullets = (s.bullets || []).filter((b) => b !== undefined);
        if (bullets.length) {
          slide.addText(bullets.map((b) => ({ text: b, options: { bullet: { code: '25CF' }, breakLine: true } })), {
            ...base, x: 0.9, y, w: W - 1.8, h: H - y - 0.6, fontSize: 20, color: bColor, valign: 'top', paraSpaceAfter: 10
          });
        }
        break;
      }
      case 'two-column':
      case 'comparison':
        heading(s.title);
        cardBox(0.7, 1.6, (W - 1.8) / 2, H - 2.3, s.col1Title, s.leftColumn);
        cardBox(0.7 + (W - 1.8) / 2 + 0.4, 1.6, (W - 1.8) / 2, H - 2.3, s.col2Title, s.rightColumn);
        break;
      case 'three-column': {
        heading(s.title);
        if (s.subtitle) slide.addText(s.subtitle, { ...base, x: 0.7, y: 1.35, w: W - 1.4, h: 0.5, fontSize: 16, color: bColor });
        const cw = (W - 1.4 - 0.8) / 3;
        [[s.col1Title, s.col1Text], [s.col2Title, s.col2Text], [s.col3Title, s.col3Text]].forEach(([h, t], i) => cardBox(0.7 + i * (cw + 0.4), 2.0, cw, H - 2.7, h, t));
        break;
      }
      case 'metric':
        heading(s.title);
        slide.addText(s.metricNumber || '', { ...base, x: 0.8, y: 2.0, w: W - 1.6, h: 1.8, fontSize: 88, bold: true, color: accent, align: 'center' });
        if (s.metricLabel) slide.addText(s.metricLabel, { ...base, x: 0.8, y: 3.9, w: W - 1.6, h: 0.7, fontSize: 24, bold: true, color: tColor, align: 'center' });
        if (s.metricDesc) slide.addText(s.metricDesc, { ...base, x: 1.5, y: 4.7, w: W - 3, h: 1.0, fontSize: 16, color: bColor, align: 'center' });
        break;
      case 'quote':
        slide.addText('“', { x: 0.8, y: 0.6, w: 1.5, h: 1.5, fontSize: 120, color: accent, fontFace: 'Georgia' });
        slide.addText(s.quoteText || '', { ...base, x: 1.4, y: 1.8, w: W - 2.8, h: 2.8, fontSize: 30, italic: true, color: tColor, align: 'center', valign: 'middle' });
        if (s.quoteAuthor) slide.addText(`— ${s.quoteAuthor}`, { ...base, x: 1.4, y: 4.8, w: W - 2.8, h: 0.6, fontSize: 20, bold: true, color: accent, align: 'center' });
        if (s.quoteRole) slide.addText(s.quoteRole, { ...base, x: 1.4, y: 5.4, w: W - 2.8, h: 0.5, fontSize: 15, color: bColor, align: 'center' });
        break;
      case 'media':
        heading(s.title);
        if (s.mediaUrl && /^(https?:|data:image)/.test(s.mediaUrl) && /\.(png|jpe?g|gif|webp|svg)(\?|$)|^data:image/i.test(s.mediaUrl)) {
          slide.addImage({ path: s.mediaUrl, x: 1.5, y: 1.5, w: W - 3, h: H - 2.8, sizing: { type: 'contain', w: W - 3, h: H - 2.8 } });
        } else if (s.mediaUrl) {
          slide.addText(s.mediaUrl, { x: 1.5, y: 3, w: W - 3, h: 0.6, fontSize: 14, color: accent, hyperlink: { url: s.mediaUrl }, align: 'center' });
        }
        if (s.subtitle) slide.addText(s.subtitle, { ...base, x: 1, y: H - 1.2, w: W - 2, h: 0.6, fontSize: 15, color: bColor, align: 'center' });
        break;
      default:
        if (s.title) slide.addText(s.title, { ...base, x: 0.7, y: 0.6, w: W - 1.4, h: H - 1.2, fontSize: 20, color: bColor, valign: 'top' });
    }

    // Free-form shapes and text boxes (stored in a 960x540 reference space)
    (s.shapes || []).forEach((sh) => {
      const x = ((sh.x || 0) / 960) * W;
      const y = ((sh.y || 0) / 540) * H;
      const w = ((sh.width || 140) / 960) * W;
      const h = ((sh.height || 60) / 540) * H;
      const type = PPT_SHAPES[sh.type] || 'rect';
      const fill = toPptColor(sh.fill);
      const stroke = toPptColor(sh.stroke);
      if (sh.type === 'line' || sh.type === 'arrow') {
        slide.addShape('line', {
          x, y: sh.type === 'line' ? y + h / 2 : y, w, h: sh.type === 'line' ? 0 : h,
          flipV: sh.type === 'arrow',
          line: { color: (stroke || { color: accent }).color, width: sh.strokeWidth || 2, endArrowType: sh.type === 'arrow' ? 'triangle' : undefined }
        });
        return;
      }
      const opts = {
        shape: type,
        x, y, w, h,
        fill: fill ? { color: fill.color, transparency: fill.transparency } : { type: 'none' },
        line: stroke ? { color: stroke.color, width: sh.strokeWidth || 1 } : { type: 'none' },
        shadow: sh.shadow ? { type: 'outer', blur: 6, offset: 3, angle: 90, opacity: 0.3 } : undefined,
        fontFace: sh.fontFamily || font,
        // 13.33in = 960pt, so one reference unit is exactly one point
        fontSize: sh.fontSize || 18,
        color: toPptColor(sh.color || theme.textColor, textColor).color,
        bold: !!sh.bold,
        italic: !!sh.italic,
        underline: sh.underline ? { style: 'sng' } : undefined,
        align: sh.align || 'center',
        valign: 'middle'
      };
      slide.addText(sh.text || '', opts);
    });

    if (s.notes) slide.addNotes(s.notes);
  });

  await pres.writeFile({ fileName: `${title || 'presentation'}.pptx` });
};

// One 16:9 page per slide, rendered with the deck's theme, layout and shapes
const SLIDE_W = 960;
const SLIDE_H = 540;

const slideShapeHtml = (sh, theme) => {
  const pos = `left:${sh.x || 0}px;top:${sh.y || 0}px;width:${sh.width || 140}px;height:${sh.height || 60}px;`;
  const fill = sh.fill || 'transparent';
  const stroke = sh.stroke && sh.stroke !== 'transparent' ? sh.stroke : 'none';
  const sw = sh.strokeWidth || 2;
  const geo = SVG_SHAPES[sh.type];
  let shape = '';
  let box = '';
  if (geo) {
    const strokeAttr = `stroke="${stroke === 'none' && geo.type === 'line' ? theme.accentColor : stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"`;
    let inner = '';
    if (geo.type === 'polygon') inner = `<polygon points="${geo.points}" fill="${fill}" ${strokeAttr}/>`;
    if (geo.type === 'path') inner = `<path d="${geo.d}" fill="${geo.open ? 'none' : fill}" ${strokeAttr}/>`;
    if (geo.type === 'line') {
      inner = `<line x1="${geo.x1}" y1="${geo.y1}" x2="${geo.x2}" y2="${geo.y2}" ${strokeAttr} stroke-linecap="round"/>`;
      if (geo.arrow) inner += `<polygon points="${geo.x2},${geo.y2} ${geo.x2 - 14},${geo.y2 + 4} ${geo.x2 - 4},${geo.y2 + 14}" fill="${stroke === 'none' ? theme.accentColor : stroke}"/>`;
    }
    shape = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">${inner}</svg>`;
  } else {
    const radius = sh.type === 'rounded_rect' ? '14%/22%' : sh.type === 'oval' ? '50%' : sh.type === 'textbox' ? '0' : '3px';
    box = `background:${fill};border:${stroke === 'none' ? 'none' : `${sw}px solid ${stroke}`};border-radius:${radius};`;
  }
  const text = sh.text && sh.type !== 'line' && sh.type !== 'arrow'
    ? `<div style="position:relative;width:100%;padding:4% 6%;box-sizing:border-box;white-space:pre-wrap;word-break:break-word;line-height:1.25;
        color:${sh.color || theme.textColor};font-size:${sh.fontSize || 18}px;font-weight:${sh.bold ? 700 : 400};font-style:${sh.italic ? 'italic' : 'normal'};
        text-decoration:${sh.underline ? 'underline' : 'none'};text-align:${sh.align || 'center'};${sh.fontFamily ? `font-family:${sh.fontFamily};` : ''}">${escapeHtml(sh.text)}</div>`
    : '';
  const shadow = sh.shadow ? 'filter:drop-shadow(0 6px 12px rgba(0,0,0,0.28));' : '';
  return `<div style="position:absolute;${pos}${box}${shadow}display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${shape}${text}</div>`;
};

const slideHtml = (s, theme, index, total) => {
  const e = escapeHtml;
  const titleColor = s.customColor || theme.titleColor;
  const bodyColor = s.customColor || theme.textColor;
  const base = `font-family:${s.fontFamily || DOC_FONT};${s.isBold ? 'font-weight:700;' : ''}${s.isItalic ? 'font-style:italic;' : ''}`;
  const h = (t, size = 36) => (t ? `<div style="font-size:${size}px;font-weight:800;color:${titleColor};line-height:1.15;letter-spacing:-0.01em;margin-bottom:10px">${e(t)}</div>` : '');
  const sub = (t) => (t ? `<div style="font-size:18px;color:${bodyColor};opacity:0.85;margin-bottom:18px;line-height:1.4">${e(t)}</div>` : '');
  const card = (head, body) => `<div style="flex:1;background:${theme.cardBg};border-radius:14px;padding:20px 22px;border:1px solid rgba(255,255,255,0.08)">
      ${head ? `<div style="font-size:20px;font-weight:700;color:${theme.accentColor};margin-bottom:10px">${e(head)}</div>` : ''}
      <div style="font-size:15.5px;line-height:1.5;color:${bodyColor};white-space:pre-wrap">${e(body || '')}</div></div>`;
  const align = s.textAlign ? `text-align:${s.textAlign};` : '';
  let body;
  switch (s.layout) {
    case 'title':
    case 'section':
      body = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <div style="font-size:${s.layout === 'section' ? 50 : 54}px;font-weight:800;color:${titleColor};line-height:1.1;letter-spacing:-0.02em">${e(s.title || '')}</div>
        <div style="width:90px;height:4px;border-radius:4px;background:${theme.accentColor};margin:34px 0 22px"></div>
        <div style="font-size:22px;color:${bodyColor};opacity:0.9;max-width:760px;line-height:1.4">${e(s.subtitle || '')}</div></div>`;
      break;
    case 'bullets':
      body = `${h(s.title)}${sub(s.subtitle)}<div style="display:flex;flex-direction:column;gap:14px;${align}">
        ${(s.bullets || []).map((b) => `<div style="display:flex;gap:14px;align-items:flex-start;font-size:21px;line-height:1.4;color:${bodyColor}">
          <span style="flex:none;width:10px;height:10px;border-radius:50%;background:${theme.accentColor};margin-top:13px"></span><span>${e(b)}</span></div>`).join('')}</div>`;
      break;
    case 'two-column':
    case 'comparison':
      body = `${h(s.title)}<div style="display:flex;gap:22px;flex:1;margin-top:8px">${card(s.col1Title, s.leftColumn)}${card(s.col2Title, s.rightColumn)}</div>`;
      break;
    case 'three-column':
      body = `${h(s.title)}${sub(s.subtitle)}<div style="display:flex;gap:18px;flex:1">${card(s.col1Title, s.col1Text)}${card(s.col2Title, s.col2Text)}${card(s.col3Title, s.col3Text)}</div>`;
      break;
    case 'metric':
      body = `${h(s.title)}<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <div style="font-size:112px;font-weight:800;color:${theme.accentColor};line-height:1">${e(s.metricNumber || '')}</div>
        <div style="font-size:28px;font-weight:700;color:${titleColor};margin-top:14px">${e(s.metricLabel || '')}</div>
        <div style="font-size:18px;color:${bodyColor};opacity:0.85;margin-top:10px;max-width:640px;line-height:1.45">${e(s.metricDesc || '')}</div></div>`;
      break;
    case 'quote':
      body = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 40px">
        <div style="font-family:Georgia,serif;font-size:110px;line-height:0.6;color:${theme.accentColor};height:56px">“</div>
        <div style="font-size:30px;font-style:italic;color:${titleColor};line-height:1.4">${e(s.quoteText || '')}</div>
        <div style="font-size:20px;font-weight:700;color:${theme.accentColor};margin-top:24px">${s.quoteAuthor ? `— ${e(s.quoteAuthor)}` : ''}</div>
        <div style="font-size:15px;color:${bodyColor};opacity:0.8;margin-top:4px">${e(s.quoteRole || '')}</div></div>`;
      break;
    case 'media': {
      const isImg = s.mediaUrl && /\.(png|jpe?g|gif|webp|svg)(\?|$)|^data:image/i.test(s.mediaUrl);
      body = `${h(s.title)}<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0">
        ${isImg ? `<img src="${e(s.mediaUrl)}" crossorigin="anonymous" style="max-width:100%;max-height:330px;object-fit:contain;border-radius:10px"/>`
          : s.mediaUrl ? `<div style="font-size:16px;color:${theme.accentColor}">${e(s.mediaUrl)}</div>` : ''}</div>
        ${s.subtitle ? `<div style="font-size:16px;color:${bodyColor};text-align:center;margin-top:12px">${e(s.subtitle)}</div>` : ''}`;
      break;
    }
    default:
      body = `<div style="font-size:22px;line-height:1.5;color:${bodyColor};white-space:pre-line;${align}">${e(s.title || '')}</div>`;
  }
  return `<div class="pdf-slide" style="position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:${theme.bg};color:${theme.textColor};${base}">
    <div style="position:absolute;inset:0;padding:44px 60px 40px;box-sizing:border-box;display:flex;flex-direction:column">${body}</div>
    ${(s.shapes || []).map((sh) => slideShapeHtml(sh, theme)).join('')}
    <div style="position:absolute;right:22px;bottom:14px;font-size:11px;color:${bodyColor};opacity:0.55">${index + 1} / ${total}</div>
  </div>`;
};

export const downloadPptAsPdf = async (title, content) => {
  let deck;
  try {
    deck = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    deck = { slides: [] };
  }
  const theme = SLIDE_THEMES[deck?.themeId] || SLIDE_THEMES.emeraldGradient;
  const slides = deck?.slides?.length ? deck.slides : [{ layout: 'title', title: title || 'Untitled Presentation' }];
  // 13.333in × 7.5in — the same 16:9 page PowerPoint uses
  const pageW = 338.67;
  const pageH = 190.5;
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'landscape' });
  pdf.setProperties({ title: title || 'Presentation' });

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${SLIDE_W}px;z-index:-1;`;
  document.body.appendChild(host);
  try {
    for (let i = 0; i < slides.length; i++) {
      host.innerHTML = slideHtml(slides[i], theme, i, slides.length);
      await waitForAssets(host);
      const canvas = await html2canvas(host.firstElementChild, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
        onclone: (doc) => doc.documentElement.classList.remove('dark')
      });
      if (i) pdf.addPage([pageW, pageH], 'landscape');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
  } finally {
    host.remove();
  }
  pdf.save(`${title || 'presentation'}.pdf`);
};
