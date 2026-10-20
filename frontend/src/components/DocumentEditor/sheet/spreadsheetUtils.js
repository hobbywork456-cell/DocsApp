// Utility functions and formula parser for Spreadsheet Editor

// Convert column index (0-based) to letter: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA
export const getColLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Convert column letter to index: 'A' -> 0, 'B' -> 1, 'AA' -> 26
export const getColIndex = (letter) => {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
};

// Expand cell range string like 'A1:C3' into array of cell coordinates ['A1', 'A2', 'A3', 'B1', ...]
export const expandRange = (rangeStr) => {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.trim().toUpperCase()];

  const matchStart = parts[0].trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  const matchEnd = parts[1].trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);

  if (!matchStart || !matchEnd) return [];

  const startCol = getColIndex(matchStart[1]);
  const startRow = parseInt(matchStart[2], 10);
  const endCol = getColIndex(matchEnd[1]);
  const endRow = parseInt(matchEnd[2], 10);

  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  const coords = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      coords.push(`${getColLetter(c)}${r}`);
    }
  }
  return coords;
};

// Formula Parser & Evaluator
export const evaluateFormula = (formulaStr, cellsData, visited = new Set()) => {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) {
    return formulaStr;
  }
  const expr = formulaStr.slice(1).trim();

  // Helper to resolve cell coordinate like A1
  const resolveCellValue = (coord) => {
    coord = coord.toUpperCase();
    if (visited.has(coord)) return 0; // prevent circular dependency
    const targetCell = cellsData[coord];
    if (!targetCell) return 0;
    if (targetCell.formula) {
      const nextVisited = new Set(visited);
      nextVisited.add(coord);
      const val = evaluateFormula(targetCell.formula, cellsData, nextVisited);
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(targetCell.value);
    return isNaN(num) ? targetCell.value || 0 : num;
  };

  // 1. SUM function
  const sumMatch = expr.match(/^SUM\(([^)]+)\)$/i);
  if (sumMatch) {
    const coords = sumMatch[1].includes(':') ? expandRange(sumMatch[1]) : sumMatch[1].split(',').map(s => s.trim());
    let total = 0;
    coords.forEach(coord => {
      const val = resolveCellValue(coord);
      if (typeof val === 'number') total += val;
    });
    return Number(total.toFixed(4));
  }

  // 2. AVERAGE function
  const avgMatch = expr.match(/^AVERAGE\(([^)]+)\)$/i);
  if (avgMatch) {
    const coords = avgMatch[1].includes(':') ? expandRange(avgMatch[1]) : avgMatch[1].split(',').map(s => s.trim());
    let sum = 0;
    let count = 0;
    coords.forEach(coord => {
      const cell = cellsData[coord.toUpperCase()];
      if (cell && (cell.value || cell.formula)) {
        const val = resolveCellValue(coord);
        if (typeof val === 'number') {
          sum += val;
          count++;
        }
      }
    });
    return count > 0 ? Number((sum / count).toFixed(4)) : 0;
  }

  // 3. MIN function
  const minMatch = expr.match(/^MIN\(([^)]+)\)$/i);
  if (minMatch) {
    const coords = minMatch[1].includes(':') ? expandRange(minMatch[1]) : minMatch[1].split(',').map(s => s.trim());
    const nums = coords.map(resolveCellValue).filter(v => typeof v === 'number');
    return nums.length > 0 ? Math.min(...nums) : 0;
  }

  // 4. MAX function
  const maxMatch = expr.match(/^MAX\(([^)]+)\)$/i);
  if (maxMatch) {
    const coords = maxMatch[1].includes(':') ? expandRange(maxMatch[1]) : maxMatch[1].split(',').map(s => s.trim());
    const nums = coords.map(resolveCellValue).filter(v => typeof v === 'number');
    return nums.length > 0 ? Math.max(...nums) : 0;
  }

  // 5. COUNT function
  const countMatch = expr.match(/^COUNT\(([^)]+)\)$/i);
  if (countMatch) {
    const coords = countMatch[1].includes(':') ? expandRange(countMatch[1]) : countMatch[1].split(',').map(s => s.trim());
    let count = 0;
    coords.forEach(coord => {
      const cell = cellsData[coord.toUpperCase()];
      if (cell && (cell.value || cell.formula)) count++;
    });
    return count;
  }

  // 6. Direct arithmetic expression (e.g. C2*D2, A1+B1-10)
  try {
    const evaluatedExpr = expr.replace(/([A-Z]+[0-9]+)/gi, (match) => {
      const val = resolveCellValue(match);
      return typeof val === 'number' ? val : 0;
    });
    if (/^[\d\s+\-*/().%]+$/.test(evaluatedExpr)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${evaluatedExpr})`)();
      return typeof result === 'number' && !isNaN(result) ? Number(result.toFixed(4)) : '#VALUE!';
    }
  } catch {
    return '#ERROR!';
  }

  return '#NAME?';
};

// Export sheet to CSV and trigger browser download
export const exportSheetToCSV = (sheet, filename = 'spreadsheet.csv') => {
  if (!sheet) return;
  const rows = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const rowVals = [];
    for (let c = 0; c < sheet.colCount; c++) {
      const coord = `${getColLetter(c)}${r}`;
      const cell = sheet.cells[coord];
      let val = '';
      if (cell) {
        if (cell.formula) {
          val = evaluateFormula(cell.formula, sheet.cells);
        } else {
          val = cell.value || '';
        }
      }
      // Escape commas and quotes
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      rowVals.push(val);
    }
    rows.push(rowVals.join(','));
  }
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Initial sample workbook template
export const getInitialWorkbook = () => ({
  activeSheetId: 'sheet1',
  sheets: [
    {
      id: 'sheet1',
      name: 'Sheet1',
      rowCount: 30,
      colCount: 12,
      cells: {
        A1: { value: 'Item Description', bold: true, align: 'left', bg: '#f1f5f9' },
        B1: { value: 'Category', bold: true, align: 'center', bg: '#f1f5f9' },
        C1: { value: 'Unit Price ($)', bold: true, align: 'right', bg: '#f1f5f9' },
        D1: { value: 'Quantity', bold: true, align: 'right', bg: '#f1f5f9' },
        E1: { value: 'Subtotal ($)', bold: true, align: 'right', bg: '#f1f5f9' },

        A2: { value: 'Pro Documentation Suite' },
        B2: { value: 'Software', align: 'center' },
        C2: { value: '149.00', align: 'right' },
        D2: { value: '3', align: 'right' },
        E2: { formula: '=C2*D2', align: 'right', bold: true },

        A3: { value: 'Cloud Storage 500MB Pack' },
        B3: { value: 'Infrastructure', align: 'center' },
        C3: { value: '45.00', align: 'right' },
        D3: { value: '10', align: 'right' },
        E3: { formula: '=C3*D3', align: 'right', bold: true },

        A4: { value: 'Enterprise Team License' },
        B4: { value: 'Subscription', align: 'center' },
        C4: { value: '299.00', align: 'right' },
        D4: { value: '2', align: 'right' },
        E4: { formula: '=C4*D4', align: 'right', bold: true },

        A5: { value: 'TOTAL SUMMARY', bold: true, color: '#326127', bg: '#e8f5e9' },
        B5: { value: '' },
        C5: { value: '' },
        D5: { value: 'Grand Total:', bold: true, align: 'right', color: '#326127', bg: '#e8f5e9' },
        E5: { formula: '=SUM(E2:E4)', bold: true, align: 'right', color: '#326127', bg: '#e8f5e9' }
      }
    }
  ]
});
