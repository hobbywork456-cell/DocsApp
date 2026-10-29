import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import SpreadsheetToolbar from './SpreadsheetToolbar';
import SpreadsheetFormulaBar from './SpreadsheetFormulaBar';
import SpreadsheetGrid from './SpreadsheetGrid';
import SpreadsheetTabs from './SpreadsheetTabs';
import {
  getInitialWorkbook,
  exportSheetToCSV,
  createSheetEvaluator,
  formatCellValue,
  parseCoord,
  toCoord,
  shiftFormula,
  offsetFormula
} from './spreadsheetUtils';
import '../SpreadsheetEditor.css';

const MAX_HISTORY = 100;
const FORMAT_KEYS = ['bold', 'italic', 'underline', 'strike', 'color', 'bg', 'align', 'valign', 'wrap', 'border', 'format', 'decimals',
  'currencySymbol', 'fontFamily', 'fontSize', 'styleType', 'indent', 'orientation'];

const parseWorkbook = (content) => {
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.sheets && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) return parsed;
    } catch {
      // Not a workbook - fall through to template
    }
  }
  return getInitialWorkbook();
};

const normRange = (a, b) => ({
  r1: Math.min(a.row, b.row),
  r2: Math.max(a.row, b.row),
  c1: Math.min(a.col, b.col),
  c2: Math.max(a.col, b.col)
});

const rangeLabel = (rg) => {
  const a = toCoord(rg.r1, rg.c1);
  return rg.r1 === rg.r2 && rg.c1 === rg.c2 ? a : `${a}:${toCoord(rg.r2, rg.c2)}`;
};

const hasContent = (cell) => cell && ((cell.value !== undefined && cell.value !== '') || cell.formula);

// Parse clipboard text (TSV from Excel/Sheets, or plain text) into a 2D array
const parseClipboardText = (text) => {
  const rows = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  return rows.map((r) => r.split('\t'));
};

