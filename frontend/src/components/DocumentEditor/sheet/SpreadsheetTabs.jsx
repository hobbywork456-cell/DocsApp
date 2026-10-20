import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

const SpreadsheetTabs = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  readOnly
}) => {
  return (
    <Box className="spreadsheet-bottom-tabs">
      <Tooltip title="Add New Sheet">
        <span>
          <IconButton size="small" disabled={readOnly} className="add-sheet-btn" onClick={onAddSheet}>
            <AddIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Box className="sheet-tabs-scroll">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <Box
              key={sheet.id}
              className={`sheet-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSheet(sheet.id)}
            >
              <Typography variant="caption" className="sheet-tab-name">
                {sheet.name}
              </Typography>
              {sheets.length > 1 && !readOnly && (
                <IconButton
                  size="small"
                  className="close-sheet-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSheet(sheet.id);
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SpreadsheetTabs;
