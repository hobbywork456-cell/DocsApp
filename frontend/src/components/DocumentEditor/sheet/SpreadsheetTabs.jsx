import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem, Slider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const fmt = (n) => (Math.abs(n) >= 1e6 || Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 4 }));

const SpreadsheetTabs = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
  onDuplicateSheet,
  selectionStats,
  zoom = 100,
  setZoom,
  readOnly
}) => {
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [menu, setMenu] = useState(null); // { x, y, sheetId }

  const startRename = (sheet) => {
    if (readOnly) return;
    setRenamingId(sheet.id);
    setRenameText(sheet.name);
  };

  const finishRename = () => {
    if (renamingId) onRenameSheet?.(renamingId, renameText);
    setRenamingId(null);
  };

  return (
    <Box className="spreadsheet-bottom-tabs">
      {!readOnly && (
        <Tooltip title="New sheet">
          <IconButton size="small" className="add-sheet-btn" onClick={onAddSheet}>
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      <Box className="sheet-tabs-scroll">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <Box
              key={sheet.id}
              className={`sheet-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSheet(sheet.id)}
              onDoubleClick={() => startRename(sheet)}
              onContextMenu={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, sheetId: sheet.id });
              }}
              title={readOnly ? sheet.name : 'Double-click to rename · Right-click for options'}
            >
              {renamingId === sheet.id ? (
                <input
                  autoFocus
                  className="sheet-tab-rename"
                  value={renameText}
                  maxLength={31}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') finishRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <span className="sheet-tab-name">{sheet.name}</span>
              )}
            </Box>
          );
        })}
      </Box>

      <Menu
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
        slotProps={{ paper: { sx: { minWidth: 160, borderRadius: '10px' } } }}
      >
        <MenuItem dense onClick={() => { startRename(sheets.find((s) => s.id === menu.sheetId)); setMenu(null); }}>Rename</MenuItem>
        <MenuItem dense onClick={() => { onDuplicateSheet?.(menu.sheetId); setMenu(null); }}>Duplicate</MenuItem>
        <MenuItem dense disabled={sheets.length <= 1} sx={{ color: '#dc2626' }} onClick={() => { onDeleteSheet(menu.sheetId); setMenu(null); }}>Delete</MenuItem>
      </Menu>

      <Box className="sheet-status-bar">
        {selectionStats && (
          <Box className="sheet-status-stats">
            {selectionStats.avg !== null && <span>Average: <b>{fmt(selectionStats.avg)}</b></span>}
            <span>Count: <b>{selectionStats.count}</b></span>
            {selectionStats.numCount > 0 && <span>Sum: <b>{fmt(selectionStats.sum)}</b></span>}
          </Box>
        )}
        <Box className="sheet-zoom">
          <IconButton size="small" onClick={() => setZoom?.(Math.max(50, zoom - 10))} aria-label="Zoom out">
            <RemoveIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Slider
            size="small"
            min={50}
            max={200}
            step={10}
            value={zoom}
            onChange={(_, v) => setZoom?.(v)}
            sx={{ width: 90, color: '#107c41', mx: 0.5, '& .MuiSlider-thumb': { width: 10, height: 10 } }}
            aria-label="Zoom"
          />
          <IconButton size="small" onClick={() => setZoom?.(Math.min(200, zoom + 10))} aria-label="Zoom in">
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <span className="sheet-zoom-label" onClick={() => setZoom?.(100)} title="Reset to 100%">{zoom}%</span>
        </Box>
      </Box>
    </Box>
  );
};

export default SpreadsheetTabs;
