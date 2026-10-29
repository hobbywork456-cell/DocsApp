import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { diffLines, diffWords } from 'diff';
import { detectType, toComparableText } from '../../utils/docText';
import './DocumentComparer.css';

const TYPE_LABEL = { doc: 'Document', sheet: 'Spreadsheet', ppt: 'Presentation' };
const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const splitLines = (value) => {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

// Build aligned rows for the side-by-side view
const buildRows = (left, right, opts) => {
  const parts = diffLines(left, right, { ignoreWhitespace: opts.ignoreWhitespace, ignoreCase: opts.ignoreCase });
  const rows = [];
  let ln = 1, rn = 1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      splitLines(part.value).forEach((line) => rows.push({ type: 'same', left: line, right: line, ln: ln++, rn: rn++ }));
      continue;
    }
    if (part.removed && parts[i + 1]?.added) {
      const a = splitLines(part.value);
      const b = splitLines(parts[i + 1].value);
      for (let k = 0; k < Math.max(a.length, b.length); k++) {
        const l = a[k], r = b[k];
        if (l !== undefined && r !== undefined) rows.push({ type: 'modified', left: l, right: r, ln: ln++, rn: rn++ });
        else if (l !== undefined) rows.push({ type: 'removed', left: l, ln: ln++ });
        else rows.push({ type: 'added', right: r, rn: rn++ });
      }
      i++;
      continue;
    }
    splitLines(part.value).forEach((line) => {
      if (part.removed) rows.push({ type: 'removed', left: line, ln: ln++ });
      else rows.push({ type: 'added', right: line, rn: rn++ });
    });
  }
  return rows;
};

// Group consecutive changed rows into navigable change blocks; collapse long unchanged runs
const groupRows = (rows) => {
  const blocks = [];
  let changeIndex = 0;
  let i = 0;
  while (i < rows.length) {
    if (rows[i].type === 'same') {
      const start = i;
      while (i < rows.length && rows[i].type === 'same') i++;
      blocks.push({ kind: 'same', rows: rows.slice(start, i) });
    } else {
      const start = i;
      while (i < rows.length && rows[i].type !== 'same') i++;
      blocks.push({ kind: 'change', rows: rows.slice(start, i), changeIndex: changeIndex++ });
    }
  }
  return { blocks, changeCount: changeIndex };
};

const CONTEXT = 3;

const WordDiff = ({ a, b, side, opts }) => {
  const parts = diffWords(a, b, { ignoreCase: opts.ignoreCase });
  return parts.map((p, i) => {
    if (side === 'left' && p.added) return null;
    if (side === 'right' && p.removed) return null;
    if (p.added || p.removed) return <span key={i} className={p.added ? 'cmp-word-add' : 'cmp-word-del'}>{p.value}</span>;
    return <span key={i}>{p.value}</span>;
  });
};

