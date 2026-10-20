import React, { useState } from 'react';
import {
  Box,
  Tooltip,
  Menu,
  MenuItem,
  Popover,
  Divider,
  Typography,
  InputBase,
  IconButton,
  Button
} from '@mui/material';

// Icons
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import BorderAllIcon from '@mui/icons-material/BorderAll';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import TextRotateVerticalIcon from '@mui/icons-material/TextRotateVertical';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import WrapTextIcon from '@mui/icons-material/WrapText';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PercentIcon from '@mui/icons-material/Percent';
import FunctionsIcon from '@mui/icons-material/Functions';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddBoxIcon from '@mui/icons-material/AddBox';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AppsIcon from '@mui/icons-material/Apps';
import LaunchIcon from '@mui/icons-material/Launch';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import './ExcelRibbonToolbar.css';

// Font Families
const FONT_FAMILIES = [
  'Aptos Narrow',
  'Calibri',
  'Arial',
  'Times New Roman',
  'Roboto',
  'Georgia',
  'Verdana',
  'Courier New',
  'Segoe UI',
  'Trebuchet MS',
  'Impact'
];

// Font Sizes
const FONT_SIZES = [
  '8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '36', '48', '72'
];

// Number Formats
const NUMBER_FORMATS = [
  { id: 'general', label: 'General', desc: 'No specific format' },
  { id: 'number', label: 'Number', desc: '1,234.56' },
  { id: 'currency', label: 'Currency', desc: '$1,234.56' },
  { id: 'accounting', label: 'Accounting', desc: '$ 1,234.56' },
  { id: 'shortDate', label: 'Short Date', desc: '20/10/2026' },
  { id: 'longDate', label: 'Long Date', desc: 'Tuesday, October 20, 2026' },
  { id: 'time', label: 'Time', desc: '14:30:00' },
  { id: 'percent', label: 'Percentage', desc: '15.00%' },
  { id: 'fraction', label: 'Fraction', desc: '1/2' },
  { id: 'scientific', label: 'Scientific', desc: '1.23E+03' },
  { id: 'text', label: 'Text', desc: 'Plain text format' }
];

// Theme Colors Palette
const THEME_PALETTE = [
  ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
  ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
  ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
  ['#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130']
];

