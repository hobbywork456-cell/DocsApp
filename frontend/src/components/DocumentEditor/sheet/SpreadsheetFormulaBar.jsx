import React from 'react';
import { Box, Typography } from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';

const SpreadsheetFormulaBar = ({
  activeCoord,
  formulaBarText,
  setFormulaBarText,
  handleFormulaBarKeyDown,
  handleFormulaBarBlur,
  readOnly
}) => {
  return (
    <Box className="spreadsheet-formula-bar">
      <Box className="formula-coord-box">
        <Typography variant="caption" className="coord-text">
          {activeCoord}
        </Typography>
      </Box>

      <Box className="formula-fx-icon">
        <FunctionsIcon sx={{ fontSize: 18, color: '#64748b' }} />
      </Box>

      <input
        type="text"
        className="formula-input"
        placeholder="Enter value or formula starting with = (e.g. =SUM(A1:A5), =C2*D2)"
        value={formulaBarText}
        disabled={readOnly}
        onChange={(e) => setFormulaBarText(e.target.value)}
        onKeyDown={handleFormulaBarKeyDown}
        onBlur={handleFormulaBarBlur}
      />
    </Box>
  );
};

export default SpreadsheetFormulaBar;