const DocumentComparer = ({ doc1, doc2, onClose }) => {
  const [swapped, setSwapped] = useState(false);
  const [view, setView] = useState('split'); // 'split' | 'inline'
  const [opts, setOpts] = useState({ ignoreCase: false, ignoreWhitespace: false });
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState({});
  const bodyRef = useRef(null);

  const original = swapped ? doc2 : doc1;
  const revised = swapped ? doc1 : doc2;

  useEffect(() => {
    setResult(null);
    // Let the loading state paint before diffing large documents
    const timer = setTimeout(() => {
      const left = original ? toComparableText(original) : '';
      const right = revised ? toComparableText(revised) : '';
      const rows = buildRows(left, right, opts);
      const grouped = groupRows(rows);
      const words = diffWords(left, right, { ignoreCase: opts.ignoreCase });
      let added = 0, removed = 0;
      words.forEach((p) => {
        if (p.added) added += countWords(p.value);
        else if (p.removed) removed += countWords(p.value);
      });
      const total = countWords(left) + countWords(right);
      const similarity = total ? Math.max(0, Math.round((1 - (added + removed) / total) * 100)) : 100;
      setResult({ left, right, rows, ...grouped, words, added, removed, similarity });
      setCurrent(0);
      setExpanded({});
    }, 30);
    return () => clearTimeout(timer);
  }, [original, revised, opts]);

  const goTo = useCallback((idx) => {
    if (!result || !result.changeCount) return;
    const n = (idx + result.changeCount) % result.changeCount;
    setCurrent(n);
    const el = bodyRef.current?.querySelector(`[data-change="${n}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [result]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'F7' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); goTo(current + 1); }
      if (e.shiftKey && e.key === 'F7') { e.preventDefault(); goTo(current - 1); }
      if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); goTo(current - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, current, onClose]);

  const typeA = detectType(original);
  const typeB = detectType(revised);

  // Inline (redline) change indexes: adjacent removed+added parts form one change
  const inlineParts = useMemo(() => {
    if (!result) return [];
    let idx = -1;
    let prevChanged = false;
    return result.words.map((p) => {
      const changed = p.added || p.removed;
      if (changed && !prevChanged) idx++;
      prevChanged = changed;
      return { ...p, changeIndex: changed ? idx : null };
    });
  }, [result]);
  const inlineChangeCount = inlineParts.reduce((m, p) => (p.changeIndex !== null ? Math.max(m, p.changeIndex + 1) : m), 0);
  const changeTotal = view === 'split' ? result?.changeCount || 0 : inlineChangeCount;

  const goToInline = (idx) => {
    if (!inlineChangeCount) return;
    const n = (idx + inlineChangeCount) % inlineChangeCount;
    setCurrent(n);
    bodyRef.current?.querySelector(`[data-change="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const nav = (d) => (view === 'split' ? goTo(current + d) : goToInline(current + d));

  const renderRow = (row, key) => (
    <div key={key} className={`cmp-row cmp-${row.type}`}>
      <div className="cmp-cell cmp-left">
        <span className="cmp-ln">{row.ln ?? ''}</span>
        <span className="cmp-text">
          {row.type === 'modified' ? <WordDiff a={row.left} b={row.right} side="left" opts={opts} /> : row.left ?? ''}
        </span>
      </div>
      <div className="cmp-cell cmp-right">
        <span className="cmp-ln">{row.rn ?? ''}</span>
        <span className="cmp-text">
          {row.type === 'modified' ? <WordDiff a={row.left} b={row.right} side="right" opts={opts} /> : row.right ?? ''}
        </span>
      </div>
    </div>
  );

  return (
    <Box className="cmp-root">
      {/* Header */}
      <Box className="cmp-header">
        <Box className="cmp-title-wrap">
          <Box className="cmp-icon"><CompareArrowsIcon fontSize="small" /></Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="cmp-title">Compare documents</Typography>
            <Box className="cmp-docs">
              <span className="cmp-doc-pill cmp-doc-original" title={original?.title}>
                <b>Original</b> {original?.title || 'Untitled'}
              </span>
              <Tooltip title="Swap original and revised">
                <IconButton size="small" onClick={() => setSwapped((s) => !s)} className="cmp-swap">
                  <SwapHorizIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <span className="cmp-doc-pill cmp-doc-revised" title={revised?.title}>
                <b>Revised</b> {revised?.title || 'Untitled'}
              </span>
            </Box>
          </Box>
        </Box>
        <Tooltip title="Close comparison (Esc)">
          <IconButton onClick={onClose} className="cmp-close">
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Toolbar */}
      <Box className="cmp-toolbar">
        <Box className="cmp-segment" role="tablist" aria-label="View">
          <button type="button" className={view === 'split' ? 'active' : ''} onClick={() => { setView('split'); setCurrent(0); }}>
            <ViewColumnIcon sx={{ fontSize: 16 }} /> Side by side
          </button>
          <button type="button" className={view === 'inline' ? 'active' : ''} onClick={() => { setView('inline'); setCurrent(0); }}>
            <ViewStreamIcon sx={{ fontSize: 16 }} /> Inline redline
          </button>
        </Box>

        <label className="cmp-check">
          <input type="checkbox" checked={opts.ignoreCase} onChange={(e) => setOpts((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          Ignore case
        </label>
        <label className="cmp-check">
          <input type="checkbox" checked={opts.ignoreWhitespace} onChange={(e) => setOpts((o) => ({ ...o, ignoreWhitespace: e.target.checked }))} />
          Ignore whitespace
        </label>

        {result && (
          <Box className="cmp-stats">
            <span className="cmp-stat cmp-stat-add">+{result.added.toLocaleString()} words</span>
            <span className="cmp-stat cmp-stat-del">−{result.removed.toLocaleString()} words</span>
            <span className="cmp-stat">{result.similarity}% similar</span>
          </Box>
        )}

        <Box className="cmp-nav">
          <span className="cmp-nav-label">
            {changeTotal ? `Change ${Math.min(current + 1, changeTotal)} of ${changeTotal}` : 'No changes'}
          </span>
          <Tooltip title="Previous change (Shift+F7)">
            <span>
              <IconButton size="small" disabled={!changeTotal} onClick={() => nav(-1)}><KeyboardArrowUpIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next change (F7)">
            <span>
              <IconButton size="small" disabled={!changeTotal} onClick={() => nav(1)}><KeyboardArrowDownIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {typeA !== typeB && (
        <Box className="cmp-notice">
          Comparing a {TYPE_LABEL[typeA].toLowerCase()} with a {TYPE_LABEL[typeB].toLowerCase()} — only their text content is compared.
        </Box>
      )}

      {/* Body */}
      {!result ? (
        <Box className="cmp-loading">
          <CircularProgress size={40} thickness={4} sx={{ color: '#1f8a5b' }} />
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>Analysing differences…</Typography>
        </Box>
      ) : !result.left && !result.right ? (
        <Box className="cmp-loading"><Typography variant="body2">Both documents are empty.</Typography></Box>
      ) : view === 'split' ? (
        <Box className="cmp-body" ref={bodyRef}>
          <div className="cmp-split-head">
            <div><span className="cmp-dot cmp-dot-del" /> {original?.title || 'Original'} <em>{TYPE_LABEL[typeA]}</em></div>
            <div><span className="cmp-dot cmp-dot-add" /> {revised?.title || 'Revised'} <em>{TYPE_LABEL[typeB]}</em></div>
          </div>
          {result.changeCount === 0 && (
            <div className="cmp-identical">✓ No differences found{opts.ignoreCase || opts.ignoreWhitespace ? ' with the current options' : ''}.</div>
          )}
          {result.blocks.map((block, bi) => {
            if (block.kind === 'change') {
              return (
                <div key={bi} data-change={block.changeIndex} className={`cmp-block${block.changeIndex === current ? ' cmp-current' : ''}`}>
                  {block.rows.map((row, ri) => renderRow(row, `${bi}-${ri}`))}
                </div>
              );
            }
            const rows = block.rows;
            const isFirst = bi === 0;
            const isLast = bi === result.blocks.length - 1;
            if (expanded[bi] || rows.length <= CONTEXT * 2 + 2) return rows.map((row, ri) => renderRow(row, `${bi}-${ri}`));
            const head = isFirst ? [] : rows.slice(0, CONTEXT);
            const tail = isLast ? [] : rows.slice(-CONTEXT);
            const hidden = rows.length - head.length - tail.length;
            return (
              <React.Fragment key={bi}>
                {head.map((row, ri) => renderRow(row, `${bi}-h${ri}`))}
                <button type="button" className="cmp-fold" onClick={() => setExpanded((x) => ({ ...x, [bi]: true }))}>
                  <UnfoldMoreIcon sx={{ fontSize: 15 }} /> Show {hidden} unchanged {hidden === 1 ? 'line' : 'lines'}
                </button>
                {tail.map((row, ri) => renderRow(row, `${bi}-t${ri}`))}
              </React.Fragment>
            );
          })}
        </Box>
      ) : (
        <Box className="cmp-body cmp-inline-body" ref={bodyRef}>
          <article className="cmp-paper">
            {inlineChangeCount === 0 && <div className="cmp-identical">✓ No differences found.</div>}
            {inlineParts.map((p, i) => {
              if (p.added) return <ins key={i} data-change={p.changeIndex} className={p.changeIndex === current ? 'cmp-current' : ''}>{p.value}</ins>;
              if (p.removed) return <del key={i} data-change={p.changeIndex} className={p.changeIndex === current ? 'cmp-current' : ''}>{p.value}</del>;
              return <span key={i}>{p.value}</span>;
            })}
          </article>
        </Box>
      )}

      {/* Legend */}
      <Box className="cmp-legend">
        <span><i className="cmp-swatch cmp-swatch-del" /> Removed from original</span>
        <span><i className="cmp-swatch cmp-swatch-add" /> Added in revised</span>
        <span><i className="cmp-swatch cmp-swatch-mod" /> Changed line</span>
        <span className="cmp-legend-note">Compares the last saved versions · F7 / Shift+F7 to step through changes</span>
      </Box>
    </Box>
  );
};

export default DocumentComparer;
