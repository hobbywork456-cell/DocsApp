import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, CircularProgress, Slider, LinearProgress } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CompressOutlinedIcon from '@mui/icons-material/CompressOutlined';
import PhotoSizeSelectLargeOutlinedIcon from '@mui/icons-material/PhotoSizeSelectLargeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  formatBytes, savedPercent, baseName, downloadBlob, newId, decodeImage, drawToCanvas, canvasToBlob, fitWithin, sizeOf
} from './toolUtils';
import './Tools.css';

// Heavy libraries load only when a tool is actually used
const loadPdfTools = () => import('./pdfTools');
const loadDocx = () => import('./docxToHtml');
const loadExporter = () => import('../../../utils/documentExporter');

export const DEMO_TOOLS = [
  { id: 'img2pdf', label: 'Image to PDF', icon: PictureAsPdfOutlinedIcon, blurb: 'Combine photos and scans into one PDF.' },
  { id: 'word2pdf', label: 'Word to PDF', icon: DescriptionOutlinedIcon, blurb: 'Turn a .docx file into a PDF.' },
  { id: 'imgcompress', label: 'Image compressor', icon: PhotoSizeSelectLargeOutlinedIcon, blurb: 'Make JPG, PNG and WebP images smaller.' },
  { id: 'pdfcompress', label: 'PDF compressor', icon: CompressOutlinedIcon, blurb: 'Shrink a PDF so it’s easier to share.' }
];

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp';
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/* ── Shared pieces ─────────────────────────────────────── */

