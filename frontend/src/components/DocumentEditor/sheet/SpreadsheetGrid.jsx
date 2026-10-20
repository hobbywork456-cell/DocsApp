import React from 'react';
import { Box } from '@mui/material';
import { getColLetter, evaluateFormula } from './spreadsheetUtils';

const SpreadsheetGrid = ({
  activeSheet,
  selectedCell,
  editingCell,
  cellInputText,
  setCellInputText,
  handleCellClick,
  handleCellDoubleClick,
  handleCellInputBlur,
  handleCellInputKeyDown,
  readOnly
}) => {
  return (
    <Box className="spreadsheet-grid-wrapper custom-scrollbar">
      <table className="spreadsheet-table">
        <thead>
          <tr>
            <th className="corner-header" />
            {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
              const letter = getColLetter(cIdx);
              const isColSelected = selectedCell.col === cIdx;
              return (
                <th
                  key={cIdx}
                  className={`col-header ${isColSelected ? 'selected-header' : ''}`}
                >
                  {letter}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: activeSheet.rowCount }).map((_, rIdx) => {
            const rowNum = rIdx + 1;
            const isRowSelected = selectedCell.row === rowNum;
            return (
              <tr key={rowNum}>
                <td className={`row-header ${isRowSelected ? 'selected-header' : ''}`}>
                  {rowNum}
                </td>
                {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                  const coord = `${getColLetter(cIdx)}${rowNum}`;
                  const cell = activeSheet.cells[coord] || {};
                  const isSelected = selectedCell.row === rowNum && selectedCell.col === cIdx;
                  const isEditing = editingCell && editingCell.row === rowNum && editingCell.col === cIdx;

                  let displayValue = '';
                  if (cell.formula) {
                    displayValue = evaluateFormula(cell.formula, activeSheet.cells);
                  } else {
                    displayValue = cell.value !== undefined ? cell.value : '';
                  }

                  // Number Formatting (Currency, Percent, Comma, Accounting)
                  if (displayValue !== '' && !isNaN(Number(displayValue))) {
                    const num = Number(displayValue);
                    const decimals = cell.decimals !== undefined ? cell.decimals : 2;
                    const symbol = cell.currencySymbol || '$';

                    if (cell.format === 'currency') {
                      displayValue = `${symbol}${num.toLocaleString('en-US', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                      })}`;
                    } else if (cell.format === 'percent') {
                      displayValue = `${(num * 100).toFixed(decimals)}%`;
                    } else if (cell.format === 'comma' || cell.format === 'number') {
                      displayValue = num.toLocaleString('en-US', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                      });
                    } else if (cell.format === 'accounting') {
                      displayValue = `${symbol} ${num.toLocaleString('en-US', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                      })}`;
                    } else if (cell.decimals !== undefined) {
                      displayValue = num.toFixed(decimals);
                    }
                  }

                  const cellStyle = {
                    fontWeight: cell.bold || cell.styleType === 'heading1' || cell.styleType === 'total' || cell.styleType === 'calculation' ? '700' : 'normal',
                    fontStyle: cell.italic ? 'italic' : 'normal',
                    textDecoration: cell.underline === 'double' ? 'underline double' : cell.underline ? 'underline' : 'none',
                    fontFamily: cell.fontFamily || undefined,
                    fontSize: cell.fontSize || (cell.styleType === 'heading1' ? '13pt' : undefined),
                    color: cell.color || (
                      cell.styleType === 'bad' ? '#9c0006' :
                      cell.styleType === 'good' ? '#006100' :
                      cell.styleType === 'neutral' ? '#9c6500' :
                      cell.styleType === 'calculation' ? '#f79646' :
                      cell.styleType === 'heading1' ? '#2b579a' : undefined
                    ),
                    backgroundColor: cell.bg || (
                      cell.styleType === 'bad' ? '#ffc7ce' :
                      cell.styleType === 'good' ? '#c6efce' :
                      cell.styleType === 'neutral' ? '#ffeb9c' :
                      cell.styleType === 'calculation' ? '#fde9d9' :
                      cell.styleType === 'check' ? '#f1f5f9' : undefined
                    ),
                    textAlign: cell.align || 'left',
                    verticalAlign: cell.valign || 'middle',
                    whiteSpace: cell.wrap ? 'pre-wrap' : 'nowrap',
                    paddingLeft: cell.indent ? `${cell.indent * 12 + 6}px` : undefined,
                    borderBottom: (
                      cell.border === 'double-bottom' || cell.styleType === 'total' ? '3px double #000000' :
                      cell.border === 'bottom' || cell.styleType === 'heading1' ? '2px solid #2b579a' :
                      cell.border === 'all' || cell.border === 'thick' ? '1px solid #000000' : undefined
                    ),
                    borderTop: (
                      cell.border === 'top' || cell.border === 'all' || cell.border === 'thick' || cell.styleType === 'total' ? '1px solid #000000' : undefined
                    ),
                    borderLeft: (
                      cell.border === 'left' || cell.border === 'all' || cell.border === 'thick' ? '1px solid #000000' : undefined
                    ),
                    borderRight: (
                      cell.border === 'right' || cell.border === 'all' || cell.border === 'thick' ? '1px solid #000000' : undefined
                    ),
                    outline: (
                      cell.styleType === 'calculation' ? '1px solid #f79646' :
                      cell.styleType === 'check' ? '2px solid #595959' : undefined
                    )
                  };

                  return (
                    <td
                      key={cIdx}
                      className={`grid-cell ${isSelected ? 'selected' : ''}`}
                      style={cellStyle}
                      onClick={() => handleCellClick(rowNum, cIdx)}
                      onDoubleClick={() => !readOnly && handleCellDoubleClick(rowNum, cIdx)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          className="cell-editor-input"
                          value={cellInputText}
                          onChange={(e) => setCellInputText(e.target.value)}
                          onBlur={handleCellInputBlur}
                          onKeyDown={handleCellInputKeyDown}
                        />
                      ) : (
                        <span className="cell-content-text">{displayValue}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};

export default SpreadsheetGrid;