const SpreadsheetEditor = ({ content, onChange, readOnly = false }) => {
  const [workbook, setWorkbook] = useState(() => parseWorkbook(content));
  const workbookRef = useRef(workbook);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [historyLens, setHistoryLens] = useState({ undo: 0, redo: 0 });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const activeSheet = useMemo(
    () => workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0],
    [workbook]
  );

  // Selection: `anchor` is the active cell, `focus` is the moving end of a range
  const [anchor, setAnchor] = useState({ row: 1, col: 0 });
  const [focus, setFocus] = useState({ row: 1, col: 0 });
  const selection = useMemo(() => normRange(anchor, focus), [anchor, focus]);
  const [editingCell, setEditingCell] = useState(null);
  const [cellInputText, setCellInputText] = useState('');
  const [formulaBarText, setFormulaBarText] = useState('');
  const [isFormulaBarEditing, setIsFormulaBarEditing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [findState, setFindState] = useState({ query: '', matches: [], index: -1 });

  const clipboardRef = useRef(null); // { matrix, range, sheetId, cut }
  const [cutRange, setCutRange] = useState(null);

  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const formatPainterRef = useRef(null);

  const containerRef = useRef(null);

  const activeCoord = toCoord(anchor.row, anchor.col);
  const activeCellData = useMemo(() => activeSheet?.cells?.[activeCoord] || {}, [activeSheet, activeCoord]);

  // One memoised evaluator per sheet state; it caches every computed cell value
  const evaluator = useMemo(
    () => createSheetEvaluator(activeSheet.cells || {}, { sheets: workbook.sheets }),
    [activeSheet, workbook.sheets]
  );

  const rawText = useCallback((cell) => {
    if (!cell) return '';
    if (cell.formula) return cell.formula;
    return cell.value !== undefined && cell.value !== null ? String(cell.value) : '';
  }, []);

  // Keep formula bar in sync with the active cell unless the user is typing into it
  useEffect(() => {
    if (!isFormulaBarEditing) setFormulaBarText(editingCell ? cellInputText : rawText(activeCellData));
  }, [activeCellData, editingCell, cellInputText, isFormulaBarEditing, rawText]);

  // Synchronise when content changes externally (loading, switching docs, server refresh)
  const lastContentRef = useRef(content);
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      lastContentRef.current = content;
      const parsed = parseWorkbook(content);
      workbookRef.current = parsed;
      setWorkbook(parsed);
      undoRef.current = [];
      redoRef.current = [];
    }
  }, [content]);

  // ── Core commit: every mutation goes through here so it is undoable and never uses stale state ──
  const commit = useCallback((next, { record = true } = {}) => {
    if (record) {
      undoRef.current.push(workbookRef.current);
      if (undoRef.current.length > MAX_HISTORY) undoRef.current.shift();
      redoRef.current = [];
    }
    workbookRef.current = next;
    setWorkbook(next);
    setHistoryLens({ undo: undoRef.current.length, redo: redoRef.current.length });
    const serialized = JSON.stringify(next);
    lastContentRef.current = serialized;
    if (onChangeRef.current) onChangeRef.current(serialized);
  }, []);

  const mutateSheet = useCallback((fn) => {
    if (readOnly) return;
    const wb = workbookRef.current;
    const idx = wb.sheets.findIndex((s) => s.id === wb.activeSheetId);
    const i = idx === -1 ? 0 : idx;
    const sheet = wb.sheets[i];
    const nextSheet = fn({ ...sheet, cells: { ...sheet.cells } });
    if (!nextSheet) return;
    const sheets = [...wb.sheets];
    sheets[i] = nextSheet;
    commit({ ...wb, sheets });
  }, [commit, readOnly]);

  const undo = useCallback(() => {
    if (readOnly || !undoRef.current.length) return;
    redoRef.current.push(workbookRef.current);
    commit(undoRef.current.pop(), { record: false });
  }, [commit, readOnly]);

  const redo = useCallback(() => {
    if (readOnly || !redoRef.current.length) return;
    undoRef.current.push(workbookRef.current);
    commit(redoRef.current.pop(), { record: false });
  }, [commit, readOnly]);

  const forEachInSelection = (fn) => {
    for (let r = selection.r1; r <= selection.r2; r++) {
      for (let c = selection.c1; c <= selection.c2; c++) fn(r, c, toCoord(r, c));
    }
  };

  // ── Cell value commit ──
  const commitCellValue = useCallback((coord, text) => {
    mutateSheet((sheet) => {
      const prev = sheet.cells[coord] || {};
      if (rawText(prev) === text) return null;
      const str = String(text ?? '');
      if (str.startsWith('=') && str.length > 1) {
        sheet.cells[coord] = { ...prev, formula: str, value: undefined };
      } else {
        const next = { ...prev, value: str };
        delete next.formula;
        sheet.cells[coord] = next;
      }
      return sheet;
    });
  }, [mutateSheet, rawText]);

  // ── Formatting (applies to the whole selection) ──
  const applyFormatting = useCallback((property, val) => {
    if (readOnly) return;
    if (property === 'merge') {
      mutateSheet((sheet) => {
        const { r1, r2, c1, c2 } = selection;
        // Remove merges intersecting the selection first
        Object.entries(sheet.cells).forEach(([coord, cell]) => {
          if (!cell.mergeRows && !cell.mergeCols) return;
          const p = parseCoord(coord);
          const pr2 = p.row + (cell.mergeRows || 1) - 1;
          const pc2 = p.col + (cell.mergeCols || 1) - 1;
          if (p.row <= r2 && pr2 >= r1 && p.col <= c2 && pc2 >= c1) {
            const { mergeRows: _mr, mergeCols: _mc, ...rest } = cell;
            sheet.cells[coord] = rest;
          }
        });
        if (val && (r2 > r1 || c2 > c1)) {
          const tl = toCoord(r1, c1);
          sheet.cells[tl] = { ...(sheet.cells[tl] || {}), mergeRows: r2 - r1 + 1, mergeCols: c2 - c1 + 1 };
          if (val === 'center') sheet.cells[tl].align = 'center';
        }
        return sheet;
      });
      return;
    }
    if (property === 'value') {
      // Legacy toolbar path - write to the active cell
      commitCellValue(activeCoord, val);
      return;
    }
    mutateSheet((sheet) => {
      forEachInSelection((r, c, coord) => {
        const prev = sheet.cells[coord] || {};
        sheet.cells[coord] = { ...prev, [property]: val };
        if (val === undefined || val === null) delete sheet.cells[coord][property];
      });
      return sheet;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, mutateSheet, selection, activeCoord, commitCellValue]);

  const applyCellStyle = useCallback((styleType) => {
    mutateSheet((sheet) => {
      forEachInSelection((r, c, coord) => {
        const prev = sheet.cells[coord] || {};
        if (styleType === 'normal') {
          const { styleType: _s, bg: _b, color: _c, border: _br, ...rest } = prev;
          sheet.cells[coord] = { ...rest, bold: false };
        } else {
          sheet.cells[coord] = { ...prev, styleType };
        }
      });
      return sheet;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutateSheet, selection]);

  const applyNumberFormat = useCallback((formatId) => {
    applyFormatting('format', formatId === 'general' ? undefined : formatId);
  }, [applyFormatting]);

  const handleClear = useCallback((clearType = 'all') => {
    mutateSheet((sheet) => {
      forEachInSelection((r, c, coord) => {
        const prev = sheet.cells[coord];
        if (!prev) return;
        if (clearType === 'all') {
          delete sheet.cells[coord];
        } else if (clearType === 'contents') {
          const { formula: _f, ...rest } = prev;
          sheet.cells[coord] = { ...rest, value: '' };
        } else if (clearType === 'formats') {
          const next = {};
          if (prev.value !== undefined) next.value = prev.value;
          if (prev.formula) next.formula = prev.formula;
          sheet.cells[coord] = next;
        }
      });
      return sheet;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutateSheet, selection]);

  // ── AutoSum: sums the selected block, or the contiguous numbers above/left of the active cell ──
  const handleAutoSum = useCallback((func = 'SUM') => {
    if (readOnly) return;
    const fn = func.toUpperCase();
    const cells = activeSheet.cells;
    if (selection.r2 > selection.r1 || selection.c2 > selection.c1) {
      // Put a total under each selected column
      mutateSheet((sheet) => {
        const targetRow = selection.r2 + 1;
        for (let c = selection.c1; c <= selection.c2; c++) {
          const coord = toCoord(targetRow, c);
          sheet.cells[coord] = { ...(sheet.cells[coord] || {}), formula: `=${fn}(${toCoord(selection.r1, c)}:${toCoord(selection.r2, c)})`, value: undefined };
        }
        sheet.rowCount = Math.max(sheet.rowCount, targetRow);
        return sheet;
      });
      return;
    }
    const isNum = (coord) => typeof evaluator.displayCoord(coord) === 'number' && hasContent(cells[coord]);
    let r = anchor.row - 1;
    while (r >= 1 && isNum(toCoord(r, anchor.col))) r--;
    let rangeStr;
    if (r + 1 < anchor.row) {
      rangeStr = `${toCoord(r + 1, anchor.col)}:${toCoord(anchor.row - 1, anchor.col)}`;
    } else {
      let c = anchor.col - 1;
      while (c >= 0 && isNum(toCoord(anchor.row, c))) c--;
      rangeStr = c + 1 < anchor.col
        ? `${toCoord(anchor.row, c + 1)}:${toCoord(anchor.row, anchor.col - 1)}`
        : `${toCoord(1, anchor.col)}:${toCoord(Math.max(1, anchor.row - 1), anchor.col)}`;
    }
    commitCellValue(activeCoord, `=${fn}(${rangeStr})`);
  }, [readOnly, activeSheet, selection, anchor, activeCoord, evaluator, mutateSheet, commitCellValue]);

  // ── Sort the selection (or the whole data block) by the active column ──
  const handleSort = useCallback((direction = 'asc') => {
    mutateSheet((sheet) => {
      const multiRow = selection.r2 > selection.r1;
      let r1 = multiRow ? selection.r1 : 1;
      let r2 = multiRow ? selection.r2 : 0;
      const c1 = multiRow ? selection.c1 : 0;
      const c2 = multiRow ? selection.c2 : sheet.colCount - 1;
      if (!multiRow) {
        Object.keys(sheet.cells).forEach((coord) => {
          const p = parseCoord(coord);
          if (p && hasContent(sheet.cells[coord])) r2 = Math.max(r2, p.row);
        });
        // Treat a bold first row as a header (Excel's "My data has headers")
        const headerCell = sheet.cells[toCoord(1, anchor.col)];
        if (headerCell?.bold || sheet.cells.A1?.bold) r1 = 2;
      }
      if (r2 <= r1) return null;
      const ev = createSheetEvaluator(sheet.cells, { sheets: workbookRef.current.sheets });
      const rows = [];
      for (let r = r1; r <= r2; r++) {
        const rowCells = {};
        for (let c = c1; c <= c2; c++) rowCells[c] = sheet.cells[toCoord(r, c)];
        rows.push({ r, rowCells, key: ev.display(r, anchor.col) });
      }
      rows.sort((a, b) => {
        const x = a.key, y = b.key;
        if (x === '' && y !== '') return 1;
        if (y === '' && x !== '') return -1;
        const res = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? res : -res;
      });
      rows.forEach((item, i) => {
        const target = r1 + i;
        for (let c = c1; c <= c2; c++) {
          const coord = toCoord(target, c);
          const cell = item.rowCells[c];
          if (cell) sheet.cells[coord] = cell.formula ? { ...cell, formula: offsetFormula(cell.formula, target - item.r, 0) } : cell;
          else delete sheet.cells[coord];
        }
      });
      return sheet;
    });
  }, [mutateSheet, selection, anchor.col]);

  // ── Clipboard ──
  const copySelection = useCallback((cut = false) => {
    const matrix = [];
    const textRows = [];
    for (let r = selection.r1; r <= selection.r2; r++) {
      const row = [];
      const textRow = [];
      for (let c = selection.c1; c <= selection.c2; c++) {
        const cell = activeSheet.cells[toCoord(r, c)];
        row.push(cell ? { ...cell } : null);
        textRow.push(cell ? formatCellValue(evaluator.display(r, c), cell) : '');
      }
      matrix.push(row);
      textRows.push(textRow.join('\t'));
    }
    const text = textRows.join('\n');
    clipboardRef.current = { matrix, range: { ...selection }, sheetId: activeSheet.id, cut, text };
    setCutRange(cut ? { ...selection } : null);
    return text;
  }, [selection, activeSheet, evaluator]);

  const pasteAt = useCallback((text) => {
    if (readOnly) return;
    const clip = clipboardRef.current;
    const internal = clip && (text === undefined || text === clip.text);
    mutateSheet((sheet) => {
      const top = selection.r1;
      const left = selection.c1;
      if (internal) {
        const h = clip.matrix.length;
        const w = clip.matrix[0].length;
        // A selection that is a multiple of the copied block gets tiled, like Excel
        const tileR = Math.max(1, Math.floor((selection.r2 - selection.r1 + 1) / h));
        const tileC = Math.max(1, Math.floor((selection.c2 - selection.c1 + 1) / w));
        if (clip.cut && clip.sheetId === sheet.id) {
          for (let r = clip.range.r1; r <= clip.range.r2; r++)
            for (let c = clip.range.c1; c <= clip.range.c2; c++) delete sheet.cells[toCoord(r, c)];
        }
        for (let tr = 0; tr < tileR; tr++) for (let tc = 0; tc < tileC; tc++) {
          clip.matrix.forEach((row, i) => row.forEach((cell, j) => {
            const r = top + tr * h + i;
            const c = left + tc * w + j;
            const coord = toCoord(r, c);
            if (!cell) { delete sheet.cells[coord]; return; }
            const dRow = r - (clip.range.r1 + i);
            const dCol = c - (clip.range.c1 + j);
            sheet.cells[coord] = cell.formula && !clip.cut ? { ...cell, formula: offsetFormula(cell.formula, dRow, dCol) } : { ...cell };
            sheet.rowCount = Math.max(sheet.rowCount, r);
            sheet.colCount = Math.max(sheet.colCount, c + 1);
          }));
        }
      } else {
        const matrix = parseClipboardText(text || '');
        matrix.forEach((row, i) => row.forEach((val, j) => {
          const r = top + i;
          const c = left + j;
          const coord = toCoord(r, c);
          const prev = sheet.cells[coord] || {};
          if (val.startsWith('=')) sheet.cells[coord] = { ...prev, formula: val, value: undefined };
          else {
            const next = { ...prev, value: val };
            delete next.formula;
            sheet.cells[coord] = next;
          }
          sheet.rowCount = Math.max(sheet.rowCount, r);
          sheet.colCount = Math.max(sheet.colCount, c + 1);
        }));
      }
      return sheet;
    });
    if (clip?.cut) {
      clipboardRef.current = null;
      setCutRange(null);
    }
  }, [readOnly, mutateSheet, selection]);

  const handleToolbarCopy = useCallback(async (cut = false) => {
    const text = copySelection(cut);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Internal clipboard still works without permission
    }
  }, [copySelection]);

  const handleToolbarPaste = useCallback(async () => {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = undefined;
    }
    pasteAt(text);
  }, [pasteAt]);

  // ── Fill down / right (Ctrl+D / Ctrl+R) and fill-handle drag ──
  const fillRange = useCallback((source, target) => {
    mutateSheet((sheet) => {
      const srcH = source.r2 - source.r1 + 1;
      const srcW = source.c2 - source.c1 + 1;
      const vertical = target.r2 > source.r2 || target.r1 < source.r1;
      // Linear series when the source run is all plain numbers (1,2 -> 3,4,5)
      const seriesStep = (getter, len) => {
        if (len < 2) return null;
        const vals = [];
        for (let k = 0; k < len; k++) {
          const cell = getter(k);
          if (!cell || cell.formula || cell.value === '' || isNaN(Number(cell.value))) return null;
          vals.push(Number(cell.value));
        }
        const step = vals[1] - vals[0];
        for (let k = 2; k < vals.length; k++) if (Math.abs(vals[k] - vals[k - 1] - step) > 1e-9) return null;
        return { last: vals[vals.length - 1], step };
      };
      for (let r = target.r1; r <= target.r2; r++) {
        for (let c = target.c1; c <= target.c2; c++) {
          if (r >= source.r1 && r <= source.r2 && c >= source.c1 && c <= source.c2) continue;
          const sr = source.r1 + (((r - source.r1) % srcH) + srcH) % srcH;
          const sc = source.c1 + (((c - source.c1) % srcW) + srcW) % srcW;
          const srcCell = sheet.cells[toCoord(sr, sc)];
          const coord = toCoord(r, c);
          const series = vertical
            ? seriesStep((k) => sheet.cells[toCoord(source.r1 + k, c)], srcH)
            : seriesStep((k) => sheet.cells[toCoord(r, source.c1 + k)], srcW);
          if (series) {
            const n = vertical ? r - source.r2 : c - source.c2;
            sheet.cells[coord] = { ...(srcCell || {}), value: String(series.last + series.step * n) };
          } else if (!srcCell) {
            delete sheet.cells[coord];
          } else {
            sheet.cells[coord] = srcCell.formula ? { ...srcCell, formula: offsetFormula(srcCell.formula, r - sr, c - sc) } : { ...srcCell };
          }
          sheet.rowCount = Math.max(sheet.rowCount, r);
          sheet.colCount = Math.max(sheet.colCount, c + 1);
        }
      }
      return sheet;
    });
  }, [mutateSheet]);

  const handleFill = useCallback((direction) => {
    const { r1, r2, c1, c2 } = selection;
    if (direction === 'down') {
      if (r2 === r1) return;
      fillRange({ r1, r2: r1, c1, c2 }, selection);
    } else {
      if (c2 === c1) return;
      fillRange({ r1, r2, c1, c2: c1 }, selection);
    }
  }, [selection, fillRange]);

  // ── Format painter ──
  const toggleFormatPainter = useCallback((active) => {
    if (active) {
      const fmt = {};
      FORMAT_KEYS.forEach((k) => {
        fmt[k] = activeCellData[k];
      });
      formatPainterRef.current = fmt;
      setFormatPainterActive(true);
      document.body.classList.add('excel-painter-active');
    } else {
      formatPainterRef.current = null;
      setFormatPainterActive(false);
      document.body.classList.remove('excel-painter-active');
    }
  }, [activeCellData]);

  useEffect(() => () => document.body.classList.remove('excel-painter-active'), []);

  const applyPainterTo = useCallback((rg) => {
    const fmt = formatPainterRef.current;
    if (!fmt) return;
    mutateSheet((sheet) => {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) {
        const coord = toCoord(r, c);
        const next = { ...(sheet.cells[coord] || {}) };
        FORMAT_KEYS.forEach((k) => {
          if (fmt[k] === undefined) delete next[k];
          else next[k] = fmt[k];
        });
        sheet.cells[coord] = next;
      }
      return sheet;
    });
    toggleFormatPainter(false);
  }, [mutateSheet, toggleFormatPainter]);

  // ── Row / column structure (formulas are re-pointed like Excel) ──
  const restructure = useCallback((axis, at, delta) => {
    mutateSheet((sheet) => {
      const cells = {};
      Object.entries(sheet.cells).forEach(([coord, cell]) => {
        const p = parseCoord(coord);
        if (!p) return;
        let { row, col } = p;
        const pos = axis === 'row' ? row : col;
        if (delta < 0 && pos >= at && pos < at - delta) return;
        if (pos >= at) {
          if (axis === 'row') row += delta;
          else col += delta;
        }
        cells[toCoord(row, col)] = cell.formula ? { ...cell, formula: shiftFormula(cell.formula, axis, at, delta) } : cell;
      });
      const next = { ...sheet, cells };
      if (axis === 'row') next.rowCount = Math.max(1, sheet.rowCount + delta);
      else {
        next.colCount = Math.max(1, sheet.colCount + delta);
        if (sheet.colWidths) {
          const widths = {};
          Object.entries(sheet.colWidths).forEach(([k, w]) => {
            const c = Number(k);
            if (delta < 0 && c >= at && c < at - delta) return;
            widths[c >= at ? c + delta : c] = w;
          });
          next.colWidths = widths;
        }
      }
      return next;
    });
  }, [mutateSheet]);

  const insertRow = (below = false) => {
    const count = selection.r2 - selection.r1 + 1;
    restructure('row', below ? selection.r2 + 1 : selection.r1, count);
  };
  const deleteRow = () => {
    const count = selection.r2 - selection.r1 + 1;
    if (activeSheet.rowCount - count < 1) return;
    restructure('row', selection.r1, -count);
    setAnchor({ row: Math.min(selection.r1, activeSheet.rowCount - count), col: anchor.col });
    setFocus({ row: Math.min(selection.r1, activeSheet.rowCount - count), col: anchor.col });
  };
  const insertColumn = (right = false) => {
    const count = selection.c2 - selection.c1 + 1;
    restructure('col', right ? selection.c2 + 1 : selection.c1, count);
  };
  const deleteColumn = () => {
    const count = selection.c2 - selection.c1 + 1;
    if (activeSheet.colCount - count < 1) return;
    restructure('col', selection.c1, -count);
    setAnchor({ row: anchor.row, col: Math.min(selection.c1, activeSheet.colCount - count - 1) });
    setFocus({ row: anchor.row, col: Math.min(selection.c1, activeSheet.colCount - count - 1) });
  };

  const setColumnWidth = useCallback((col, width) => {
    mutateSheet((sheet) => ({ ...sheet, colWidths: { ...(sheet.colWidths || {}), [col]: Math.max(32, Math.round(width)) } }));
  }, [mutateSheet]);

  const autoFitColumns = useCallback(() => {
    mutateSheet((sheet) => {
      const widths = { ...(sheet.colWidths || {}) };
      const ev = createSheetEvaluator(sheet.cells, { sheets: workbookRef.current.sheets });
      for (let c = selection.c1; c <= selection.c2; c++) {
        let max = 4;
        for (let r = 1; r <= sheet.rowCount; r++) {
          const cell = sheet.cells[toCoord(r, c)];
          if (!cell) continue;
          const text = formatCellValue(ev.display(r, c), cell);
          const sizeFactor = cell.fontSize ? parseFloat(cell.fontSize) / 11 : 1;
          max = Math.max(max, String(text).length * sizeFactor * (cell.bold ? 1.1 : 1));
        }
        widths[c] = Math.min(480, Math.max(48, Math.round(max * 7.5 + 18)));
      }
      return { ...sheet, colWidths: widths };
    });
  }, [mutateSheet, selection]);

  // ── Sheets ──
  const handleAddSheet = () => {
    if (readOnly) return;
    const wb = workbookRef.current;
    const id = `sheet${Date.now()}`;
    let n = wb.sheets.length + 1;
    while (wb.sheets.some((s) => s.name === `Sheet${n}`)) n++;
    commit({ ...wb, activeSheetId: id, sheets: [...wb.sheets, { id, name: `Sheet${n}`, rowCount: 50, colCount: 15, cells: {} }] });
    resetSelection();
  };

  const handleDeleteSheet = (sheetId) => {
    const wb = workbookRef.current;
    if (readOnly || wb.sheets.length <= 1) return;
    const sheet = wb.sheets.find((s) => s.id === sheetId);
    const hasData = Object.values(sheet?.cells || {}).some(hasContent);
    if (hasData && !window.confirm(`Delete "${sheet.name}"? This sheet contains data.`)) return;
    const filtered = wb.sheets.filter((s) => s.id !== sheetId);
    commit({ ...wb, activeSheetId: wb.activeSheetId === sheetId ? filtered[0].id : wb.activeSheetId, sheets: filtered });
  };

  const handleRenameSheet = (sheetId, name) => {
    const wb = workbookRef.current;
    const clean = name.trim().slice(0, 31);
    if (readOnly || !clean || wb.sheets.some((s) => s.id !== sheetId && s.name.toLowerCase() === clean.toLowerCase())) return;
    commit({ ...wb, sheets: wb.sheets.map((s) => (s.id === sheetId ? { ...s, name: clean } : s)) });
  };

  const handleDuplicateSheet = (sheetId) => {
    const wb = workbookRef.current;
    const src = wb.sheets.find((s) => s.id === sheetId);
    if (readOnly || !src) return;
    const id = `sheet${Date.now()}`;
    let name = `${src.name} (2)`;
    let k = 2;
    while (wb.sheets.some((s) => s.name === name)) name = `${src.name} (${++k})`;
    const idx = wb.sheets.indexOf(src);
    const sheets = [...wb.sheets];
    sheets.splice(idx + 1, 0, { ...JSON.parse(JSON.stringify(src)), id, name });
    commit({ ...wb, activeSheetId: id, sheets });
  };

  const handleSelectSheet = (sheetId) => {
    const wb = workbookRef.current;
    if (wb.activeSheetId === sheetId) return;
    // Switching tabs is not an undoable edit, but it is persisted so the doc reopens on the same sheet
    commit({ ...wb, activeSheetId: sheetId }, { record: false });
    resetSelection();
  };

  function resetSelection() {
    setEditingCell(null);
    setAnchor({ row: 1, col: 0 });
    setFocus({ row: 1, col: 0 });
  }

  // ── Editing lifecycle ──
  const startEditing = useCallback((initialText) => {
    if (readOnly) return;
    setEditingCell({ row: anchor.row, col: anchor.col });
    setCellInputText(initialText !== undefined ? initialText : rawText(activeCellData));
  }, [readOnly, anchor, activeCellData, rawText]);

  const finishEditing = useCallback((move) => {
    if (!editingCell) return;
    commitCellValue(toCoord(editingCell.row, editingCell.col), cellInputText);
    setEditingCell(null);
    if (move) moveActive(move.dr, move.dc);
    requestAnimationFrame(() => containerRef.current?.focus({ preventScroll: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, cellInputText, commitCellValue]);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    requestAnimationFrame(() => containerRef.current?.focus({ preventScroll: true }));
  }, []);

  const clampRow = (r) => Math.max(1, Math.min(activeSheet.rowCount, r));
  const clampCol = (c) => Math.max(0, Math.min(activeSheet.colCount - 1, c));

  function moveActive(dr, dc, extend = false) {
    if (extend) {
      setFocus((f) => ({ row: clampRow(f.row + dr), col: clampCol(f.col + dc) }));
      return;
    }
    const next = { row: clampRow(anchor.row + dr), col: clampCol(anchor.col + dc) };
    setAnchor(next);
    setFocus(next);
  }

  // Ctrl+Arrow: jump to the edge of the current data region, like Excel
  const jumpTarget = (from, dr, dc) => {
    const filled = (r, c) => hasContent(activeSheet.cells[toCoord(r, c)]);
    let { row, col } = from;
    const inBounds = (r, c) => r >= 1 && r <= activeSheet.rowCount && c >= 0 && c < activeSheet.colCount;
    if (!inBounds(row + dr, col + dc)) return from;
    const startFilled = filled(row, col) && filled(row + dr, col + dc);
    while (inBounds(row + dr, col + dc)) {
      row += dr;
      col += dc;
      if (startFilled ? !filled(row + dr, col + dc) : filled(row, col)) break;
    }
    return { row, col };
  };

  // ── Grid mouse interactions ──
  const handleCellMouseDown = useCallback((row, col, e) => {
    // While typing a formula, clicking a cell inserts its reference (Excel "point mode")
    if (editingCell && /^=/.test(cellInputText) && /[=+\-*/(,:^&<>]$/.test(cellInputText)) {
      e.preventDefault();
      setCellInputText((t) => t + toCoord(row, col));
      return false;
    }
    if (editingCell) finishEditing();
    if (e.shiftKey) {
      setFocus({ row, col });
    } else {
      setAnchor({ row, col });
      setFocus({ row, col });
    }
    return true;
  }, [editingCell, cellInputText, finishEditing]);

  const handleSelectionDragEnd = useCallback((rg) => {
    if (formatPainterActive) applyPainterTo(rg);
  }, [formatPainterActive, applyPainterTo]);

  const handleHeaderSelect = useCallback((axis, index, extend) => {
    if (editingCell) finishEditing();
    if (axis === 'col') {
      if (extend) setFocus({ row: activeSheet.rowCount, col: index });
      else {
        setAnchor({ row: 1, col: index });
        setFocus({ row: activeSheet.rowCount, col: index });
      }
    } else if (axis === 'row') {
      if (extend) setFocus({ row: index, col: activeSheet.colCount - 1 });
      else {
        setAnchor({ row: index, col: 0 });
        setFocus({ row: index, col: activeSheet.colCount - 1 });
      }
    } else {
      setAnchor({ row: 1, col: 0 });
      setFocus({ row: activeSheet.rowCount, col: activeSheet.colCount - 1 });
    }
  }, [editingCell, finishEditing, activeSheet]);

  // ── Keyboard ──
  const handleContainerKeyDown = (e) => {
    if (editingCell || isFormulaBarEditing) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key;

    if (mod) {
      const k = key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
      if (k === 'b') { e.preventDefault(); applyFormatting('bold', !activeCellData.bold); return; }
      if (k === 'i') { e.preventDefault(); applyFormatting('italic', !activeCellData.italic); return; }
      if (k === 'u') { e.preventDefault(); applyFormatting('underline', !activeCellData.underline); return; }
      if (k === 'a') { e.preventDefault(); handleHeaderSelect('all'); return; }
      if (k === 'd') { e.preventDefault(); handleFill('down'); return; }
      if (k === 'r') { e.preventDefault(); handleFill('right'); return; }
      if (k === 'f') { e.stopPropagation(); return; }
      if (key === 'Home') { e.preventDefault(); setAnchor({ row: 1, col: 0 }); setFocus({ row: 1, col: 0 }); return; }
      if (key.startsWith('Arrow')) {
        e.preventDefault();
        const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
        const from = e.shiftKey ? focus : anchor;
        const t = jumpTarget(from, d[0], d[1]);
        if (e.shiftKey) setFocus(t);
        else { setAnchor(t); setFocus(t); }
        return;
      }
      return; // let copy/cut/paste events fire natively
    }

    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[key]) {
      e.preventDefault();
      moveActive(arrows[key][0], arrows[key][1], e.shiftKey);
    } else if (key === 'Tab') {
      e.preventDefault();
      moveActive(0, e.shiftKey ? -1 : 1);
    } else if (key === 'Enter') {
      e.preventDefault();
      moveActive(e.shiftKey ? -1 : 1, 0);
    } else if (key === 'Home') {
      e.preventDefault();
      setAnchor({ row: anchor.row, col: 0 });
      setFocus({ row: anchor.row, col: 0 });
    } else if (key === 'PageDown' || key === 'PageUp') {
      e.preventDefault();
      moveActive(key === 'PageDown' ? 20 : -20, 0, e.shiftKey);
    } else if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      handleClear('contents');
    } else if (key === 'F2') {
      e.preventDefault();
      startEditing();
    } else if (key === 'Escape') {
      clipboardRef.current = null;
      setCutRange(null);
      if (formatPainterActive) toggleFormatPainter(false);
    } else if (key.length === 1 && !e.altKey && !readOnly) {
      // Typing replaces the cell content, exactly like Excel
      e.preventDefault();
      startEditing(key);
    }
  };

  const handleCopyEvent = (e) => {
    if (editingCell || isFormulaBarEditing || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', copySelection(false));
  };
  const handleCutEvent = (e) => {
    if (readOnly || editingCell || isFormulaBarEditing || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', copySelection(true));
  };
  const handlePasteEvent = (e) => {
    if (readOnly || editingCell || isFormulaBarEditing || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    pasteAt(e.clipboardData.getData('text/plain'));
  };

  // ── Cell editor & formula bar ──
  const handleCellInputKeyDown = (e) => {
    if (e.key === 'Enter' && e.altKey) {
      // Alt+Enter inserts a line break inside the cell
      e.preventDefault();
      setCellInputText((t) => `${t}\n`);
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); finishEditing({ dr: e.shiftKey ? -1 : 1, dc: 0 }); }
    else if (e.key === 'Tab') { e.preventDefault(); finishEditing({ dr: 0, dc: e.shiftKey ? -1 : 1 }); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEditing(); }
  };

  const handleFormulaBarKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCellValue(activeCoord, formulaBarText);
      setIsFormulaBarEditing(false);
      moveActive(1, 0);
      containerRef.current?.focus({ preventScroll: true });
    } else if (e.key === 'Escape') {
      setIsFormulaBarEditing(false);
      setFormulaBarText(rawText(activeCellData));
      containerRef.current?.focus({ preventScroll: true });
    }
  };

  const handleFormulaBarChange = (text) => {
    setIsFormulaBarEditing(true);
    setFormulaBarText(text);
  };

  const handleFormulaBarBlur = () => {
    if (isFormulaBarEditing) {
      commitCellValue(activeCoord, formulaBarText);
      setIsFormulaBarEditing(false);
    }
  };

  const handleNameBoxJump = (text) => {
    const parts = text.toUpperCase().split(':');
    const a = parseCoord(parts[0] || '');
    if (!a) return;
    const b = parts[1] ? parseCoord(parts[1]) : a;
    if (!b) return;
    const ca = { row: clampRow(a.row), col: clampCol(a.col) };
    setAnchor(ca);
    setFocus({ row: clampRow(b.row), col: clampCol(b.col) });
    containerRef.current?.focus({ preventScroll: true });
  };

  // ── Find ──
  const handleFind = useCallback((query, direction = 1) => {
    if (!query) {
      setFindState({ query: '', matches: [], index: -1 });
      return;
    }
    let matches = findState.matches;
    if (query !== findState.query) {
      const q = query.toLowerCase();
      matches = [];
      for (let r = 1; r <= activeSheet.rowCount; r++) {
        for (let c = 0; c < activeSheet.colCount; c++) {
          const cell = activeSheet.cells[toCoord(r, c)];
          if (!cell) continue;
          const shown = String(formatCellValue(evaluator.display(r, c), cell)).toLowerCase();
          if (shown.includes(q) || rawText(cell).toLowerCase().includes(q)) matches.push({ row: r, col: c });
        }
      }
    }
    if (!matches.length) {
      setFindState({ query, matches, index: -1 });
      return;
    }
    const index = query !== findState.query ? 0 : (findState.index + direction + matches.length) % matches.length;
    setFindState({ query, matches, index });
    setAnchor(matches[index]);
    setFocus(matches[index]);
  }, [findState, activeSheet, evaluator, rawText]);

  // ── Status bar aggregates for the current selection ──
  const selectionStats = useMemo(() => {
    const cellCount = (selection.r2 - selection.r1 + 1) * (selection.c2 - selection.c1 + 1);
    if (cellCount < 2 || cellCount > 20000) return null;
    let sum = 0, count = 0, numCount = 0, min = Infinity, max = -Infinity;
    for (let r = selection.r1; r <= selection.r2; r++) {
      for (let c = selection.c1; c <= selection.c2; c++) {
        const cell = activeSheet.cells[toCoord(r, c)];
        if (!hasContent(cell)) continue;
        count++;
        const v = evaluator.display(r, c);
        if (typeof v === 'number') {
          sum += v;
          numCount++;
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    if (!count) return null;
    return { count, numCount, sum, avg: numCount ? sum / numCount : null, min, max };
  }, [selection, activeSheet, evaluator]);

  const isMultiSelect = selection.r2 > selection.r1 || selection.c2 > selection.c1;

  return (
    <Box
      ref={containerRef}
      className={`spreadsheet-container ${formatPainterActive ? 'painter-mode' : ''}`}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onCopy={handleCopyEvent}
      onCut={handleCutEvent}
      onPaste={handlePasteEvent}
    >
      {!readOnly && (
        <SpreadsheetToolbar
          activeCellData={activeCellData}
          activeCoord={activeCoord}
          selectedCell={anchor}
          applyFormatting={applyFormatting}
          applyCellStyle={applyCellStyle}
          applyNumberFormat={applyNumberFormat}
          handleAutoSum={handleAutoSum}
          handleSort={handleSort}
          handleClear={handleClear}
          insertRow={insertRow}
          deleteRow={deleteRow}
          insertColumn={insertColumn}
          deleteColumn={deleteColumn}
          handleAddSheet={handleAddSheet}
          onExportCSV={() => exportSheetToCSV(activeSheet, `${activeSheet.name}.csv`, workbook)}
          formatPainterActive={formatPainterActive}
          setFormatPainterActive={toggleFormatPainter}
          onCopy={() => handleToolbarCopy(false)}
          onCut={() => handleToolbarCopy(true)}
          onPaste={handleToolbarPaste}
          onFill={handleFill}
          onAutoFit={autoFitColumns}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyLens.undo > 0}
          canRedo={historyLens.redo > 0}
          onFind={handleFind}
          findInfo={{ count: findState.matches.length, index: findState.index, query: findState.query }}
          readOnly={readOnly}
        />
      )}

      <SpreadsheetFormulaBar
        activeCoord={isMultiSelect ? rangeLabel(selection) : activeCoord}
        formulaBarText={formulaBarText}
        setFormulaBarText={handleFormulaBarChange}
        handleFormulaBarKeyDown={handleFormulaBarKeyDown}
        handleFormulaBarBlur={handleFormulaBarBlur}
        onNameBoxSubmit={handleNameBoxJump}
        isEditing={isFormulaBarEditing || !!editingCell}
        onCancel={() => {
          if (editingCell) cancelEditing();
          setIsFormulaBarEditing(false);
          setFormulaBarText(rawText(activeCellData));
        }}
        onConfirm={() => {
          if (editingCell) finishEditing();
          else if (isFormulaBarEditing) {
            commitCellValue(activeCoord, formulaBarText);
            setIsFormulaBarEditing(false);
          }
        }}
        readOnly={readOnly}
      />

      <SpreadsheetGrid
        activeSheet={activeSheet}
        evaluator={evaluator}
        anchor={anchor}
        selection={selection}
        cutRange={cutRange}
        editingCell={editingCell}
        cellInputText={cellInputText}
        setCellInputText={setCellInputText}
        onCellMouseDown={handleCellMouseDown}
        onExtendSelection={(row, col) => setFocus({ row, col })}
        onSelectionDragEnd={handleSelectionDragEnd}
        onCellDoubleClick={() => startEditing()}
        onHeaderSelect={handleHeaderSelect}
        onFillDrag={fillRange}
        onColumnResize={setColumnWidth}
        handleCellInputBlur={() => finishEditing()}
        handleCellInputKeyDown={handleCellInputKeyDown}
        zoom={zoom}
        readOnly={readOnly}
      />

      <SpreadsheetTabs
        sheets={workbook.sheets}
        activeSheetId={workbook.activeSheetId}
        onSelectSheet={handleSelectSheet}
        onAddSheet={handleAddSheet}
        onDeleteSheet={handleDeleteSheet}
        onRenameSheet={handleRenameSheet}
        onDuplicateSheet={handleDuplicateSheet}
        selectionStats={selectionStats}
        zoom={zoom}
        setZoom={setZoom}
        readOnly={readOnly}
      />
    </Box>
  );
};

export default SpreadsheetEditor;