const DropZone = ({ accept, multiple, onFiles, title, hint, compact }) => {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const take = (list) => {
    const files = [...(list || [])];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  return (
    <div
      className={`tool-drop ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
    >
      <CloudUploadOutlinedIcon sx={{ fontSize: compact ? 22 : 34 }} />
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => { take(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};

const ToolHeader = ({ tool }) => {
  const Icon = tool.icon;
  return (
    <div className="tool-head">
      <span className="tool-head-icon"><Icon sx={{ fontSize: 24 }} /></span>
      <div>
        <h1>{tool.label}</h1>
        <p>{tool.blurb} Runs in your browser — files are never uploaded or saved.</p>
      </div>
    </div>
  );
};

const Segmented = ({ value, onChange, options, label }) => (
  <div className="tool-opt">
    <span className="tool-opt-label">{label}</span>
    <div className="tool-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const ErrorNote = ({ children }) => (children ? <div className="tool-error" role="alert">{children}</div> : null);

const useObjectUrls = () => {
  const urls = useRef(new Set());
  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  const make = useCallback((blob) => { const u = URL.createObjectURL(blob); urls.current.add(u); return u; }, []);
  const drop = useCallback((u) => { if (u) { URL.revokeObjectURL(u); urls.current.delete(u); } }, []);
  return { make, drop };
};

const tooBig = (files) => files.filter((f) => f.size > MAX_FILE_BYTES);

/* ── 1. Image → PDF ────────────────────────────────────── */

const ImageToPdf = ({ notify }) => {
  const { make, drop } = useObjectUrls();
  const [items, setItems] = useState([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('auto');
  const [margin, setMargin] = useState(10);
  const [name, setName] = useState('images');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const addFiles = (files) => {
    setError('');
    const images = files.filter((f) => /^image\//.test(f.type));
    const big = tooBig(images);
    if (images.length < files.length) setError('Only image files (JPG, PNG, WebP, GIF, BMP) can be added.');
    if (big.length) setError(`${big.length} image${big.length > 1 ? 's are' : ' is'} over 50 MB and ${big.length > 1 ? 'were' : 'was'} skipped.`);
    const ok = images.filter((f) => f.size <= MAX_FILE_BYTES);
    if (!items.length && ok[0]) setName(baseName(ok[0].name));
    setItems((prev) => [...prev, ...ok.map((file) => ({ id: newId('img'), file, url: make(file), rotate: 0 }))]);
  };

  const move = (i, d) => setItems((prev) => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (id) => setItems((prev) => prev.filter((x) => { if (x.id === id) drop(x.url); return x.id !== id; }));
  const rotate = (id) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, rotate: (x.rotate + 90) % 360 } : x)));
  const clear = () => { items.forEach((x) => drop(x.url)); setItems([]); setError(''); };

  const build = async () => {
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const { imagesToPdf } = await loadPdfTools();
      const blob = await imagesToPdf(items, {
        pageSize, orientation, marginMm: Number(margin), title: name,
        onProgress: (i, n) => setProgress(n ? Math.round((i / n) * 100) : 0)
      });
      downloadBlob(blob, `${(name || 'images').trim()}.pdf`);
      notify?.({ severity: 'success', message: `PDF created with ${items.length} page${items.length === 1 ? '' : 's'} (${formatBytes(blob.size)}).` });
    } catch (e) {
      console.error(e);
      setError(e.message || 'The PDF could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tool-body">
      {items.length === 0 ? (
        <DropZone accept={IMAGE_ACCEPT} multiple onFiles={addFiles} title="Choose images or drop them here" hint="JPG, PNG, WebP, GIF or BMP. Each image becomes one page." />
      ) : (
        <div className="tool-split">
          <div className="tool-main">
            <div className="tool-thumbs">
              {items.map((x, i) => (
                <figure key={x.id} className="tool-thumb">
                  <div className="tool-thumb-img">
                    <img src={x.url} alt="" style={{ transform: `rotate(${x.rotate}deg)` }} />
                    <span className="tool-thumb-num">{i + 1}</span>
                  </div>
                  <figcaption title={x.file.name}>{x.file.name}</figcaption>
                  <div className="tool-thumb-actions">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowUpwardIcon sx={{ fontSize: 16 }} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later"><ArrowDownwardIcon sx={{ fontSize: 16 }} /></button>
                    <button type="button" onClick={() => rotate(x.id)} aria-label="Rotate"><RotateRightIcon sx={{ fontSize: 16 }} /></button>
                    <button type="button" onClick={() => remove(x.id)} aria-label="Remove" className="is-danger"><DeleteOutlineIcon sx={{ fontSize: 16 }} /></button>
                  </div>
                </figure>
              ))}
              <DropZone accept={IMAGE_ACCEPT} multiple onFiles={addFiles} title="Add more" compact />
            </div>
          </div>
          <aside className="tool-side">
            <Segmented label="Page size" value={pageSize} onChange={setPageSize} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'fit', label: 'Fit image' }]} />
            {pageSize !== 'fit' && (
              <Segmented label="Orientation" value={orientation} onChange={setOrientation} options={[{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
            )}
            <Segmented label="Margin" value={margin} onChange={setMargin} options={[{ value: 0, label: 'None' }, { value: 10, label: 'Small' }, { value: 20, label: 'Large' }]} />
            <label className="tool-opt">
              <span className="tool-opt-label">File name</span>
              <input className="tool-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <ErrorNote>{error}</ErrorNote>
            {busy && <LinearProgress variant="determinate" value={progress} />}
            <Button variant="contained" disableElevation size="large" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <FileDownloadOutlinedIcon />} onClick={build} disabled={busy}>
              {busy ? 'Creating PDF…' : `Create PDF (${items.length} page${items.length === 1 ? '' : 's'})`}
            </Button>
            <Button variant="text" startIcon={<RestartAltIcon />} onClick={clear} disabled={busy}>Start over</Button>
          </aside>
        </div>
      )}
      {items.length === 0 && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* ── 2. Word → PDF ─────────────────────────────────────── */

const WordToPdf = ({ notify }) => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [css, setCss] = useState('');
  const [name, setName] = useState('');
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async ([f]) => {
    setError('');
    setResult(null);
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) { setError('This file is over 50 MB. Choose a smaller document.'); return; }
    setFile(f);
    setName(baseName(f.name));
    setReading(true);
    try {
      const [{ docxToHtml }, exporter] = await Promise.all([loadDocx(), loadExporter()]);
      setCss(exporter.DOC_EXPORT_CSS || '');
      const out = await docxToHtml(f);
      if (!out.html.replace(/<[^>]+>/g, '').trim() && !/<img/.test(out.html)) throw new Error('This document looks empty.');
      setResult(out);
    } catch (e) {
      console.error(e);
      setError(e.message || 'This document could not be read.');
      setFile(null);
    } finally {
      setReading(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    setError('');
    try {
      const { downloadDocAsPdf } = await loadExporter();
      await downloadDocAsPdf((name || 'document').trim(), result.html);
      notify?.({ severity: 'success', message: `"${name || 'document'}.pdf" downloaded.` });
    } catch (e) {
      console.error(e);
      setError('The PDF could not be created. Try again, or try a smaller document.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(''); };

  return (
    <div className="tool-body">
      {!file && (
        <DropZone accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onFiles={pick} title="Choose a Word document or drop it here" hint="Word documents in .docx format, up to 50 MB." />
      )}
      {reading && <div className="tool-wait"><CircularProgress size={22} /> Reading “{file?.name}”…</div>}
      {file && result && (
        <div className="tool-split">
          <div className="tool-main">
            <div className="tool-preview-label">Preview</div>
            <div className="tool-paper-scroll">
              <div className="tool-paper">
                <style>{css}</style>
                {/* Generated from the user's own file in this tab; images are inline data URLs */}
                <div className="doc-export" dangerouslySetInnerHTML={{ __html: result.html }} />
              </div>
            </div>
          </div>
          <aside className="tool-side">
            <div className="tool-file">
              <DescriptionOutlinedIcon />
              <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
            </div>
            <label className="tool-opt">
              <span className="tool-opt-label">PDF name</span>
              <input className="tool-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            {result.warnings.map((w) => <div key={w} className="tool-warn">{w}</div>)}
            <p className="tool-note">The PDF is laid out on A4 pages. Complex layouts (text boxes, columns, headers and footers) may look different from Word.</p>
            <ErrorNote>{error}</ErrorNote>
            <Button variant="contained" disableElevation size="large" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <FileDownloadOutlinedIcon />} onClick={exportPdf} disabled={busy}>
              {busy ? 'Creating PDF…' : 'Download PDF'}
            </Button>
            <Button variant="text" startIcon={<RestartAltIcon />} onClick={reset} disabled={busy}>Convert another file</Button>
          </aside>
        </div>
      )}
      {!file && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* ── 3. Image compressor ───────────────────────────────── */

const MAX_DIMS = [
  { value: 0, label: 'Original' },
  { value: 2560, label: '2560 px' },
  { value: 1920, label: '1920 px' },
  { value: 1280, label: '1280 px' }
];

const ImageCompressor = ({ notify }) => {
  const { make, drop } = useObjectUrls();
  const [items, setItems] = useState([]);
  const [quality, setQuality] = useState(70);
  const [format, setFormat] = useState('image/jpeg');
  const [maxDim, setMaxDim] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addFiles = (files) => {
    setError('');
    const images = files.filter((f) => /^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type));
    if (images.length < files.length) setError('Only JPG, PNG, WebP, GIF and BMP images can be compressed.');
    const ok = images.filter((f) => f.size <= MAX_FILE_BYTES);
    if (ok.length < images.length) setError('Images over 50 MB were skipped.');
    setItems((prev) => [...prev, ...ok.map((file) => ({ id: newId('c'), file, url: make(file), result: null }))]);
  };

  // Settings changed → previous results are stale
  useEffect(() => {
    setItems((prev) => prev.map((x) => { if (x.result) drop(x.result.url); return x.result ? { ...x, result: null } : x; }));
  }, [quality, format, maxDim, drop]);

  const compressOne = async (file) => {
    const bmp = await decodeImage(file);
    const src = sizeOf(bmp);
    const target = fitWithin(src.width, src.height, maxDim);
    const canvas = drawToCanvas(bmp, { ...target, background: format === 'image/jpeg' ? '#ffffff' : null });
    if (bmp.close) bmp.close();
    const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality / 100);
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    // Never hand back something bigger than what came in
    if (blob.size >= file.size) {
      return { blob: file, keptOriginal: true, width: src.width, height: src.height, name: file.name };
    }
    return { blob, keptOriginal: false, width: target.width, height: target.height, name: `${baseName(file.name)}-compressed.${ext}` };
  };

  const run = async () => {
    setBusy(true);
    setError('');
    let failed = 0;
    for (const item of items) {
      if (item.result) continue;
      try {
        const r = await compressOne(item.file);
        const url = make(r.blob);
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, result: { ...r, url } } : x)));
      } catch (e) {
        console.error(e);
        failed += 1;
      }
    }
    setBusy(false);
    if (failed) setError(`${failed} image${failed > 1 ? 's' : ''} couldn’t be compressed in this browser.`);
  };

  const remove = (id) => setItems((prev) => prev.filter((x) => {
    if (x.id === id) { drop(x.url); drop(x.result?.url); }
    return x.id !== id;
  }));
  const clear = () => { items.forEach((x) => { drop(x.url); drop(x.result?.url); }); setItems([]); setError(''); };

  const done = items.filter((x) => x.result);
  const before = done.reduce((s, x) => s + x.file.size, 0);
  const after = done.reduce((s, x) => s + x.result.blob.size, 0);
  const pending = items.some((x) => !x.result);

  const downloadAll = async () => {
    if (done.length === 1) { downloadBlob(done[0].result.blob, done[0].result.name); return; }
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const used = new Set();
    done.forEach((x) => {
      let n = x.result.name;
      let k = 2;
      while (used.has(n)) { n = n.replace(/(\.[^.]+)$/, `-${k}$1`); k += 1; }
      used.add(n);
      zip.file(n, x.result.blob);
    });
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'compressed-images.zip');
    notify?.({ severity: 'success', message: `${done.length} images downloaded as a ZIP.` });
  };

  return (
    <div className="tool-body">
      {items.length === 0 ? (
        <DropZone accept={IMAGE_ACCEPT} multiple onFiles={addFiles} title="Choose images or drop them here" hint="JPG, PNG, WebP, GIF or BMP, up to 50 MB each." />
      ) : (
        <div className="tool-split">
          <div className="tool-main">
            <ul className="tool-rows">
              {items.map((x) => (
                <li key={x.id}>
                  <img src={x.result?.url || x.url} alt="" />
                  <div className="tool-row-main">
                    <strong title={x.file.name}>{x.file.name}</strong>
                    <span>
                      {formatBytes(x.file.size)}
                      {x.result && (x.result.keptOriginal
                        ? ' · already well optimized, original kept'
                        : ` → ${formatBytes(x.result.blob.size)} · ${x.result.width}×${x.result.height}`)}
                    </span>
                  </div>
                  {x.result && !x.result.keptOriginal && (
                    <span className="tool-saved">−{savedPercent(x.file.size, x.result.blob.size)}%</span>
                  )}
                  {x.result ? (
                    <button type="button" className="tool-icon-btn" onClick={() => downloadBlob(x.result.blob, x.result.name)} aria-label={`Download ${x.result.name}`}>
                      <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
                    </button>
                  ) : busy ? <CircularProgress size={18} /> : null}
                  <button type="button" className="tool-icon-btn is-danger" onClick={() => remove(x.id)} aria-label="Remove"><DeleteOutlineIcon sx={{ fontSize: 20 }} /></button>
                </li>
              ))}
            </ul>
            <DropZone accept={IMAGE_ACCEPT} multiple onFiles={addFiles} title="Add more images" compact />
          </div>
          <aside className="tool-side">
            <div className="tool-opt">
              <span className="tool-opt-label">Quality <b>{format === 'image/png' ? 'lossless' : `${quality}%`}</b></span>
              <Slider value={quality} min={30} max={95} step={5} onChange={(_, v) => setQuality(v)} disabled={format === 'image/png'} size="small" aria-label="Quality" />
              <span className="tool-opt-hint">Lower quality makes smaller files. 60–80% looks the same to most people.</span>
            </div>
            <Segmented label="Save as" value={format} onChange={setFormat} options={[{ value: 'image/jpeg', label: 'JPG' }, { value: 'image/webp', label: 'WebP' }, { value: 'image/png', label: 'PNG' }]} />
            <Segmented label="Longest side" value={maxDim} onChange={setMaxDim} options={MAX_DIMS} />
            {done.length > 0 && (
              <div className="tool-total">
                <span>{formatBytes(before)} → <strong>{formatBytes(after)}</strong></span>
                <em>{savedPercent(before, after)}% smaller in total</em>
              </div>
            )}
            <ErrorNote>{error}</ErrorNote>
            {pending ? (
              <Button variant="contained" disableElevation size="large" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PhotoSizeSelectLargeOutlinedIcon />} onClick={run} disabled={busy}>
                {busy ? 'Compressing…' : `Compress ${items.filter((x) => !x.result).length} image${items.filter((x) => !x.result).length === 1 ? '' : 's'}`}
              </Button>
            ) : (
              <Button variant="contained" disableElevation size="large" startIcon={<FileDownloadOutlinedIcon />} onClick={downloadAll}>
                {done.length === 1 ? 'Download image' : `Download all (.zip)`}
              </Button>
            )}
            <Button variant="text" startIcon={<RestartAltIcon />} onClick={clear} disabled={busy}>Start over</Button>
          </aside>
        </div>
      )}
      {items.length === 0 && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* ── 4. PDF compressor ─────────────────────────────────── */

const PDF_LEVELS = [
  { value: 'light', label: 'Light' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'maximum', label: 'Maximum' }
];

const PdfCompressor = ({ notify }) => {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});

  useEffect(() => {
    let alive = true;
    loadPdfTools().then((m) => { if (alive) setNotes(m.COMPRESSION_LEVELS); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { setResult(null); }, [level, file]);

  const pick = ([f]) => {
    setError('');
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setError('Choose a PDF file.'); return; }
    if (f.size > MAX_FILE_BYTES) { setError('This PDF is over 50 MB. Choose a smaller file.'); return; }
    setFile(f);
  };

  const run = async () => {
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const { compressPdf } = await loadPdfTools();
      const r = await compressPdf(file, level, (i, n) => setProgress(n ? Math.round((i / n) * 100) : 0));
      setResult(r);
    } catch (e) {
      console.error(e);
      setError(e.message || 'This PDF could not be compressed.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result?.smaller) return;
    downloadBlob(result.blob, `${baseName(file.name)}-compressed.pdf`);
    notify?.({ severity: 'success', message: `Saved ${formatBytes(result.before - result.after)}.` });
  };

  return (
    <div className="tool-body">
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={pick} title="Choose a PDF or drop it here" hint="Up to 50 MB. Password-protected PDFs aren’t supported." />
      ) : (
        <div className="tool-split">
          <div className="tool-main">
            <div className="tool-file is-large">
              <PictureAsPdfOutlinedIcon />
              <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
              <button type="button" className="tool-icon-btn is-danger" onClick={() => { setFile(null); setResult(null); }} aria-label="Remove" disabled={busy}><DeleteOutlineIcon sx={{ fontSize: 20 }} /></button>
            </div>

            {busy && (
              <div className="tool-wait is-block">
                <LinearProgress variant={progress ? 'determinate' : 'indeterminate'} value={progress} />
                <span>{level === 'maximum' ? 'Rendering pages…' : 'Compressing images inside the PDF…'}</span>
              </div>
            )}

            {result && (
              <div className={`tool-result ${result.smaller ? 'is-good' : ''}`}>
                {result.smaller ? (
                  <>
                    <div className="tool-result-figure">−{savedPercent(result.before, result.after)}%</div>
                    <div>
                      <strong>{formatBytes(result.before)} → {formatBytes(result.after)}</strong>
                      <span>
                        {level === 'maximum'
                          ? `${result.pages} page${result.pages === 1 ? '' : 's'} rebuilt as images.`
                          : `${result.replaced} of ${result.images} image${result.images === 1 ? '' : 's'} recompressed. Text is unchanged.`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>
                    <strong>This PDF is already well compressed.</strong>
                    <span>{level === 'maximum' ? 'Rebuilding it as images wouldn’t make it smaller.' : 'Try Maximum for a smaller file, though its text won’t be selectable.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="tool-side">
            <Segmented label="Compression" value={level} onChange={setLevel} options={PDF_LEVELS} />
            {notes[level] && <p className="tool-note">{notes[level].note}</p>}
            <ErrorNote>{error}</ErrorNote>
            {result?.smaller ? (
              <Button variant="contained" disableElevation size="large" startIcon={<FileDownloadOutlinedIcon />} onClick={download}>
                Download compressed PDF
              </Button>
            ) : (
              <Button variant="contained" disableElevation size="large" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <CompressOutlinedIcon />} onClick={run} disabled={busy || Boolean(result)}>
                {busy ? 'Compressing…' : 'Compress PDF'}
              </Button>
            )}
            <Button variant="text" startIcon={<RestartAltIcon />} onClick={() => { setFile(null); setResult(null); setError(''); }} disabled={busy}>Choose another PDF</Button>
          </aside>
        </div>
      )}
      {!file && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* ── Panel ─────────────────────────────────────────────── */

const DemoTool = ({ toolId, notify }) => {
  const tool = useMemo(() => DEMO_TOOLS.find((t) => t.id === toolId) || DEMO_TOOLS[0], [toolId]);
  return (
    <div className="tool-shell">
      <ToolHeader tool={tool} />
      {tool.id === 'img2pdf' && <ImageToPdf notify={notify} />}
      {tool.id === 'word2pdf' && <WordToPdf notify={notify} />}
      {tool.id === 'imgcompress' && <ImageCompressor notify={notify} />}
      {tool.id === 'pdfcompress' && <PdfCompressor notify={notify} />}
    </div>
  );
};

export default DemoTool;
