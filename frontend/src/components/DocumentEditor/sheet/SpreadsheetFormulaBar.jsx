import React, { useState, useEffect } from 'react';
import { Box, Tooltip } from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

const SpreadsheetFormulaBar = ({
  activeCoord,
  formulaBarText,
  setFormulaBarText,
  handleFormulaBarKeyDown,
  handleFormulaBarBlur,
  onNameBoxSubmit,
  isEditing,
  onCancel,
  onConfirm,
  readOnly
}) => {
  const [nameBox, setNameBox] = useState(activeCoord);
  useEffect(() => {
    setNameBox(activeCoord);
  }, [activeCoord]);

  return (
    <Box className="spreadsheet-formula-bar">
      <input
        className="formula-name-box"
        value={nameBox}
        aria-label="Name box"
        spellCheck={false}
        onChange={(e) => setNameBox(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onNameBoxSubmit?.(nameBox);
            e.target.blur();
          } else if (e.key === 'Escape') {
            setNameBox(activeCoord);
            e.target.blur();
          }
        }}
        onBlur={() => setNameBox(activeCoord)}
      />

      <Box className="formula-bar-actions">
        <Tooltip title="Cancel (Esc)">
          <span>
            <button type="button" className="formula-action-btn" disabled={!isEditing} onMouseDown={(e) => e.preventDefault()} onClick={onCancel}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </button>
          </span>
        </Tooltip>
        <Tooltip title="Enter">
          <span>
            <button type="button" className="formula-action-btn" disabled={!isEditing} onMouseDown={(e) => e.preventDefault()} onClick={onConfirm}>
              <CheckIcon sx={{ fontSize: 15 }} />
            </button>
          </span>
        </Tooltip>
        <Box className="formula-fx-icon">
          <FunctionsIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>

      <input
        type="text"
        className="formula-input"
        spellCheck={false}
        placeholder={readOnly ? '' : 'Type a value, or a formula such as =SUM(A1:A5) or =IF(B2>100,"High","Low")'}
        value={formulaBarText}
        readOnly={readOnly}
        onChange={(e) => setFormulaBarText(e.target.value)}
        onKeyDown={handleFormulaBarKeyDown}
        onBlur={handleFormulaBarBlur}
      />
    </Box>
  );
};

export default SpreadsheetFormulaBar;
