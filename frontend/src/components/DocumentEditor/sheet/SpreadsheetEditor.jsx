import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import SpreadsheetToolbar from './SpreadsheetToolbar';
import SpreadsheetFormulaBar from './SpreadsheetFormulaBar';
import SpreadsheetGrid from './SpreadsheetGrid';
import SpreadsheetTabs from './SpreadsheetTabs';
import {
  getColLetter,
  getColIndex,
  getInitialWorkbook,
  exportSheetToCSV
} from './spreadsheetUtils';
import '../SpreadsheetEditor.css';

const SpreadsheetEditor = ({ content, onChange, readOnly = false }) => {
  // Parse or initialize workbook
  const [workbook, setWorkbook] = useState(() => {
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.sheets && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to initial template
      }
    }
    return getInitialWorkbook();
  });

  const activeSheet = useMemo(() => {
    return workbook.sheets.find(s => s.id === workbook.activeSheetId) || workbook.sheets[0];
  }, [workbook]);

  // Selected cell (row: 1-indexed, col: 0-indexed)
  const [selectedCell, setSelectedCell] = useState({ row: 1, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [cellInputText, setCellInputText] = useState('');
  const [formulaBarText, setFormulaBarText] = useState('');

  // Format Painter state
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [formatPainterData, setFormatPainterData] = useState(null);

  const containerRef = useRef(null);

  const activeCoord = useMemo(() => {
    return `${getColLetter(selectedCell.col)}${selectedCell.row}`;
  }, [selectedCell]);

  const activeCellData = useMemo(() => {
    return (activeSheet?.cells && activeSheet.cells[activeCoord]) || {};
  }, [activeSheet, activeCoord]);

  // Keep formula bar text synchronized with active cell
  useEffect(() => {
    const rawVal = activeCellData.formula !== undefined ? activeCellData.formula : (activeCellData.value || '');
    setFormulaBarText(rawVal);
    if (!editingCell) {
      setCellInputText(rawVal);
    }
  }, [activeCoord, activeCellData, editingCell]);

  const lastContentRef = useRef(content);

  // Synchronize when content prop changes externally (e.g. read mode, loading, switching docs)
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      lastContentRef.current = content;
      try {
        const parsed = JSON.parse(content);
        if (parsed.sheets && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          setWorkbook(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, [content]);

  // Commit updates to workbook and trigger onChange
  const updateWorkbook = useCallback((newWb) => {
    setWorkbook(newWb);
    if (onChange) {
      const serialized = JSON.stringify(newWb);
      lastContentRef.current = serialized;
      onChange(serialized);
    }
  }, [onChange]);

  // Commit cell value or formula
  const commitCellValue = useCallback((coord, text) => {
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;

    const currentSheet = workbook.sheets[sheetIdx];
    const updatedCells = { ...currentSheet.cells };
    const prevCell = updatedCells[coord] || {};

    if (text.startsWith('=')) {
      updatedCells[coord] = { ...prevCell, formula: text, value: undefined };
    } else {
      updatedCells[coord] = { ...prevCell, formula: undefined, value: text };
    }

    const updatedSheet = { ...currentSheet, cells: updatedCells };
    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = updatedSheet;

    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [workbook, updateWorkbook]);

  // Apply visual formatting (bold, italic, colors, align, format, borders, etc.)
  const applyFormatting = useCallback((property, val) => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;

    const currentSheet = workbook.sheets[sheetIdx];
    const updatedCells = { ...currentSheet.cells };
    const prevCell = updatedCells[activeCoord] || {};

    updatedCells[activeCoord] = {
      ...prevCell,
      [property]: val
    };

    const updatedSheet = { ...currentSheet, cells: updatedCells };
    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = updatedSheet;

    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [workbook, activeCoord, readOnly, updateWorkbook]);

  // Apply Cell Style Preset (Normal, Bad, Good, Neutral, Calculation, Check, Heading1, Total)
  const applyCellStyle = useCallback((styleType) => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;

    const currentSheet = workbook.sheets[sheetIdx];
    const updatedCells = { ...currentSheet.cells };
    const prevCell = updatedCells[activeCoord] || {};

    if (styleType === 'normal') {
      updatedCells[activeCoord] = {
        ...prevCell,
        styleType: undefined,
        bg: undefined,
        color: undefined,
        border: undefined,
        bold: false
      };
    } else {
      updatedCells[activeCoord] = {
        ...prevCell,
        styleType
      };
    }

    const updatedSheet = { ...currentSheet, cells: updatedCells };
    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = updatedSheet;

    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [workbook, activeCoord, readOnly, updateWorkbook]);

  // Apply Number Format (Currency, Percent, Comma, Accounting, etc.)
  const applyNumberFormat = useCallback((formatId) => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;

    const currentSheet = workbook.sheets[sheetIdx];
    const updatedCells = { ...currentSheet.cells };
    const prevCell = updatedCells[activeCoord] || {};

    updatedCells[activeCoord] = {
      ...prevCell,
      format: formatId
    };

    const updatedSheet = { ...currentSheet, cells: updatedCells };
    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = updatedSheet;

    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [workbook, activeCoord, readOnly, updateWorkbook]);

  // Clear Cell Operations
  const handleClear = useCallback((clearType = 'all') => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;

    const currentSheet = workbook.sheets[sheetIdx];
    const updatedCells = { ...currentSheet.cells };
    const prevCell = updatedCells[activeCoord] || {};

    if (clearType === 'all') {
      delete updatedCells[activeCoord];
    } else if (clearType === 'contents') {
      updatedCells[activeCoord] = {
        ...prevCell,
        value: '',
        formula: undefined
      };
    } else if (clearType === 'formats') {
      updatedCells[activeCoord] = {
        value: prevCell.value,
        formula: prevCell.formula
      };
    }

    const updatedSheet = { ...currentSheet, cells: updatedCells };
    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = updatedSheet;

    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [workbook, activeCoord, readOnly, updateWorkbook]);

  // AutoSum Operator (Sum, Average, Count, Max, Min)
  const handleAutoSum = useCallback((func = 'SUM') => {
    if (readOnly) return;
    const colLetter = getColLetter(selectedCell.col);
    const curRow = selectedCell.row;

    let startRow = curRow - 1;
    while (startRow >= 1) {
      const prevCoord = `${colLetter}${startRow}`;
      const cell = activeSheet.cells[prevCoord];
      if (!cell || (cell.value === undefined && cell.formula === undefined) || cell.value === '') {
        break;
      }
      startRow--;
    }
    startRow++;

    let rangeStr = '';
    if (startRow < curRow) {
      rangeStr = `${colLetter}${startRow}:${colLetter}${curRow - 1}`;
    } else {
      let startCol = selectedCell.col - 1;
      while (startCol >= 0) {
        const prevCoord = `${getColLetter(startCol)}${curRow}`;
        const cell = activeSheet.cells[prevCoord];
        if (!cell || (cell.value === undefined && cell.formula === undefined) || cell.value === '') {
          break;
        }
        startCol--;
      }
      startCol++;
      if (startCol < selectedCell.col) {
        rangeStr = `${getColLetter(startCol)}${curRow}:${getColLetter(selectedCell.col - 1)}${curRow}`;
      } else {
        rangeStr = `${colLetter}1:${colLetter}${Math.max(1, curRow - 1)}`;
      }
    }

    commitCellValue(activeCoord, `=${func.toUpperCase()}(${rangeStr})`);
  }, [readOnly, selectedCell, activeSheet, activeCoord, commitCellValue]);

  // Sort Sheet Rows based on current column
  const handleSort = useCallback((direction = 'asc') => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;
    const currentSheet = workbook.sheets[sheetIdx];

    const colLetter = getColLetter(selectedCell.col);
    const startRow = (currentSheet.cells[`A1`]?.bold || currentSheet.cells[`${colLetter}1`]?.bold) ? 2 : 1;

    const rowData = [];
    for (let r = startRow; r <= currentSheet.rowCount; r++) {
      const rowCells = {};
      for (let c = 0; c < currentSheet.colCount; c++) {
        const coord = `${getColLetter(c)}${r}`;
        rowCells[c] = currentSheet.cells[coord];
      }
      const sortVal = currentSheet.cells[`${colLetter}${r}`]?.value || '';
      rowData.push({ r, rowCells, sortVal });
    }

    rowData.sort((a, b) => {
      const numA = parseFloat(a.sortVal);
      const numB = parseFloat(b.sortVal);
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc' 
        ? String(a.sortVal).localeCompare(String(b.sortVal))
        : String(b.sortVal).localeCompare(String(a.sortVal));
    });

    const newCells = { ...currentSheet.cells };
    rowData.forEach((item, idx) => {
      const targetRowNum = startRow + idx;
      for (let c = 0; c < currentSheet.colCount; c++) {
        const coord = `${getColLetter(c)}${targetRowNum}`;
        if (item.rowCells[c]) {
          newCells[coord] = item.rowCells[c];
        } else {
          delete newCells[coord];
        }
      }
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = { ...currentSheet, cells: newCells };
    updateWorkbook({ ...workbook, sheets: updatedSheets });
  }, [readOnly, workbook, selectedCell, updateWorkbook]);

  // Toggle format painter
  const toggleFormatPainter = (active) => {
    if (active) {
      setFormatPainterActive(true);
      setFormatPainterData({ ...activeCellData });
      document.body.classList.add('excel-painter-active');
    } else {
      setFormatPainterActive(false);
      setFormatPainterData(null);
      document.body.classList.remove('excel-painter-active');
    }
  };

  // Grid cell events
  const handleCellClick = (row, col) => {
    if (editingCell) {
      commitCellValue(activeCoord, cellInputText);
      setEditingCell(null);
    }

    const targetCoord = `${getColLetter(col)}${row}`;

    // Apply format painter if active
    if (formatPainterActive && formatPainterData) {
      const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
      if (sheetIdx !== -1) {
        const currentSheet = workbook.sheets[sheetIdx];
        const updatedCells = { ...currentSheet.cells };
        const prevCell = updatedCells[targetCoord] || {};
        updatedCells[targetCoord] = {
          ...prevCell,
          bold: formatPainterData.bold,
          italic: formatPainterData.italic,
          underline: formatPainterData.underline,
          color: formatPainterData.color,
          bg: formatPainterData.bg,
          align: formatPainterData.align,
          valign: formatPainterData.valign,
          wrap: formatPainterData.wrap,
          border: formatPainterData.border,
          format: formatPainterData.format,
          decimals: formatPainterData.decimals,
          fontFamily: formatPainterData.fontFamily,
          fontSize: formatPainterData.fontSize,
          styleType: formatPainterData.styleType
        };
        const updatedSheets = [...workbook.sheets];
        updatedSheets[sheetIdx] = { ...currentSheet, cells: updatedCells };
        updateWorkbook({ ...workbook, sheets: updatedSheets });
      }
      toggleFormatPainter(false);
    }

    setSelectedCell({ row, col });
  };

  const handleCellDoubleClick = (row, col) => {
    if (readOnly) return;
    setSelectedCell({ row, col });
    setEditingCell({ row, col });
  };

  const handleCellInputBlur = () => {
    if (editingCell) {
      commitCellValue(activeCoord, cellInputText);
      setEditingCell(null);
    }
  };

  const handleCellInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitCellValue(activeCoord, cellInputText);
      setEditingCell(null);
      setSelectedCell(prev => ({ ...prev, row: Math.min(activeSheet.rowCount, prev.row + 1) }));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitCellValue(activeCoord, cellInputText);
      setEditingCell(null);
      setSelectedCell(prev => ({ ...prev, col: Math.min(activeSheet.colCount - 1, prev.col + 1) }));
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setCellInputText(activeCellData.formula || activeCellData.value || '');
    }
  };

  const handleFormulaBarKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitCellValue(activeCoord, formulaBarText);
      e.target.blur();
    }
  };

  const handleFormulaBarBlur = () => {
    commitCellValue(activeCoord, formulaBarText);
  };

  // Keyboard navigation across grid
  const handleContainerKeyDown = (e) => {
    if (editingCell) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, row: Math.min(activeSheet.rowCount, prev.row + 1) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, row: Math.max(1, prev.row - 1) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, col: Math.min(activeSheet.colCount - 1, prev.col + 1) }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!readOnly) {
        commitCellValue(activeCoord, '');
      }
    } else if (e.key === 'Enter') {
      if (!readOnly) {
        setEditingCell(selectedCell);
      }
    }
  };

  // Insert / Delete row & column operations
  const insertRow = (below = false) => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;
    const currentSheet = workbook.sheets[sheetIdx];
    const newRowCount = currentSheet.rowCount + 1;
    const targetRow = below ? selectedCell.row + 1 : selectedCell.row;

    const newCells = {};
    Object.entries(currentSheet.cells).forEach(([coord, cell]) => {
      const match = coord.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) return;
      const cLetter = match[1];
      const rNum = parseInt(match[2], 10);
      if (rNum >= targetRow) {
        newCells[`${cLetter}${rNum + 1}`] = cell;
      } else {
        newCells[coord] = cell;
      }
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = { ...currentSheet, rowCount: newRowCount, cells: newCells };
    updateWorkbook({ ...workbook, sheets: updatedSheets });
  };

  const deleteRow = () => {
    if (readOnly || activeSheet.rowCount <= 1) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;
    const currentSheet = workbook.sheets[sheetIdx];
    const targetRow = selectedCell.row;

    const newCells = {};
    Object.entries(currentSheet.cells).forEach(([coord, cell]) => {
      const match = coord.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) return;
      const cLetter = match[1];
      const rNum = parseInt(match[2], 10);
      if (rNum < targetRow) {
        newCells[coord] = cell;
      } else if (rNum > targetRow) {
        newCells[`${cLetter}${rNum - 1}`] = cell;
      }
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = { ...currentSheet, rowCount: currentSheet.rowCount - 1, cells: newCells };
    updateWorkbook({ ...workbook, sheets: updatedSheets });
  };

  const insertColumn = (right = false) => {
    if (readOnly) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;
    const currentSheet = workbook.sheets[sheetIdx];
    const newColCount = currentSheet.colCount + 1;
    const targetCol = right ? selectedCell.col + 1 : selectedCell.col;

    const newCells = {};
    Object.entries(currentSheet.cells).forEach(([coord, cell]) => {
      const match = coord.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) return;
      const cIdx = getColIndex(match[1]);
      const rNum = parseInt(match[2], 10);
      if (cIdx >= targetCol) {
        newCells[`${getColLetter(cIdx + 1)}${rNum}`] = cell;
      } else {
        newCells[coord] = cell;
      }
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = { ...currentSheet, colCount: newColCount, cells: newCells };
    updateWorkbook({ ...workbook, sheets: updatedSheets });
  };

  const deleteColumn = () => {
    if (readOnly || activeSheet.colCount <= 1) return;
    const sheetIdx = workbook.sheets.findIndex(s => s.id === workbook.activeSheetId);
    if (sheetIdx === -1) return;
    const currentSheet = workbook.sheets[sheetIdx];
    const targetCol = selectedCell.col;

    const newCells = {};
    Object.entries(currentSheet.cells).forEach(([coord, cell]) => {
      const match = coord.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) return;
      const cIdx = getColIndex(match[1]);
      const rNum = parseInt(match[2], 10);
      if (cIdx < targetCol) {
        newCells[coord] = cell;
      } else if (cIdx > targetCol) {
        newCells[`${getColLetter(cIdx - 1)}${rNum}`] = cell;
      }
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[sheetIdx] = { ...currentSheet, colCount: currentSheet.colCount - 1, cells: newCells };
    updateWorkbook({ ...workbook, sheets: updatedSheets });
  };

  // Sheet Tabs
  const handleAddSheet = () => {
    if (readOnly) return;
    const newSheetId = `sheet${Date.now()}`;
    const newSheetName = `Sheet${workbook.sheets.length + 1}`;
    const newSheet = {
      id: newSheetId,
      name: newSheetName,
      rowCount: 30,
      colCount: 12,
      cells: {}
    };
    updateWorkbook({
      ...workbook,
      activeSheetId: newSheetId,
      sheets: [...workbook.sheets, newSheet]
    });
  };

  const handleDeleteSheet = (sheetId) => {
    if (readOnly || workbook.sheets.length <= 1) return;
    const filtered = workbook.sheets.filter(s => s.id !== sheetId);
    updateWorkbook({
      ...workbook,
      activeSheetId: filtered[0].id,
      sheets: filtered
    });
  };

  return (
    <Box
      ref={containerRef}
      className="spreadsheet-container"
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
    >
      {/* MICROSOFT EXCEL & GOOGLE SHEETS RIBBON TOOLBAR - ONLY SHOWN IN EDIT MODE */}
      {!readOnly && (
        <SpreadsheetToolbar
          activeCellData={activeCellData}
          activeCoord={activeCoord}
          selectedCell={selectedCell}
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
          onExportCSV={() => exportSheetToCSV(activeSheet, `${activeSheet.name}.csv`)}
          formatPainterActive={formatPainterActive}
          setFormatPainterActive={toggleFormatPainter}
          readOnly={readOnly}
        />
      )}

      {/* FORMULA BAR */}
      <SpreadsheetFormulaBar
        activeCoord={activeCoord}
        formulaBarText={formulaBarText}
        setFormulaBarText={setFormulaBarText}
        handleFormulaBarKeyDown={handleFormulaBarKeyDown}
        handleFormulaBarBlur={handleFormulaBarBlur}
        readOnly={readOnly}
      />

      {/* MAIN DATA GRID */}
      <SpreadsheetGrid
        activeSheet={activeSheet}
        selectedCell={selectedCell}
        editingCell={editingCell}
        cellInputText={cellInputText}
        setCellInputText={setCellInputText}
        handleCellClick={handleCellClick}
        handleCellDoubleClick={handleCellDoubleClick}
        handleCellInputBlur={handleCellInputBlur}
        handleCellInputKeyDown={handleCellInputKeyDown}
        readOnly={readOnly}
      />

      {/* BOTTOM SHEET TABS */}
      <SpreadsheetTabs
        sheets={workbook.sheets}
        activeSheetId={workbook.activeSheetId}
        onSelectSheet={(sheetId) => updateWorkbook({ ...workbook, activeSheetId: sheetId })}
        onAddSheet={handleAddSheet}
        onDeleteSheet={handleDeleteSheet}
        readOnly={readOnly}
      />
    </Box>
  );
};

export default SpreadsheetEditor;