const SpreadsheetToolbar = ({
  activeCellData = {},
  activeCoord = 'A1',
  selectedCell = { row: 1, col: 0 },
  applyFormatting,
  applyCellStyle,
  applyNumberFormat,
  handleAutoSum,
  handleSort,
  handleClear,
  insertRow,
  deleteRow,
  insertColumn,
  deleteColumn,
  handleAddSheet,
  onExportCSV,
  formatPainterActive,
  setFormatPainterActive,
  readOnly = false
}) => {
  // Anchors for dropdown menus and popovers
  const [fontMenuAnchor, setFontMenuAnchor] = useState(null);
  const [sizeMenuAnchor, setSizeMenuAnchor] = useState(null);
  const [underlineMenuAnchor, setUnderlineMenuAnchor] = useState(null);
  const [borderMenuAnchor, setBorderMenuAnchor] = useState(null);
  const [fillColorAnchor, setFillColorAnchor] = useState(null);
  const [fontColorAnchor, setFontColorAnchor] = useState(null);
  const [orientationMenuAnchor, setOrientationMenuAnchor] = useState(null);
  const [mergeMenuAnchor, setMergeMenuAnchor] = useState(null);
  const [numberFormatAnchor, setNumberFormatAnchor] = useState(null);
  const [currencyMenuAnchor, setCurrencyMenuAnchor] = useState(null);
  const [conditionalMenuAnchor, setConditionalMenuAnchor] = useState(null);
  const [tableStyleAnchor, setTableStyleAnchor] = useState(null);
  const [allStylesAnchor, setAllStylesAnchor] = useState(null);
  const [insertMenuAnchor, setInsertMenuAnchor] = useState(null);
  const [deleteMenuAnchor, setDeleteMenuAnchor] = useState(null);
  const [formatCellsAnchor, setFormatCellsAnchor] = useState(null);
  const [autoSumAnchor, setAutoSumAnchor] = useState(null);
  const [fillMenuAnchor, setFillMenuAnchor] = useState(null);
  const [clearMenuAnchor, setClearMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // Find & Replace Floating Bar
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [findText, setFindText] = useState('');

  // Values from active cell
  const currentFont = activeCellData.fontFamily || 'Aptos Narrow';
  const currentSize = activeCellData.fontSize ? activeCellData.fontSize.replace('pt', '') : '11';
  const currentNumberFormat = activeCellData.format
    ? NUMBER_FORMATS.find(n => n.id === activeCellData.format)?.label || 'General'
    : 'General';
  const currentFillColor = activeCellData.bg || '#ffff00';
  const currentFontColor = activeCellData.color || '#ff0000';

  // Grow / Shrink Font Helpers
  const handleGrowFont = () => {
    const curIdx = FONT_SIZES.indexOf(currentSize);
    if (curIdx < FONT_SIZES.length - 1) {
      applyFormatting('fontSize', `${FONT_SIZES[curIdx + 1]}pt`);
    }
  };

  const handleShrinkFont = () => {
    const curIdx = FONT_SIZES.indexOf(currentSize);
    if (curIdx > 0) {
      applyFormatting('fontSize', `${FONT_SIZES[curIdx - 1]}pt`);
    }
  };

  // Clipboard operations
  const handlePaste = async () => {
    if (readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text !== undefined) {
        applyFormatting('value', text);
      }
    } catch {
      alert("Press Ctrl + V to paste into the selected cell.");
    }
  };

  const handleCopy = async () => {
    const textToCopy = activeCellData.formula || activeCellData.value || '';
    try {
      await navigator.clipboard.writeText(String(textToCopy));
    } catch {
      document.execCommand('copy');
    }
  };

  const handleCut = async () => {
    if (readOnly) return;
    const textToCut = activeCellData.formula || activeCellData.value || '';
    try {
      await navigator.clipboard.writeText(String(textToCut));
      applyFormatting('value', '');
    } catch {
      document.execCommand('cut');
    }
  };

  return (
    <Box className="excel-ribbon-container">
      {/* ── 1. CLIPBOARD GROUP ────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          {/* Big Paste Button */}
          <Tooltip title="Paste (Ctrl+V)">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={handlePaste}
            >
              <ContentPasteIcon sx={{ fontSize: 26, color: '#f59e0b' }} />
              <span className="excel-btn-big-label">Paste</span>
            </button>
          </Tooltip>

          {/* Cut, Copy, Format Painter */}
          <div className="excel-group-row-stack">
            <Tooltip title="Cut (Ctrl+X)">
              <button
                type="button"
                className="excel-btn-small"
                disabled={readOnly}
                onClick={handleCut}
              >
                <ContentCutIcon sx={{ fontSize: 14 }} />
                <span className="ml-1 text-[11px]">Cut</span>
              </button>
            </Tooltip>

            <Tooltip title="Copy (Ctrl+C)">
              <button
                type="button"
                className="excel-btn-small"
                disabled={readOnly}
                onClick={handleCopy}
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
                <span className="ml-1 text-[11px]">Copy</span>
              </button>
            </Tooltip>

            <Tooltip title="Format Painter (Copy formatting from one cell and apply to another)">
              <button
                type="button"
                className={`excel-btn-small ${formatPainterActive ? 'active' : ''}`}
                disabled={readOnly}
                onClick={() => setFormatPainterActive && setFormatPainterActive(!formatPainterActive)}
              >
                <FormatPaintIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                <span className="ml-1 text-[11px]">Format Painter</span>
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Clipboard</span>
          <LaunchIcon className="excel-launcher-icon" />
        </div>
      </div>

      {/* ── 2. FONT GROUP ─────────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          <div className="excel-group-row-stack">
            {/* Row 1: Font Family, Font Size, Grow, Shrink */}
            <div className="excel-group-row">
              {/* Font Family Selector */}
              <button
                type="button"
                className="excel-dropdown-select w-[114px]"
                disabled={readOnly}
                onClick={(e) => setFontMenuAnchor(e.currentTarget)}
              >
                <span className="truncate">{currentFont}</span>
                <ArrowDropDownIcon sx={{ fontSize: 16 }} />
              </button>
              <Menu
                anchorEl={fontMenuAnchor}
                open={Boolean(fontMenuAnchor)}
                onClose={() => setFontMenuAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 280, minWidth: 150 } } }}
              >
                {FONT_FAMILIES.map((font) => (
                  <MenuItem
                    key={font}
                    onClick={() => {
                      applyFormatting('fontFamily', font);
                      setFontMenuAnchor(null);
                    }}
                    selected={currentFont === font}
                    sx={{ fontFamily: font, fontSize: '0.82rem' }}
                  >
                    {font}
                  </MenuItem>
                ))}
              </Menu>

              {/* Font Size Selector */}
              <button
                type="button"
                className="excel-dropdown-select w-[44px]"
                disabled={readOnly}
                onClick={(e) => setSizeMenuAnchor(e.currentTarget)}
              >
                <span>{currentSize}</span>
                <ArrowDropDownIcon sx={{ fontSize: 16 }} />
              </button>
              <Menu
                anchorEl={sizeMenuAnchor}
                open={Boolean(sizeMenuAnchor)}
                onClose={() => setSizeMenuAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 260, minWidth: 60 } } }}
              >
                {FONT_SIZES.map((sz) => (
                  <MenuItem
                    key={sz}
                    onClick={() => {
                      applyFormatting('fontSize', `${sz}pt`);
                      setSizeMenuAnchor(null);
                    }}
                    selected={currentSize === sz}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {sz}
                  </MenuItem>
                ))}
              </Menu>

              {/* Grow Font */}
              <Tooltip title="Increase Font Size (Grow Font)">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={handleGrowFont}
                >
                  <span className="font-bold text-xs flex items-center">A<sup className="text-[9px] text-blue-600">▲</sup></span>
                </button>
              </Tooltip>

              {/* Shrink Font */}
              <Tooltip title="Decrease Font Size (Shrink Font)">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={handleShrinkFont}
                >
                  <span className="font-bold text-xs flex items-center">A<sub className="text-[9px] text-blue-600">▼</sub></span>
                </button>
              </Tooltip>
            </div>

            {/* Row 2: Bold, Italic, Underline, Borders, Fill Color, Font Color */}
            <div className="excel-group-row">
              <Tooltip title="Bold (Ctrl+B)">
                <button
                  type="button"
                  className={`excel-btn-small font-bold ${activeCellData.bold ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('bold', !activeCellData.bold)}
                >
                  <FormatBoldIcon sx={{ fontSize: 16 }} />
                </button>
              </Tooltip>

              <Tooltip title="Italic (Ctrl+I)">
                <button
                  type="button"
                  className={`excel-btn-small italic ${activeCellData.italic ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('italic', !activeCellData.italic)}
                >
                  <FormatItalicIcon sx={{ fontSize: 16 }} />
                </button>
              </Tooltip>

              {/* Underline Split Button */}
              <div className="excel-split-btn">
                <Tooltip title="Underline (Ctrl+U)">
                  <button
                    type="button"
                    className={`excel-split-btn-main ${activeCellData.underline ? 'active' : ''}`}
                    disabled={readOnly}
                    onClick={() => applyFormatting('underline', !activeCellData.underline)}
                  >
                    <FormatUnderlinedIcon sx={{ fontSize: 16 }} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="excel-split-btn-arrow"
                  disabled={readOnly}
                  onClick={(e) => setUnderlineMenuAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </div>
              <Menu
                anchorEl={underlineMenuAnchor}
                open={Boolean(underlineMenuAnchor)}
                onClose={() => setUnderlineMenuAnchor(null)}
              >
                <MenuItem onClick={() => { applyFormatting('underline', 'single'); setUnderlineMenuAnchor(null); }}>
                  <u>Underline</u>
                </MenuItem>
                <MenuItem onClick={() => { applyFormatting('underline', 'double'); setUnderlineMenuAnchor(null); }}>
                  <span style={{ textDecoration: 'underline double' }}>Double Underline</span>
                </MenuItem>
                <MenuItem onClick={() => { applyFormatting('underline', false); setUnderlineMenuAnchor(null); }}>
                  No Underline
                </MenuItem>
              </Menu>

              {/* Borders Dropdown */}
              <div className="excel-split-btn">
                <Tooltip title="Borders">
                  <button
                    type="button"
                    className="excel-split-btn-main"
                    disabled={readOnly}
                    onClick={(e) => setBorderMenuAnchor(e.currentTarget)}
                  >
                    <BorderAllIcon sx={{ fontSize: 16 }} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="excel-split-btn-arrow"
                  disabled={readOnly}
                  onClick={(e) => setBorderMenuAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </div>
              <Menu
                anchorEl={borderMenuAnchor}
                open={Boolean(borderMenuAnchor)}
                onClose={() => setBorderMenuAnchor(null)}
                slotProps={{ paper: { sx: { width: 175 } } }}
              >
                <MenuItem onClick={() => { applyFormatting('border', 'bottom'); setBorderMenuAnchor(null); }}>Bottom Border</MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'top'); setBorderMenuAnchor(null); }}>Top Border</MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'left'); setBorderMenuAnchor(null); }}>Left Border</MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'right'); setBorderMenuAnchor(null); }}>Right Border</MenuItem>
                <Divider />
                <MenuItem onClick={() => { applyFormatting('border', 'none'); setBorderMenuAnchor(null); }}>No Border</MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'all'); setBorderMenuAnchor(null); }}><strong>All Borders</strong></MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'thick'); setBorderMenuAnchor(null); }}>Thick Box Border</MenuItem>
                <MenuItem onClick={() => { applyFormatting('border', 'double-bottom'); setBorderMenuAnchor(null); }}>Bottom Double Border</MenuItem>
              </Menu>

              {/* Fill Color Split Button */}
              <div className="excel-split-btn">
                <Tooltip title="Fill Color">
                  <button
                    type="button"
                    className="excel-split-btn-main flex-col py-0.5"
                    disabled={readOnly}
                    onClick={() => applyFormatting('bg', currentFillColor)}
                  >
                    <FormatColorFillIcon sx={{ fontSize: 15 }} />
                    <span className="excel-color-indicator-bar" style={{ backgroundColor: currentFillColor }} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="excel-split-btn-arrow"
                  disabled={readOnly}
                  onClick={(e) => setFillColorAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </div>
              <Popover
                anchorEl={fillColorAnchor}
                open={Boolean(fillColorAnchor)}
                onClose={() => setFillColorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box className="p-3 w-[220px]">
                  <Typography variant="caption" className="font-bold text-gray-500 block mb-1.5">
                    Theme Colors
                  </Typography>
                  <Box className="space-y-1">
                    {THEME_PALETTE.map((row, rIdx) => (
                      <Box key={rIdx} className="flex gap-1 justify-between">
                        {row.map((c, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => {
                              applyFormatting('bg', c);
                              setFillColorAnchor(null);
                            }}
                            className="w-4 h-4 rounded-xs border border-black/10 hover:scale-125 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Button
                    size="small"
                    fullWidth
                    onClick={() => {
                      applyFormatting('bg', undefined);
                      setFillColorAnchor(null);
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    No Fill
                  </Button>
                </Box>
              </Popover>

              {/* Font Color Split Button */}
              <div className="excel-split-btn">
                <Tooltip title="Font Color">
                  <button
                    type="button"
                    className="excel-split-btn-main flex-col py-0.5"
                    disabled={readOnly}
                    onClick={() => applyFormatting('color', currentFontColor)}
                  >
                    <FormatColorTextIcon sx={{ fontSize: 15 }} />
                    <span className="excel-color-indicator-bar" style={{ backgroundColor: currentFontColor }} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="excel-split-btn-arrow"
                  disabled={readOnly}
                  onClick={(e) => setFontColorAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </div>
              <Popover
                anchorEl={fontColorAnchor}
                open={Boolean(fontColorAnchor)}
                onClose={() => setFontColorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box className="p-3 w-[220px]">
                  <Typography variant="caption" className="font-bold text-gray-500 block mb-1.5">
                    Font Colors
                  </Typography>
                  <Box className="space-y-1">
                    {THEME_PALETTE.map((row, rIdx) => (
                      <Box key={rIdx} className="flex gap-1 justify-between">
                        {row.map((c, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => {
                              applyFormatting('color', c);
                              setFontColorAnchor(null);
                            }}
                            className="w-4 h-4 rounded-xs border border-black/10 hover:scale-125 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Button
                    size="small"
                    fullWidth
                    onClick={() => {
                      applyFormatting('color', '#000000');
                      setFontColorAnchor(null);
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Automatic (Black)
                  </Button>
                </Box>
              </Popover>
            </div>
          </div>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Font</span>
          <LaunchIcon className="excel-launcher-icon" />
        </div>
      </div>

      {/* ── 3. ALIGNMENT GROUP ────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          <div className="excel-group-row-stack">
            {/* Row 1: Top, Middle, Bottom align; Orientation */}
            <div className="excel-group-row">
              <Tooltip title="Top Align">
                <button
                  type="button"
                  className={`excel-btn-small ${activeCellData.valign === 'top' ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('valign', 'top')}
                >
                  <VerticalAlignTopIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Middle Align">
                <button
                  type="button"
                  className={`excel-btn-small ${(!activeCellData.valign || activeCellData.valign === 'middle') ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('valign', 'middle')}
                >
                  <VerticalAlignCenterIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Bottom Align">
                <button
                  type="button"
                  className={`excel-btn-small ${activeCellData.valign === 'bottom' ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('valign', 'bottom')}
                >
                  <VerticalAlignBottomIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              {/* Orientation / Angle Text */}
              <Tooltip title="Orientation (Rotate Text)">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={(e) => setOrientationMenuAnchor(e.currentTarget)}
                >
                  <TextRotateVerticalIcon sx={{ fontSize: 15 }} />
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Menu
                anchorEl={orientationMenuAnchor}
                open={Boolean(orientationMenuAnchor)}
                onClose={() => setOrientationMenuAnchor(null)}
              >
                <MenuItem onClick={() => { applyFormatting('orientation', 'counterclockwise'); setOrientationMenuAnchor(null); }}>Angle Counterclockwise</MenuItem>
                <MenuItem onClick={() => { applyFormatting('orientation', 'clockwise'); setOrientationMenuAnchor(null); }}>Angle Clockwise</MenuItem>
                <MenuItem onClick={() => { applyFormatting('orientation', 'vertical'); setOrientationMenuAnchor(null); }}>Vertical Text</MenuItem>
                <MenuItem onClick={() => { applyFormatting('orientation', 'normal'); setOrientationMenuAnchor(null); }}>Reset Orientation</MenuItem>
              </Menu>
            </div>

            {/* Row 2: Align Left, Center, Right; Indents */}
            <div className="excel-group-row">
              <Tooltip title="Align Left">
                <button
                  type="button"
                  className={`excel-btn-small ${(!activeCellData.align || activeCellData.align === 'left') ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('align', 'left')}
                >
                  <FormatAlignLeftIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Center">
                <button
                  type="button"
                  className={`excel-btn-small ${activeCellData.align === 'center' ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('align', 'center')}
                >
                  <FormatAlignCenterIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Align Right">
                <button
                  type="button"
                  className={`excel-btn-small ${activeCellData.align === 'right' ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('align', 'right')}
                >
                  <FormatAlignRightIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Decrease Indent">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={() => applyFormatting('indent', Math.max(0, (activeCellData.indent || 0) - 1))}
                >
                  <FormatIndentDecreaseIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>

              <Tooltip title="Increase Indent">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={() => applyFormatting('indent', (activeCellData.indent || 0) + 1)}
                >
                  <FormatIndentIncreaseIcon sx={{ fontSize: 15 }} />
                </button>
              </Tooltip>
            </div>
          </div>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.8 }} />

          {/* Wrap Text & Merge & Center */}
          <div className="excel-group-row-stack">
            <Tooltip title="Wrap Text (Wrap extra-long text into multiple lines)">
              <button
                type="button"
                className={`excel-btn-small ${activeCellData.wrap ? 'active' : ''}`}
                disabled={readOnly}
                onClick={() => applyFormatting('wrap', !activeCellData.wrap)}
              >
                <WrapTextIcon sx={{ fontSize: 15, color: '#2563eb' }} />
                <span className="ml-1 text-[11px] font-medium">Wrap Text</span>
              </button>
            </Tooltip>

            {/* Merge & Center */}
            <div className="excel-split-btn">
              <Tooltip title="Merge & Center">
                <button
                  type="button"
                  className={`excel-split-btn-main ${activeCellData.merge ? 'active' : ''}`}
                  disabled={readOnly}
                  onClick={() => applyFormatting('merge', !activeCellData.merge)}
                >
                  <CallMergeIcon sx={{ fontSize: 15, color: '#2563eb' }} />
                  <span className="ml-1 text-[11px] font-medium">Merge &amp; Center</span>
                </button>
              </Tooltip>
              <button
                type="button"
                className="excel-split-btn-arrow"
                disabled={readOnly}
                onClick={(e) => setMergeMenuAnchor(e.currentTarget)}
              >
                <ArrowDropDownIcon sx={{ fontSize: 13 }} />
              </button>
            </div>
            <Menu
              anchorEl={mergeMenuAnchor}
              open={Boolean(mergeMenuAnchor)}
              onClose={() => setMergeMenuAnchor(null)}
            >
              <MenuItem onClick={() => { applyFormatting('merge', true); applyFormatting('align', 'center'); setMergeMenuAnchor(null); }}>
                Merge &amp; Center
              </MenuItem>
              <MenuItem onClick={() => { applyFormatting('merge', true); setMergeMenuAnchor(null); }}>
                Merge Across
              </MenuItem>
              <MenuItem onClick={() => { applyFormatting('merge', true); setMergeMenuAnchor(null); }}>
                Merge Cells
              </MenuItem>
              <MenuItem onClick={() => { applyFormatting('merge', false); setMergeMenuAnchor(null); }}>
                Unmerge Cells
              </MenuItem>
            </Menu>
          </div>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Alignment</span>
          <LaunchIcon className="excel-launcher-icon" />
        </div>
      </div>

      {/* ── 4. NUMBER GROUP ───────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          <div className="excel-group-row-stack">
            {/* Number Format Dropdown */}
            <button
              type="button"
              className="excel-dropdown-select w-[124px]"
              disabled={readOnly}
              onClick={(e) => setNumberFormatAnchor(e.currentTarget)}
            >
              <span className="truncate">{currentNumberFormat}</span>
              <ArrowDropDownIcon sx={{ fontSize: 16 }} />
            </button>
            <Menu
              anchorEl={numberFormatAnchor}
              open={Boolean(numberFormatAnchor)}
              onClose={() => setNumberFormatAnchor(null)}
              slotProps={{ paper: { sx: { maxHeight: 320, minWidth: 170 } } }}
            >
              {NUMBER_FORMATS.map((fmt) => (
                <MenuItem
                  key={fmt.id}
                  onClick={() => {
                    applyNumberFormat(fmt.id);
                    setNumberFormatAnchor(null);
                  }}
                  selected={activeCellData.format === fmt.id}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 0.6 }}
                >
                  <span className="font-semibold text-xs text-gray-800 dark:text-gray-100">{fmt.label}</span>
                  <span className="text-[10px] text-gray-500">{fmt.desc}</span>
                </MenuItem>
              ))}
            </Menu>

            {/* Quick formats: Currency, Percent, Comma, Decimal steppers */}
            <div className="excel-group-row">
              {/* Currency */}
              <div className="excel-split-btn">
                <Tooltip title="Accounting Number Format ($)">
                  <button
                    type="button"
                    className="excel-split-btn-main"
                    disabled={readOnly}
                    onClick={() => applyNumberFormat('currency')}
                  >
                    <AttachMoneyIcon sx={{ fontSize: 15 }} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="excel-split-btn-arrow"
                  disabled={readOnly}
                  onClick={(e) => setCurrencyMenuAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 13 }} />
                </button>
              </div>
              <Menu
                anchorEl={currencyMenuAnchor}
                open={Boolean(currencyMenuAnchor)}
                onClose={() => setCurrencyMenuAnchor(null)}
              >
                <MenuItem onClick={() => { applyFormatting('currencySymbol', '$'); applyNumberFormat('currency'); setCurrencyMenuAnchor(null); }}>$ English (U.S.)</MenuItem>
                <MenuItem onClick={() => { applyFormatting('currencySymbol', '₹'); applyNumberFormat('currency'); setCurrencyMenuAnchor(null); }}>₹ Rupee (India)</MenuItem>
                <MenuItem onClick={() => { applyFormatting('currencySymbol', '€'); applyNumberFormat('currency'); setCurrencyMenuAnchor(null); }}>€ Euro</MenuItem>
                <MenuItem onClick={() => { applyFormatting('currencySymbol', '£'); applyNumberFormat('currency'); setCurrencyMenuAnchor(null); }}>£ Pound</MenuItem>
                <MenuItem onClick={() => { applyFormatting('currencySymbol', '¥'); applyNumberFormat('currency'); setCurrencyMenuAnchor(null); }}>¥ Chinese / Yen</MenuItem>
              </Menu>

              {/* Percent */}
              <Tooltip title="Percent Style (%)">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={() => applyNumberFormat('percent')}
                >
                  <PercentIcon sx={{ fontSize: 14 }} />
                </button>
              </Tooltip>

              {/* Comma */}
              <Tooltip title="Comma Style (,)">
                <button
                  type="button"
                  className="excel-btn-small font-black text-xs"
                  disabled={readOnly}
                  onClick={() => applyNumberFormat('comma')}
                >
                  ,
                </button>
              </Tooltip>

              {/* Increase Decimal */}
              <Tooltip title="Increase Decimal">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={() => applyFormatting('decimals', (activeCellData.decimals !== undefined ? activeCellData.decimals : 2) + 1)}
                >
                  <span className="text-[10px] font-bold">.00<span className="text-blue-600">←</span></span>
                </button>
              </Tooltip>

              {/* Decrease Decimal */}
              <Tooltip title="Decrease Decimal">
                <button
                  type="button"
                  className="excel-btn-small"
                  disabled={readOnly}
                  onClick={() => applyFormatting('decimals', Math.max(0, (activeCellData.decimals !== undefined ? activeCellData.decimals : 2) - 1))}
                >
                  <span className="text-[10px] font-bold"><span className="text-blue-600">→</span>.0</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Number</span>
          <LaunchIcon className="excel-launcher-icon" />
        </div>
      </div>

      {/* ── 5. STYLES GROUP ───────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          <div className="excel-group-row-stack">
            {/* Conditional Formatting */}
            <Tooltip title="Conditional Formatting">
              <button
                type="button"
                className="excel-btn-small justify-start"
                disabled={readOnly}
                onClick={(e) => setConditionalMenuAnchor(e.currentTarget)}
              >
                <AutoAwesomeIcon sx={{ fontSize: 15, color: '#ef4444' }} />
                <span className="ml-1 text-[11px] font-medium">Conditional Formatting</span>
                <ArrowDropDownIcon sx={{ fontSize: 13 }} />
              </button>
            </Tooltip>
            <Menu
              anchorEl={conditionalMenuAnchor}
              open={Boolean(conditionalMenuAnchor)}
              onClose={() => setConditionalMenuAnchor(null)}
            >
              <MenuItem onClick={() => { applyCellStyle('good'); setConditionalMenuAnchor(null); }}>Highlight Cell Rules (Good)</MenuItem>
              <MenuItem onClick={() => { applyCellStyle('bad'); setConditionalMenuAnchor(null); }}>Highlight Cell Rules (Bad)</MenuItem>
              <MenuItem onClick={() => { applyCellStyle('neutral'); setConditionalMenuAnchor(null); }}>Highlight Cell Rules (Neutral)</MenuItem>
              <Divider />
              <MenuItem onClick={() => { applyCellStyle('normal'); setConditionalMenuAnchor(null); }}>Clear Rules</MenuItem>
            </Menu>

            {/* Format as Table */}
            <Tooltip title="Format as Table">
              <button
                type="button"
                className="excel-btn-small justify-start"
                disabled={readOnly}
                onClick={(e) => setTableStyleAnchor(e.currentTarget)}
              >
                <TableChartIcon sx={{ fontSize: 15, color: '#3b82f6' }} />
                <span className="ml-1 text-[11px] font-medium">Format as Table</span>
                <ArrowDropDownIcon sx={{ fontSize: 13 }} />
              </button>
            </Tooltip>
            <Menu
              anchorEl={tableStyleAnchor}
              open={Boolean(tableStyleAnchor)}
              onClose={() => setTableStyleAnchor(null)}
            >
              <MenuItem onClick={() => { applyFormatting('bg', '#e0f2fe'); applyFormatting('bold', true); setTableStyleAnchor(null); }}>Table Style Light Blue</MenuItem>
              <MenuItem onClick={() => { applyFormatting('bg', '#dcfce7'); applyFormatting('bold', true); setTableStyleAnchor(null); }}>Table Style Light Green</MenuItem>
              <MenuItem onClick={() => { applyFormatting('bg', '#fef3c7'); applyFormatting('bold', true); setTableStyleAnchor(null); }}>Table Style Light Orange</MenuItem>
              <MenuItem onClick={() => { applyFormatting('bg', '#1e293b'); applyFormatting('color', '#ffffff'); applyFormatting('bold', true); setTableStyleAnchor(null); }}>Table Style Dark Slate</MenuItem>
            </Menu>
          </div>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.8 }} />

          {/* Cell Styles Gallery matching Microsoft Excel Image */}
          <div className="excel-cell-styles-gallery">
            <div
              className="excel-cell-style-badge style-normal"
              onClick={() => applyCellStyle('normal')}
              title="Normal Cell Style"
            >
              Normal
            </div>
            <div
              className="excel-cell-style-badge style-bad"
              onClick={() => applyCellStyle('bad')}
              title="Bad Cell Style"
            >
              Bad
            </div>
            <div
              className="excel-cell-style-badge style-good"
              onClick={() => applyCellStyle('good')}
              title="Good Cell Style"
            >
              Good
            </div>
            <div
              className="excel-cell-style-badge style-neutral"
              onClick={() => applyCellStyle('neutral')}
              title="Neutral Cell Style"
            >
              Neutral
            </div>
            <div
              className="excel-cell-style-badge style-calculation"
              onClick={() => applyCellStyle('calculation')}
              title="Calculation Cell Style"
            >
              Calculation
            </div>
            <div
              className="excel-cell-style-badge style-check"
              onClick={() => applyCellStyle('check')}
              title="Check Cell Style"
            >
              Check Cell
            </div>

            {/* Dropdown for Heading 1, Heading 2, Total */}
            <button
              type="button"
              className="excel-btn-small p-0"
              onClick={(e) => setAllStylesAnchor(e.currentTarget)}
            >
              <ArrowDropDownIcon sx={{ fontSize: 16 }} />
            </button>
            <Menu
              anchorEl={allStylesAnchor}
              open={Boolean(allStylesAnchor)}
              onClose={() => setAllStylesAnchor(null)}
            >
              <MenuItem onClick={() => { applyCellStyle('heading1'); setAllStylesAnchor(null); }}>
                <span className="font-bold text-blue-700 text-sm">Heading 1</span>
              </MenuItem>
              <MenuItem onClick={() => { applyCellStyle('total'); setAllStylesAnchor(null); }}>
                <span className="font-bold border-b-2 border-t border-black">Total Summary</span>
              </MenuItem>
              <MenuItem onClick={() => { applyCellStyle('normal'); setAllStylesAnchor(null); }}>
                <span>Reset to Normal</span>
              </MenuItem>
            </Menu>
          </div>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Styles</span>
        </div>
      </div>

      {/* ── 6. CELLS GROUP ────────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          {/* Insert */}
          <Tooltip title="Insert Cells / Rows / Columns">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setInsertMenuAnchor(e.currentTarget)}
            >
              <AddBoxIcon sx={{ fontSize: 24, color: '#107c41' }} />
              <span className="excel-btn-big-label">Insert <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={insertMenuAnchor}
            open={Boolean(insertMenuAnchor)}
            onClose={() => setInsertMenuAnchor(null)}
          >
            <MenuItem onClick={() => { insertRow(false); setInsertMenuAnchor(null); }}>Insert Sheet Rows Above</MenuItem>
            <MenuItem onClick={() => { insertRow(true); setInsertMenuAnchor(null); }}>Insert Sheet Rows Below</MenuItem>
            <MenuItem onClick={() => { insertColumn(false); setInsertMenuAnchor(null); }}>Insert Sheet Columns Left</MenuItem>
            <MenuItem onClick={() => { insertColumn(true); setInsertMenuAnchor(null); }}>Insert Sheet Columns Right</MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleAddSheet && handleAddSheet(); setInsertMenuAnchor(null); }}>Insert New Sheet</MenuItem>
          </Menu>

          {/* Delete */}
          <Tooltip title="Delete Cells / Rows / Columns">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setDeleteMenuAnchor(e.currentTarget)}
            >
              <DeleteOutlineIcon sx={{ fontSize: 24, color: '#ef4444' }} />
              <span className="excel-btn-big-label">Delete <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={deleteMenuAnchor}
            open={Boolean(deleteMenuAnchor)}
            onClose={() => setDeleteMenuAnchor(null)}
          >
            <MenuItem onClick={() => { deleteRow(); setDeleteMenuAnchor(null); }}>Delete Sheet Rows</MenuItem>
            <MenuItem onClick={() => { deleteColumn(); setDeleteMenuAnchor(null); }}>Delete Sheet Columns</MenuItem>
          </Menu>

          {/* Format */}
          <Tooltip title="Format Row Height / Column Width">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setFormatCellsAnchor(e.currentTarget)}
            >
              <TuneIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
              <span className="excel-btn-big-label">Format <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={formatCellsAnchor}
            open={Boolean(formatCellsAnchor)}
            onClose={() => setFormatCellsAnchor(null)}
          >
            <MenuItem onClick={() => { applyFormatting('valign', 'middle'); setFormatCellsAnchor(null); }}>AutoFit Row Height</MenuItem>
            <MenuItem onClick={() => { applyFormatting('wrap', true); setFormatCellsAnchor(null); }}>AutoFit Column Content</MenuItem>
          </Menu>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Cells</span>
        </div>
      </div>

      {/* ── 7. EDITING GROUP ──────────────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          {/* AutoSum */}
          <Tooltip title="AutoSum (Automatically add up contiguous cells)">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={() => handleAutoSum('SUM')}
            >
              <FunctionsIcon sx={{ fontSize: 24, color: '#0f172a' }} />
              <span className="excel-btn-big-label">
                AutoSum
                <ArrowDropDownIcon sx={{ fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setAutoSumAnchor(e.currentTarget); }} />
              </span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={autoSumAnchor}
            open={Boolean(autoSumAnchor)}
            onClose={() => setAutoSumAnchor(null)}
          >
            <MenuItem onClick={() => { handleAutoSum('SUM'); setAutoSumAnchor(null); }}>Sum</MenuItem>
            <MenuItem onClick={() => { handleAutoSum('AVERAGE'); setAutoSumAnchor(null); }}>Average</MenuItem>
            <MenuItem onClick={() => { handleAutoSum('COUNT'); setAutoSumAnchor(null); }}>Count Numbers</MenuItem>
            <MenuItem onClick={() => { handleAutoSum('MAX'); setAutoSumAnchor(null); }}>Max</MenuItem>
            <MenuItem onClick={() => { handleAutoSum('MIN'); setAutoSumAnchor(null); }}>Min</MenuItem>
          </Menu>

          {/* Fill */}
          <Tooltip title="Fill series or down">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setFillMenuAnchor(e.currentTarget)}
            >
              <AutoFixHighIcon sx={{ fontSize: 22, color: '#2563eb' }} />
              <span className="excel-btn-big-label">Fill <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={fillMenuAnchor}
            open={Boolean(fillMenuAnchor)}
            onClose={() => setFillMenuAnchor(null)}
          >
            <MenuItem onClick={() => { applyFormatting('value', activeCellData.value || '1'); setFillMenuAnchor(null); }}>Fill Down</MenuItem>
            <MenuItem onClick={() => { applyFormatting('value', activeCellData.value || '1'); setFillMenuAnchor(null); }}>Fill Right</MenuItem>
          </Menu>

          {/* Clear */}
          <Tooltip title="Clear Cell Contents or Formats">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setClearMenuAnchor(e.currentTarget)}
            >
              <span className="font-bold text-lg text-purple-600">⌫</span>
              <span className="excel-btn-big-label">Clear <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={clearMenuAnchor}
            open={Boolean(clearMenuAnchor)}
            onClose={() => setClearMenuAnchor(null)}
          >
            <MenuItem onClick={() => { handleClear('all'); setClearMenuAnchor(null); }}>Clear All</MenuItem>
            <MenuItem onClick={() => { handleClear('formats'); setClearMenuAnchor(null); }}>Clear Formats</MenuItem>
            <MenuItem onClick={() => { handleClear('contents'); setClearMenuAnchor(null); }}>Clear Contents</MenuItem>
          </Menu>

          {/* Sort & Filter */}
          <Tooltip title="Sort & Filter">
            <button
              type="button"
              className="excel-btn-big"
              disabled={readOnly}
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            >
              <SortByAlphaIcon sx={{ fontSize: 22, color: '#107c41' }} />
              <span className="excel-btn-big-label">Sort <ArrowDropDownIcon sx={{ fontSize: 13 }} /></span>
            </button>
          </Tooltip>
          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={() => setSortMenuAnchor(null)}
          >
            <MenuItem onClick={() => { handleSort('asc'); setSortMenuAnchor(null); }}>Sort A to Z (Ascending)</MenuItem>
            <MenuItem onClick={() => { handleSort('desc'); setSortMenuAnchor(null); }}>Sort Z to A (Descending)</MenuItem>
          </Menu>

          {/* Find & Select */}
          <Tooltip title="Find in Spreadsheet (Ctrl+F)">
            <button
              type="button"
              className={`excel-btn-big ${findBarOpen ? 'active' : ''}`}
              onClick={() => setFindBarOpen(!findBarOpen)}
            >
              <SearchIcon sx={{ fontSize: 22, color: '#3b82f6' }} />
              <span className="excel-btn-big-label">Find</span>
            </button>
          </Tooltip>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Editing</span>
        </div>
      </div>

      {/* ── 8. ADD-INS / EXPORT GROUP ─────────────────────────────────── */}
      <div className="excel-ribbon-group">
        <div className="excel-ribbon-group-content">
          <Tooltip title="Export Sheet to CSV / Excel">
            <button
              type="button"
              className="excel-btn-big"
              onClick={onExportCSV}
            >
              <DownloadIcon sx={{ fontSize: 24, color: '#107c41' }} />
              <span className="excel-btn-big-label">Export</span>
            </button>
          </Tooltip>

          <Tooltip title="Add-ins and Extensions">
            <button
              type="button"
              className="excel-btn-big"
              onClick={() => alert("Excel Extensions & Add-ins enabled for DocsApp Workspace.")}
            >
              <AppsIcon sx={{ fontSize: 24, color: '#6366f1' }} />
              <span className="excel-btn-big-label">Add-ins</span>
            </button>
          </Tooltip>
        </div>
        <div className="excel-ribbon-group-label">
          <span>Add-ins</span>
        </div>
      </div>

      {/* ── Floating Excel Find Bar ───────────────────────────────────── */}
      {findBarOpen && (
        <div className="excel-find-bar absolute top-full left-0 right-0">
          <SearchIcon sx={{ color: '#107c41', fontSize: 18 }} />
          <InputBase
            autoFocus
            placeholder="Find in sheet..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            sx={{ fontSize: '0.8rem', width: 220, bgcolor: 'rgba(0,0,0,0.04)', px: 1, py: 0.2, borderRadius: 1 }}
          />
          <IconButton size="small" onClick={() => setFindBarOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      )}
    </Box>
  );
};

export default SpreadsheetToolbar;
