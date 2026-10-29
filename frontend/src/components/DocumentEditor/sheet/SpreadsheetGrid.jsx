import React, { useLayoutEffect, useRef, useState, useEffect, useMemo, memo } from 'react';
import { Box } from '@mui/material';
import { getColLetter, formatCellValue, toCoord, parseCoord, FUNCTION_NAMES } from './spreadsheetUtils';

const DEFAULT_COL_WIDTH = 100;
const ROW_HEADER_WIDTH = 46;

const STYLE_PRESETS = {
  bad: { color: '#9c0006', bg: '#ffc7ce' },
  good: { color: '#006100', bg: '#c6efce' },
  neutral: { color: '#9c6500', bg: '#ffeb9c' },
  calculation: { color: '#fa7d00', bg: '#f2f2f2' },
  check: { color: '#ffffff', bg: '#a5a5a5' },
  heading1: { color: '#1f3864' },
  total: {}
};

const BORDER = '1px solid #1f2937';

export const getCellStyle = (cell, value) => {
  const preset = STYLE_PRESETS[cell.styleType] || {};
  const isNumber = typeof value === 'number';
  const isCentered = typeof value === 'boolean' || (typeof value === 'string' && /^#[A-Z/0-9]+[!?]$/.test(value)) || value === 'TRUE' || value === 'FALSE';
  const style = {
    fontWeight: cell.bold || ['heading1', 'total', 'calculation', 'check'].includes(cell.styleType) ? 700 : undefined,
    fontStyle: cell.italic ? 'italic' : undefined,
    textDecoration: [cell.underline ? (cell.underline === 'double' ? 'underline double' : 'underline') : '', cell.strike ? 'line-through' : '']
      .filter(Boolean).join(' ') || undefined,
    fontFamily: cell.fontFamily || undefined,
    fontSize: cell.fontSize || (cell.styleType === 'heading1' ? '15pt' : undefined),
    // A filled cell without its own font colour gets dark text, so light fills stay readable in dark mode
    color: cell.color || preset.color || (cell.bg || preset.bg ? '#111827' : undefined),
    backgroundColor: cell.bg || preset.bg,
    textAlign: cell.align || (isNumber ? 'right' : isCentered ? 'center' : 'left'),
    verticalAlign: cell.valign || 'bottom',
    whiteSpace: cell.wrap ? 'pre-wrap' : 'pre',
    paddingLeft: cell.indent ? `${cell.indent * 12 + 6}px` : undefined
  };
  const b = cell.border;
  if (b === 'all' || b === 'thick') {
    const line = b === 'thick' ? '2px solid #111827' : BORDER;
    style.borderTop = line; style.borderBottom = line; style.borderLeft = line; style.borderRight = line;
  }
  if (b === 'top') style.borderTop = BORDER;
  if (b === 'left') style.borderLeft = BORDER;
  if (b === 'right') style.borderRight = BORDER;
  if (b === 'bottom' || cell.styleType === 'heading1') style.borderBottom = cell.styleType === 'heading1' ? '2px solid #4472c4' : BORDER;
  if (b === 'double-bottom' || cell.styleType === 'total') {
    style.borderBottom = '3px double #111827';
    if (cell.styleType === 'total') style.borderTop = '1px solid #4472c4';
  }
  return style;
};

const orientationStyle = (o) => {
  if (o === 'vertical') return { writingMode: 'vertical-rl', textOrientation: 'upright' };
  if (o === 'counterclockwise') return { display: 'inline-block', transform: 'rotate(-45deg)' };
  if (o === 'clockwise') return { display: 'inline-block', transform: 'rotate(45deg)' };
  return undefined;
};

const GridRow = memo(function GridRow({ rowNum, cells, evaluator, colCount, spans, covered, editor, editingCol, isRowActive }) {
  const tds = [];
  for (let c = 0; c < colCount; c++) {
    const coord = toCoord(rowNum, c);
    if (covered.has(coord)) continue;
    const cell = cells[coord];
    const span = spans[coord];
    if (editingCol === c) {
      tds.push(
        <td key={c} data-row={rowNum} data-col={c} className="grid-cell editing" colSpan={span?.cols} rowSpan={span?.rows}>
          {editor}
        </td>
      );
      continue;
    }
    if (!cell) {
      tds.push(<td key={c} data-row={rowNum} data-col={c} className="grid-cell" colSpan={span?.cols} rowSpan={span?.rows} />);
      continue;
    }
    const value = evaluator.display(rowNum, c);
    const text = formatCellValue(value, cell);
    const isError = typeof value === 'string' && /^#[A-Z/0-9]+[!?]$/.test(value);
    tds.push(
      <td
        key={c}
        data-row={rowNum}
        data-col={c}
        className={`grid-cell${isError ? ' cell-error' : ''}${cell.formula ? ' has-formula' : ''}`}
        style={getCellStyle(cell, value)}
        colSpan={span?.cols}
        rowSpan={span?.rows}
        title={isError ? `${value} — check the formula ${cell.formula || ''}` : undefined}
      >
        {cell.orientation && cell.orientation !== 'normal'
          ? <span style={orientationStyle(cell.orientation)}>{text}</span>
          : text}
      </td>
    );
  }
  return (
    <tr>
      <th className={`row-header${isRowActive ? ' selected-header' : ''}`} data-header-row={rowNum}>{rowNum}</th>
      {tds}
    </tr>
  );
});

const SpreadsheetGrid = ({
  activeSheet,
  evaluator,
  anchor,
  selection,
  cutRange,
  editingCell,
  cellInputText,
  setCellInputText,
  onCellMouseDown,
  onExtendSelection,
  onSelectionDragEnd,
  onCellDoubleClick,
  onHeaderSelect,
  onFillDrag,
  onColumnResize,
  handleCellInputBlur,
  handleCellInputKeyDown,
  zoom = 100,
  readOnly
}) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const dragRef = useRef(null); // 'select' | 'fill' | null
  const selectionRef = useRef(selection);
  const fillTargetRef = useRef(null);
  const [overlay, setOverlay] = useState(null);
  const [activeRect, setActiveRect] = useState(null);
  const [cutRect, setCutRect] = useState(null);
  const [fillTarget, setFillTarget] = useState(null);
  const [fillRect, setFillRect] = useState(null);
  const [liveWidths, setLiveWidths] = useState({});
  const [suggestIndex, setSuggestIndex] = useState(0);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const { rowCount, colCount, cells } = activeSheet;
  const colWidth = (c) => liveWidths[c] ?? activeSheet.colWidths?.[c] ?? DEFAULT_COL_WIDTH;

  // Merged cell geometry
  const { spans, covered } = useMemo(() => {
    const sp = {};
    const cov = new Set();
    Object.entries(cells).forEach(([coord, cell]) => {
      if (!cell || (!(cell.mergeRows > 1) && !(cell.mergeCols > 1))) return;
      const p = parseCoord(coord);
      if (!p) return;
      const rows = cell.mergeRows || 1;
      const cols = cell.mergeCols || 1;
      sp[coord] = { rows, cols };
      for (let r = p.row; r < p.row + rows; r++) for (let c = p.col; c < p.col + cols; c++) {
        if (r !== p.row || c !== p.col) cov.add(toCoord(r, c));
      }
    });
    return { spans: sp, covered: cov };
  }, [cells]);

  const rectFor = (rg) => {
    const inner = innerRef.current;
    if (!inner || !rg) return null;
    const tl = inner.querySelector(`td[data-row="${rg.r1}"][data-col="${rg.c1}"]`) || findCovering(rg.r1, rg.c1);
    const br = inner.querySelector(`td[data-row="${rg.r2}"][data-col="${rg.c2}"]`) || findCovering(rg.r2, rg.c2);
    if (!tl || !br) return null;
    const left = Math.min(tl.offsetLeft, br.offsetLeft);
    const top = Math.min(tl.offsetTop, br.offsetTop);
    return {
      left,
      top,
      width: Math.max(tl.offsetLeft + tl.offsetWidth, br.offsetLeft + br.offsetWidth) - left,
      height: Math.max(tl.offsetTop + tl.offsetHeight, br.offsetTop + br.offsetHeight) - top
    };
  };

  // A covered cell is drawn by its merge origin
  function findCovering(row, col) {
    for (const [coord, sp] of Object.entries(spans)) {
      const p = parseCoord(coord);
      if (row >= p.row && row < p.row + sp.rows && col >= p.col && col < p.col + sp.cols) {
        return innerRef.current.querySelector(`td[data-row="${p.row}"][data-col="${p.col}"]`);
      }
    }
    return null;
  }

  useLayoutEffect(() => {
    setOverlay(rectFor(selection));
    setActiveRect(rectFor({ r1: anchor.row, r2: anchor.row, c1: anchor.col, c2: anchor.col }));
    setCutRect(cutRange ? rectFor(cutRange) : null);
    setFillRect(fillTarget ? rectFor(fillTarget) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, anchor, cutRange, fillTarget, activeSheet, liveWidths, zoom, editingCell, spans]);

  // Keep the active cell scrolled into view
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !activeRect) return;
    const scale = zoom / 100;
    const top = activeRect.top * scale;
    const left = activeRect.left * scale;
    const bottom = top + activeRect.height * scale;
    const right = left + activeRect.width * scale;
    const headerH = 26 * scale;
    const headerW = ROW_HEADER_WIDTH * scale;
    if (top - headerH < wrapper.scrollTop) wrapper.scrollTop = top - headerH;
    else if (bottom > wrapper.scrollTop + wrapper.clientHeight) wrapper.scrollTop = bottom - wrapper.clientHeight + 4;
    if (left - headerW < wrapper.scrollLeft) wrapper.scrollLeft = left - headerW;
    else if (right > wrapper.scrollLeft + wrapper.clientWidth) wrapper.scrollLeft = right - wrapper.clientWidth + 4;
  }, [activeRect, zoom]);

  const cellFromEvent = (e) => {
    const td = e.target.closest && e.target.closest('td[data-row]');
    if (!td) return null;
    return { row: Number(td.dataset.row), col: Number(td.dataset.col) };
  };

  // ── Selection & fill dragging ──
  useEffect(() => {
    const up = () => {
      if (dragRef.current === 'select') onSelectionDragEnd?.(selectionRef.current);
      if (dragRef.current === 'fill' && fillTargetRef.current) onFillDrag?.(selectionRef.current, fillTargetRef.current);
      dragRef.current = null;
      fillTargetRef.current = null;
      setFillTarget(null);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [onSelectionDragEnd, onFillDrag]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const hit = cellFromEvent(e);
    if (!hit) return;
    if (editingCell && hit.row === editingCell.row && hit.col === editingCell.col) return;
    const proceed = onCellMouseDown(hit.row, hit.col, e);
    if (proceed) {
      dragRef.current = 'select';
      e.preventDefault();
      wrapperRef.current?.closest('.spreadsheet-container')?.focus({ preventScroll: true });
    }
  };

  const handleMouseOver = (e) => {
    if (!dragRef.current) return;
    const hit = cellFromEvent(e);
    if (!hit) return;
    if (dragRef.current === 'select') {
      onExtendSelection(hit.row, hit.col);
    } else if (dragRef.current === 'fill') {
      const s = selectionRef.current;
      // Extend along the dominant direction only, like Excel's fill handle
      const dDown = hit.row - s.r2, dUp = s.r1 - hit.row, dRight = hit.col - s.c2, dLeft = s.c1 - hit.col;
      const best = Math.max(dDown, dUp, dRight, dLeft);
      let t = null;
      if (best > 0) {
        if (best === dDown) t = { ...s, r2: hit.row };
        else if (best === dUp) t = { ...s, r1: hit.row };
        else if (best === dRight) t = { ...s, c2: hit.col };
        else t = { ...s, c1: hit.col };
      }
      fillTargetRef.current = t;
      setFillTarget(t);
    }
  };

  // ── Column resize ──
  const startResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidth(col);
    const scale = zoom / 100;
    const move = (ev) => setLiveWidths({ [col]: Math.max(32, startW + (ev.clientX - startX) / scale) });
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onColumnResize?.(col, Math.max(32, startW + (ev.clientX - startX) / scale));
      setLiveWidths({});
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // ── Formula autocomplete for the in-cell editor ──
  const suggestions = useMemo(() => {
    if (!editingCell || !cellInputText.startsWith('=')) return [];
    const m = /(?:^=|[=+\-*/(,:^&<>\s])([A-Za-z]{1,})$/.exec(cellInputText);
    if (!m) return [];
    const prefix = m[1].toUpperCase();
    return FUNCTION_NAMES.filter((f) => f.startsWith(prefix) && f !== prefix).slice(0, 8);
  }, [editingCell, cellInputText]);

  useEffect(() => {
    setSuggestIndex(0);
  }, [suggestions.length]);

  const applySuggestion = (name) => {
    setCellInputText((t) => t.replace(/[A-Za-z]+$/, `${name}(`));
  };

  const editorKeyDown = (e) => {
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIndex((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIndex((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[suggestIndex]); return; }
    }
    handleCellInputKeyDown(e);
  };

  const editor = editingCell ? (
    <div className="cell-editor-wrap">
      <textarea
        autoFocus
        rows={1}
        spellCheck={false}
        className="cell-editor-input"
        value={cellInputText}
        onChange={(e) => setCellInputText(e.target.value)}
        onBlur={handleCellInputBlur}
        onKeyDown={editorKeyDown}
        onFocus={(e) => {
          const len = e.target.value.length;
          e.target.setSelectionRange(len, len);
        }}
      />
      {suggestions.length > 0 && (
        <div className="formula-suggest" onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((s, i) => (
            <div key={s} className={`formula-suggest-item${i === suggestIndex ? ' active' : ''}`} onClick={() => applySuggestion(s)}>
              <span className="fx">fx</span>{s}
            </div>
          ))}
          <div className="formula-suggest-hint">Tab to insert</div>
        </div>
      )}
    </div>
  ) : null;

  const totalWidth = ROW_HEADER_WIDTH + Array.from({ length: colCount }).reduce((w, _, c) => w + colWidth(c), 0);
  const selectedAll = selection.r1 === 1 && selection.c1 === 0 && selection.r2 === rowCount && selection.c2 === colCount - 1;

  return (
    <Box ref={wrapperRef} className="spreadsheet-grid-wrapper custom-scrollbar">
      <div ref={innerRef} className="sheet-grid-inner" style={{ zoom: zoom / 100, width: totalWidth }}>
        <table
          className="spreadsheet-table"
          style={{ width: totalWidth }}
          onMouseDown={handleMouseDown}
          onMouseOver={handleMouseOver}
          onDoubleClick={(e) => {
            const hit = cellFromEvent(e);
            if (hit && !readOnly) onCellDoubleClick(hit.row, hit.col);
          }}
        >
          <colgroup>
            <col style={{ width: ROW_HEADER_WIDTH }} />
            {Array.from({ length: colCount }).map((_, c) => <col key={c} style={{ width: colWidth(c) }} />)}
          </colgroup>
          <thead>
            <tr>
              <th
                className={`corner-header${selectedAll ? ' selected-header' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); onHeaderSelect('all'); }}
                title="Select all (Ctrl+A)"
              />
              {Array.from({ length: colCount }).map((_, c) => {
                const active = c >= selection.c1 && c <= selection.c2;
                return (
                  <th
                    key={c}
                    className={`col-header${active ? ' selected-header' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); onHeaderSelect('col', c, e.shiftKey); }}
                  >
                    {getColLetter(c)}
                    {!readOnly && <span className="col-resize-handle" onMouseDown={(e) => startResize(e, c)} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            onMouseDown={(e) => {
              const th = e.target.closest('th[data-header-row]');
              if (th) {
                e.preventDefault();
                onHeaderSelect('row', Number(th.dataset.headerRow), e.shiftKey);
              }
            }}
          >
            {Array.from({ length: rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isEditingRow = editingCell && editingCell.row === rowNum;
              return (
                <GridRow
                  key={rowNum}
                  rowNum={rowNum}
                  cells={cells}
                  evaluator={evaluator}
                  colCount={colCount}
                  spans={spans}
                  covered={covered}
                  editingCol={isEditingRow ? editingCell.col : null}
                  editor={isEditingRow ? editor : null}
                  isRowActive={rowNum >= selection.r1 && rowNum <= selection.r2}
                />
              );
            })}
          </tbody>
        </table>

        {/* Selection overlays are drawn above the table so cells never need to re-render on selection change */}
        {overlay && !editingCell && (
          <div className="selection-range" style={overlay}>
            {!readOnly && (
              <span
                className="fill-handle"
                title="Drag to fill"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragRef.current = 'fill';
                }}
              />
            )}
          </div>
        )}
        {activeRect && !editingCell && (selection.r2 > selection.r1 || selection.c2 > selection.c1) && (
          <div className="selection-active" style={activeRect} />
        )}
        {cutRect && <div className="selection-cut" style={cutRect} />}
        {fillRect && <div className="selection-fill-preview" style={fillRect} />}
      </div>
    </Box>
  );
};

export default SpreadsheetGrid;
