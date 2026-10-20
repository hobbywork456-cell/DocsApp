import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputBase
} from '@mui/material';

// Icons
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import SubscriptIcon from '@mui/icons-material/Subscript';
import SuperscriptIcon from '@mui/icons-material/Superscript';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import BorderAllIcon from '@mui/icons-material/BorderAll';
import SearchIcon from '@mui/icons-material/Search';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import FunctionsIcon from '@mui/icons-material/Functions';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

import './WordRibbonToolbar.css';

// Font Families available in Word / Docs
export const FONT_FAMILIES = [
  'Calibri',
  'Arial',
  'Times New Roman',
  'Roboto',
  'Georgia',
  'Courier New',
  'Verdana',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Segoe UI'
];

// Font Sizes Ladder
export const FONT_SIZES = [
  '8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt'
];

// Highlight Colors
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Bright Green', color: '#bbf7d0' },
  { name: 'Cyan', color: '#a5f3fc' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Red', color: '#fecaca' },
  { name: 'Dark Blue', color: '#60a5fa' },
  { name: 'Teal', color: '#99f6e4' },
  { name: 'Violet', color: '#ddd6fe' },
  { name: 'Dark Red', color: '#f87171' },
  { name: 'Dark Yellow', color: '#fde047' },
  { name: 'Gray', color: '#cbd5e1' },
  { name: 'No Color', color: 'transparent' }
];

// Standard Font Color Palette
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

// Microsoft Word Styles Gallery definitions
const STYLES_GALLERY = [
  { id: 'normal', name: 'Normal', preview: 'Normal', desc: 'Standard paragraph font', formats: { font: 'Calibri', size: '11pt', bold: false, italic: false, header: false, color: '#334155', lineHeight: '1.25' } },
  { id: 'no-spacing', name: 'No Spacing', preview: 'No Spacing', desc: 'Compact single space', formats: { font: 'Calibri', size: '11pt', bold: false, italic: false, header: false, color: '#334155', lineHeight: '1.0' } },
  { id: 'heading1', name: 'Heading 1', preview: 'Heading 1', desc: 'Large title', formats: { font: 'Calibri', size: '20pt', bold: true, header: 1, color: '#2b579a' } },
  { id: 'heading2', name: 'Heading 2', preview: 'Heading 2', desc: 'Section title', formats: { font: 'Calibri', size: '16pt', bold: true, header: 2, color: '#2b579a' } },
  { id: 'heading3', name: 'Heading 3', preview: 'Heading 3', desc: 'Subsection title', formats: { font: 'Calibri', size: '13pt', bold: true, header: 3, color: '#1e3a8a' } },
  { id: 'title', name: 'Title', preview: 'Title', desc: 'Document title', formats: { font: 'Calibri', size: '26pt', bold: false, header: false, color: '#0f172a' } },
  { id: 'subtitle', name: 'Subtitle', preview: 'Subtitle', desc: 'Document subtitle', formats: { font: 'Calibri', size: '13pt', italic: true, bold: false, header: false, color: '#64748b' } },
  { id: 'quote', name: 'Quote', preview: 'Quote', desc: 'Indented quotation block', formats: { italic: true, color: '#475569', blockquote: true } },
  { id: 'intense-quote', name: 'Intense Quote', preview: 'Intense Quote', desc: 'Highlighted emphasis', formats: { italic: true, bold: true, color: '#2b579a' } }
];

// Special Characters / Symbols
const SPECIAL_SYMBOLS = [
  '©', '®', '™', '§', '¶', '•', '–', '—', '…', '‘', '’', '“', '”', '†', '‡',
  '±', '≠', '≤', '≥', '÷', '×', '∞', '√', 'π', '∑', 'µ', '°', '∆', '≈', '‰',
  '$', '€', '£', '¥', '₹', '¢', '₩', '←', '→', '↑', '↓', '↔', '⇒', '✓', '★'
];

const WordRibbonToolbar = ({
  quillRef,
  isListening,
  toggleListen,
  content,
  onInsertImage,
  onInsertTable,
  showParagraphMarks,
  setShowParagraphMarks
}) => {
  // Format state tracking
  const [activeFormats, setActiveFormats] = useState({});
  const [currentFont, setCurrentFont] = useState('Calibri');
  const [currentSize, setCurrentSize] = useState('11pt');
  const [currentFontColor, setCurrentFontColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('#fef08a');
  const [activeStyle, setActiveStyle] = useState('normal');

  // Format Painter
  const [formatPainter, setFormatPainter] = useState(null);
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [formatPainterPersistent, setFormatPainterPersistent] = useState(false);

  // Popover Anchors
  const [fontMenuAnchor, setFontMenuAnchor] = useState(null);
  const [sizeMenuAnchor, setSizeMenuAnchor] = useState(null);
  const [caseMenuAnchor, setCaseMenuAnchor] = useState(null);
  const [underlineMenuAnchor, setUnderlineMenuAnchor] = useState(null);
  const [highlightMenuAnchor, setHighlightMenuAnchor] = useState(null);
  const [fontColorMenuAnchor, setFontColorMenuAnchor] = useState(null);
  const [bulletMenuAnchor, setBulletMenuAnchor] = useState(null);
  const [numberMenuAnchor, setNumberMenuAnchor] = useState(null);
  const [spacingMenuAnchor, setSpacingMenuAnchor] = useState(null);
  const [shadingMenuAnchor, setShadingMenuAnchor] = useState(null);
  const [borderMenuAnchor, setBorderMenuAnchor] = useState(null);
  const [symbolMenuAnchor, setSymbolMenuAnchor] = useState(null);
  const [tableGridAnchor, setTableGridAnchor] = useState(null);
  const [styleMenuAnchor, setStyleMenuAnchor] = useState(null);

  // Table Grid Picker Hover
  const [gridHover, setGridHover] = useState({ rows: 3, cols: 3 });

  // Find & Replace State
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRangesRef = useRef([]);

  // Document Statistics Dialog
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0, charactersNoSpaces: 0, paragraphs: 0, lines: 0, readingTime: '0 min' });

  // Hyperlink Dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // --------------------------------------------------------------------------
  // Update Active Formats from Quill Editor
  // --------------------------------------------------------------------------
  const updateActiveFormats = useCallback(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range) return;

    const formats = quill.getFormat(range) || {};
    setActiveFormats(formats);

    if (formats.font) setCurrentFont(formats.font);
    else setCurrentFont('Calibri');

    if (formats.size) setCurrentSize(formats.size);
    else setCurrentSize('11pt');

    if (formats.color) setCurrentFontColor(formats.color);
    if (formats.background) setCurrentHighlightColor(formats.background);
  }, [quillRef]);

  useEffect(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();

    const handleSelectionChange = (range) => {
      if (!range) return;
      updateActiveFormats();

      // Handle Format Painter application if active
      if (formatPainterActive && formatPainter) {
        if (range.length > 0) {
          Object.keys(formatPainter).forEach((fmt) => {
            quill.formatText(range.index, range.length, fmt, formatPainter[fmt], 'user');
          });
          if (!formatPainterPersistent) {
            setFormatPainter(null);
            setFormatPainterActive(false);
            document.body.classList.remove('format-painter-active');
          }
        }
      }
    };

    quill.on('selection-change', handleSelectionChange);
    quill.on('text-change', updateActiveFormats);

    return () => {
      quill.off('selection-change', handleSelectionChange);
      quill.off('text-change', updateActiveFormats);
    };
  }, [quillRef, updateActiveFormats, formatPainterActive, formatPainter, formatPainterPersistent]);

  // --------------------------------------------------------------------------
  // Clipboard Operations
  // --------------------------------------------------------------------------
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && quillRef.current) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true) || { index: quill.getLength() };
        quill.insertText(range.index, text, 'user');
        quill.setSelection(range.index + text.length, 0, 'user');
      }
    } catch {
      alert("Please press Ctrl + V to paste clipboard content.");
    }
  };

  const handleCut = async () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range || range.length === 0) return;
    const text = quill.getText(range.index, range.length);
    try {
      await navigator.clipboard.writeText(text);
      quill.deleteText(range.index, range.length, 'user');
    } catch {
      // fallback
      document.execCommand('cut');
    }
  };

  const handleCopy = async () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range || range.length === 0) return;
    const text = quill.getText(range.index, range.length);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      document.execCommand('copy');
    }
  };

  const handleFormatPainter = (isDoubleClick = false) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();

    if (formatPainterActive && !isDoubleClick) {
      setFormatPainter(null);
      setFormatPainterActive(false);
      setFormatPainterPersistent(false);
      document.body.classList.remove('format-painter-active');
      return;
    }

    const formats = quill.getFormat(range || undefined);
    setFormatPainter(formats);
    setFormatPainterActive(true);
    setFormatPainterPersistent(isDoubleClick);
    document.body.classList.add('format-painter-active');
  };

  // --------------------------------------------------------------------------
  // Font Operations
  // --------------------------------------------------------------------------
  const applyFont = (fontName) => {
    setFontMenuAnchor(null);
    setCurrentFont(fontName);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('font', fontName, 'user');
  };

  const applySize = (sizeValue) => {
    setSizeMenuAnchor(null);
    setCurrentSize(sizeValue);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('size', sizeValue, 'user');
  };

  const handleGrowFont = () => {
    const idx = FONT_SIZES.indexOf(currentSize);
    const nextIdx = Math.min(idx === -1 ? 4 : idx + 1, FONT_SIZES.length - 1);
    applySize(FONT_SIZES[nextIdx]);
  };

  const handleShrinkFont = () => {
    const idx = FONT_SIZES.indexOf(currentSize);
    const prevIdx = Math.max(idx === -1 ? 4 : idx - 1, 0);
    applySize(FONT_SIZES[prevIdx]);
  };

  const handleChangeCase = (caseType) => {
    setCaseMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const text = quill.getText(range.index, range.length);
    let newText = text;

    if (caseType === 'sentence') {
      newText = text.replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (c) => c.toUpperCase());
    } else if (caseType === 'lower') {
      newText = text.toLowerCase();
    } else if (caseType === 'upper') {
      newText = text.toUpperCase();
    } else if (caseType === 'title') {
      newText = text.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (caseType === 'toggle') {
      newText = text.split('').map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
    }

    const currentFmt = quill.getFormat(range);
    quill.deleteText(range.index, range.length, 'user');
    quill.insertText(range.index, newText, currentFmt, 'user');
    quill.setSelection(range.index, newText.length, 'user');
  };

  const handleClearFormatting = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range) {
      quill.removeFormat(range.index, range.length, 'user');
    }
  };

  const toggleBold = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('bold', !activeFormats.bold, 'user');
  };

  const toggleItalic = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('italic', !activeFormats.italic, 'user');
  };

  const toggleUnderline = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('underline', !activeFormats.underline, 'user');
  };

  const applyUnderlineStyle = (style) => {
    setUnderlineMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('underline', true, 'user');
    quill.format('underlineStyle', style, 'user');
  };

  const toggleStrike = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('strike', !activeFormats.strike, 'user');
  };

  const toggleSubscript = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('script', activeFormats.script === 'sub' ? false : 'sub', 'user');
  };

  const toggleSuperscript = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('script', activeFormats.script === 'super' ? false : 'super', 'user');
  };

  const applyHighlight = (color) => {
    setHighlightMenuAnchor(null);
    setCurrentHighlightColor(color);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('background', color === 'transparent' ? false : color, 'user');
  };

  const applyFontColor = (color) => {
    setFontColorMenuAnchor(null);
    setCurrentFontColor(color);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('color', color, 'user');
  };

  // --------------------------------------------------------------------------
  // Paragraph Operations
  // --------------------------------------------------------------------------
  const toggleBulletList = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('list', activeFormats.list === 'bullet' ? false : 'bullet', 'user');
  };

  const toggleNumberedList = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('list', activeFormats.list === 'ordered' ? false : 'ordered', 'user');
  };

  const toggleChecklist = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('list', activeFormats.list === 'check' ? false : 'check', 'user');
  };

  const handleIndent = (dir) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('indent', dir === 'more' ? '+1' : '-1', 'user');
  };

  const handleSortLines = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const text = quill.getText(range.index, range.length);
    const lines = text.split('\n');
    lines.sort((a, b) => a.localeCompare(b));
    const sortedText = lines.join('\n');

    quill.deleteText(range.index, range.length, 'user');
    quill.insertText(range.index, sortedText, 'user');
    quill.setSelection(range.index, sortedText.length, 'user');
  };

  const handleAlign = (alignment) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('align', alignment === 'left' ? false : alignment, 'user');
  };

  const applyLineSpacing = (spacing) => {
    setSpacingMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('lineHeight', spacing, 'user');
  };

  const applyShading = (color) => {
    setShadingMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format('blockBackground', color === 'transparent' ? false : color, 'user');
  };

  const applyBorder = (borderType) => {
    setBorderMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    if (borderType === 'horizontal-line') {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'divider', true, 'user');
      quill.insertText(range.index + 1, '\n', 'user');
      quill.setSelection(range.index + 2, 0, 'user');
    } else if (borderType === 'bottom') {
      quill.format('blockBorder', 'none none 1px solid #94a3b8', 'user');
    } else if (borderType === 'all') {
      quill.format('blockBorder', '1px solid #94a3b8', 'user');
    } else if (borderType === 'none') {
      quill.format('blockBorder', false, 'user');
    }
  };

  // --------------------------------------------------------------------------
  // Styles Gallery Operations
  // --------------------------------------------------------------------------
  const applyStyle = (styleObj) => {
    setActiveStyle(styleObj.id);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();

    Object.keys(styleObj.formats).forEach((key) => {
      quill.format(key, styleObj.formats[key], 'user');
    });
  };

  // --------------------------------------------------------------------------
  // Find & Replace Engine
  // --------------------------------------------------------------------------
  const handleFind = () => {
    if (!quillRef.current || !findQuery) {
      setMatchCount(0);
      return;
    }
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    const ranges = [];
    const searchString = matchCase ? findQuery : findQuery.toLowerCase();
    const sourceString = matchCase ? text : text.toLowerCase();

    let startIndex = 0;
    while ((startIndex = sourceString.indexOf(searchString, startIndex)) !== -1) {
      ranges.push({ index: startIndex, length: findQuery.length });
      startIndex += findQuery.length;
    }

    matchRangesRef.current = ranges;
    setMatchCount(ranges.length);
    if (ranges.length > 0) {
      setCurrentMatchIndex(0);
      quill.setSelection(ranges[0].index, ranges[0].length);
    }
  };

  const handleNextMatch = () => {
    if (matchRangesRef.current.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchRangesRef.current.length;
    setCurrentMatchIndex(nextIdx);
    const range = matchRangesRef.current[nextIdx];
    if (quillRef.current) {
      quillRef.current.getEditor().setSelection(range.index, range.length);
    }
  };

  const handlePrevMatch = () => {
    if (matchRangesRef.current.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchRangesRef.current.length) % matchRangesRef.current.length;
    setCurrentMatchIndex(prevIdx);
    const range = matchRangesRef.current[prevIdx];
    if (quillRef.current) {
      quillRef.current.getEditor().setSelection(range.index, range.length);
    }
  };

  const handleReplace = () => {
    if (matchRangesRef.current.length === 0 || !quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const activeRange = matchRangesRef.current[currentMatchIndex];
    if (!activeRange) return;

    quill.deleteText(activeRange.index, activeRange.length, 'user');
    quill.insertText(activeRange.index, replaceQuery, 'user');
    handleFind();
  };

  const handleReplaceAll = () => {
    if (!quillRef.current || !findQuery) return;
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    const newText = text.replace(regex, replaceQuery);
    quill.setText(newText, 'user');
    setMatchCount(0);
  };

  // --------------------------------------------------------------------------
  // Document Statistics Calculator
  // --------------------------------------------------------------------------
  const calculateStats = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const text = quill.getText() || '';
    const cleanText = text.trim();
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    const characters = cleanText.length;
    const charactersNoSpaces = cleanText.replace(/\s/g, '').length;
    const paragraphs = cleanText ? cleanText.split(/\n+/).filter(Boolean).length : 0;
    const lines = cleanText ? cleanText.split(/\n/).length : 0;
    const readingTime = Math.ceil(words / 200);

    setStats({
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      lines,
      readingTime: `${readingTime} min`
    });
    setStatsDialogOpen(true);
  };

  // --------------------------------------------------------------------------
  // Insert Functions
  // --------------------------------------------------------------------------
  const handleInsertSymbol = (symbol) => {
    setSymbolMenuAnchor(null);
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection(true) || { index: quill.getLength() };
    quill.insertText(range.index, symbol, 'user');
    quill.setSelection(range.index + symbol.length, 0, 'user');
  };

  const handleInsertLinkSubmit = () => {
    setLinkDialogOpen(false);
    if (!quillRef.current || !linkUrl) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection(true) || { index: quill.getLength() };
    const textToInsert = linkText || linkUrl;

    quill.insertText(range.index, textToInsert, { link: linkUrl }, 'user');
    quill.setSelection(range.index + textToInsert.length, 0, 'user');
    setLinkText('');
    setLinkUrl('');
  };

  const handleCreateGridTable = (rows, cols) => {
    setTableGridAnchor(null);
    if (onInsertTable) {
      onInsertTable(rows, cols);
    } else if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const tableModule = quill.getModule('table');
      if (tableModule) {
        tableModule.insertTable(rows, cols);
      }
    }
  };

  const currentStyleObj = STYLES_GALLERY.find((s) => s.id === activeStyle) || STYLES_GALLERY[0];

  return (
    <Box className="word-ribbon-container">
      {/* ── Main Compact Ribbon Body (38px height) ─────────────────────────── */}
      <Box className="word-ribbon-body">
        {/* Undo / Redo */}
        <Tooltip title="Undo (Ctrl+Z)">
          <button type="button" className="ribbon-btn" onClick={() => quillRef.current?.getEditor().history.undo()}>
            <UndoIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <button type="button" className="ribbon-btn" onClick={() => quillRef.current?.getEditor().history.redo()}>
            <RedoIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <div className="ribbon-divider" />

        {/* Clipboard: Paste, Cut, Copy, Format Painter */}
        <Tooltip title="Paste (Ctrl+V)">
          <button type="button" className="ribbon-btn" onClick={handlePaste}>
            <ContentPasteIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
          </button>
        </Tooltip>
        <Tooltip title="Cut (Ctrl+X)">
          <button type="button" className="ribbon-btn" onClick={handleCut}>
            <ContentCutIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
        <Tooltip title="Copy (Ctrl+C)">
          <button type="button" className="ribbon-btn" onClick={handleCopy}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
        <Tooltip title="Format Painter (Click once to copy format, double-click for multiple selections)">
          <button
            type="button"
            className={`ribbon-btn ${formatPainterActive ? 'active' : ''}`}
            onClick={() => handleFormatPainter(false)}
            onDoubleClick={() => handleFormatPainter(true)}
          >
            <FormatPaintIcon sx={{ fontSize: 16, color: formatPainterActive ? '#2563eb' : '#d97706' }} />
          </button>
        </Tooltip>

        <div className="ribbon-divider" />

        {/* Font Family & Size */}
        <Tooltip title="Font Family">
          <button
            type="button"
            className="ribbon-dropdown-btn w-[100px]"
            onClick={(e) => setFontMenuAnchor(e.currentTarget)}
          >
            <span className="truncate">{currentFont}</span>
            <ArrowDropDownIcon sx={{ fontSize: 15 }} />
          </button>
        </Tooltip>
        <Menu
          anchorEl={fontMenuAnchor}
          open={Boolean(fontMenuAnchor)}
          onClose={() => setFontMenuAnchor(null)}
          slotProps={{ paper: { sx: { maxHeight: 300, minWidth: 150 } } }}
        >
          {FONT_FAMILIES.map((f) => (
            <MenuItem key={f} onClick={() => applyFont(f)} selected={currentFont === f} sx={{ fontFamily: f }}>
              {f}
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Font Size">
          <button
            type="button"
            className="ribbon-dropdown-btn w-[46px]"
            onClick={(e) => setSizeMenuAnchor(e.currentTarget)}
          >
            <span>{currentSize.replace('pt', '')}</span>
            <ArrowDropDownIcon sx={{ fontSize: 15 }} />
          </button>
        </Tooltip>
        <Menu
          anchorEl={sizeMenuAnchor}
          open={Boolean(sizeMenuAnchor)}
          onClose={() => setSizeMenuAnchor(null)}
          slotProps={{ paper: { sx: { maxHeight: 260, minWidth: 70 } } }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s} onClick={() => applySize(s)} selected={currentSize === s}>
              {s.replace('pt', '')}
            </MenuItem>
          ))}
        </Menu>

        {/* Grow Font */}
        <Tooltip title="Increase Font Size (Grow)">
          <button type="button" className="ribbon-btn" onClick={handleGrowFont}>
            <span className="font-bold text-xs flex items-center">A<sup className="text-[8px] text-blue-500">▲</sup></span>
          </button>
        </Tooltip>

        {/* Shrink Font */}
        <Tooltip title="Decrease Font Size (Shrink)">
          <button type="button" className="ribbon-btn" onClick={handleShrinkFont}>
            <span className="font-bold text-xs flex items-center">A<sub className="text-[8px] text-blue-500">▼</sub></span>
          </button>
        </Tooltip>

        {/* Change Case */}
        <Tooltip title="Change Case (Aa)">
          <button type="button" className="ribbon-btn" onClick={(e) => setCaseMenuAnchor(e.currentTarget)}>
            <span className="font-semibold text-xs">Aa</span>
            <ArrowDropDownIcon sx={{ fontSize: 13, ml: -0.3 }} />
          </button>
        </Tooltip>
        <Menu anchorEl={caseMenuAnchor} open={Boolean(caseMenuAnchor)} onClose={() => setCaseMenuAnchor(null)}>
          <MenuItem onClick={() => handleChangeCase('sentence')}>Sentence case.</MenuItem>
          <MenuItem onClick={() => handleChangeCase('lower')}>lowercase</MenuItem>
          <MenuItem onClick={() => handleChangeCase('upper')}>UPPERCASE</MenuItem>
          <MenuItem onClick={() => handleChangeCase('title')}>Capitalize Each Word</MenuItem>
          <MenuItem onClick={() => handleChangeCase('toggle')}>tOGGLE cASE</MenuItem>
        </Menu>

        {/* Clear Formatting */}
        <Tooltip title="Clear All Formatting">
          <button type="button" className="ribbon-btn" onClick={handleClearFormatting}>
            <FormatClearIcon sx={{ fontSize: 15, color: '#ec4899' }} />
          </button>
        </Tooltip>

        <div className="ribbon-divider" />

        {/* Text Formats: Bold, Italic, Underline, Strike, Sub, Super, Highlight, Color */}
        <Tooltip title="Bold (Ctrl+B)">
          <button type="button" className={`ribbon-btn ${activeFormats.bold ? 'active' : ''}`} onClick={toggleBold}>
            <FormatBoldIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Italic (Ctrl+I)">
          <button type="button" className={`ribbon-btn ${activeFormats.italic ? 'active' : ''}`} onClick={toggleItalic}>
            <FormatItalicIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        {/* Underline Split */}
        <div className="ribbon-split-btn">
          <Tooltip title="Underline (Ctrl+U)">
            <button type="button" className={`ribbon-split-btn-main ${activeFormats.underline ? 'active' : ''}`} onClick={toggleUnderline}>
              <FormatUnderlinedIcon sx={{ fontSize: 16 }} />
            </button>
          </Tooltip>
          <button type="button" className="ribbon-split-btn-arrow" onClick={(e) => setUnderlineMenuAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 13 }} />
          </button>
        </div>
        <Menu anchorEl={underlineMenuAnchor} open={Boolean(underlineMenuAnchor)} onClose={() => setUnderlineMenuAnchor(null)}>
          <MenuItem onClick={() => applyUnderlineStyle('solid')}>Solid Underline</MenuItem>
          <MenuItem onClick={() => applyUnderlineStyle('double')}>Double Underline</MenuItem>
          <MenuItem onClick={() => applyUnderlineStyle('dotted')}>Dotted Underline</MenuItem>
          <MenuItem onClick={() => applyUnderlineStyle('dashed')}>Dashed Underline</MenuItem>
          <MenuItem onClick={() => applyUnderlineStyle('wavy')}>Wavy Underline</MenuItem>
        </Menu>

        <Tooltip title="Strikethrough">
          <button type="button" className={`ribbon-btn ${activeFormats.strike ? 'active' : ''}`} onClick={toggleStrike}>
            <StrikethroughSIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Subscript">
          <button type="button" className={`ribbon-btn ${activeFormats.script === 'sub' ? 'active' : ''}`} onClick={toggleSubscript}>
            <SubscriptIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Superscript">
          <button type="button" className={`ribbon-btn ${activeFormats.script === 'super' ? 'active' : ''}`} onClick={toggleSuperscript}>
            <SuperscriptIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        {/* Highlight Color */}
        <div className="ribbon-split-btn">
          <Tooltip title="Text Highlight Color">
            <button type="button" className="ribbon-split-btn-main flex-col py-0.5" onClick={() => applyHighlight(currentHighlightColor)}>
              <BorderColorIcon sx={{ fontSize: 14 }} />
              <span className="color-bar-indicator" style={{ backgroundColor: currentHighlightColor }} />
            </button>
          </Tooltip>
          <button type="button" className="ribbon-split-btn-arrow" onClick={(e) => setHighlightMenuAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 13 }} />
          </button>
        </div>
        <Popover
          anchorEl={highlightMenuAnchor}
          open={Boolean(highlightMenuAnchor)}
          onClose={() => setHighlightMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box className="p-2.5 grid grid-cols-5 gap-1.5 w-[160px]">
            {HIGHLIGHT_COLORS.map((h) => (
              <Tooltip key={h.name} title={h.name}>
                <button
                  type="button"
                  onClick={() => applyHighlight(h.color)}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: h.color === 'transparent' ? '#ffffff' : h.color }}
                >
                  {h.color === 'transparent' && <span className="text-red-500 font-bold text-xs">✕</span>}
                </button>
              </Tooltip>
            ))}
          </Box>
        </Popover>

        {/* Font Color */}
        <div className="ribbon-split-btn">
          <Tooltip title="Font Color">
            <button type="button" className="ribbon-split-btn-main flex-col py-0.5" onClick={() => applyFontColor(currentFontColor)}>
              <FormatColorTextIcon sx={{ fontSize: 14 }} />
              <span className="color-bar-indicator" style={{ backgroundColor: currentFontColor }} />
            </button>
          </Tooltip>
          <button type="button" className="ribbon-split-btn-arrow" onClick={(e) => setFontColorMenuAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 13 }} />
          </button>
        </div>
        <Popover
          anchorEl={fontColorMenuAnchor}
          open={Boolean(fontColorMenuAnchor)}
          onClose={() => setFontColorMenuAnchor(null)}
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
                      onClick={() => applyFontColor(c)}
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
              onClick={() => applyFontColor('#000000')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Automatic (Black)
            </Button>
          </Box>
        </Popover>

        <div className="ribbon-divider" />

        {/* Alignment */}
        <Tooltip title="Align Left (Ctrl+L)">
          <button type="button" className={`ribbon-btn ${!activeFormats.align ? 'active' : ''}`} onClick={() => handleAlign('left')}>
            <FormatAlignLeftIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Align Center (Ctrl+E)">
          <button type="button" className={`ribbon-btn ${activeFormats.align === 'center' ? 'active' : ''}`} onClick={() => handleAlign('center')}>
            <FormatAlignCenterIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Align Right (Ctrl+R)">
          <button type="button" className={`ribbon-btn ${activeFormats.align === 'right' ? 'active' : ''}`} onClick={() => handleAlign('right')}>
            <FormatAlignRightIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Justify (Ctrl+J)">
          <button type="button" className={`ribbon-btn ${activeFormats.align === 'justify' ? 'active' : ''}`} onClick={() => handleAlign('justify')}>
            <FormatAlignJustifyIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        {/* Line Spacing */}
        <Tooltip title="Line and Paragraph Spacing">
          <button type="button" className="ribbon-btn" onClick={(e) => setSpacingMenuAnchor(e.currentTarget)}>
            <FormatLineSpacingIcon sx={{ fontSize: 16 }} />
            <ArrowDropDownIcon sx={{ fontSize: 13, ml: -0.3 }} />
          </button>
        </Tooltip>
        <Menu anchorEl={spacingMenuAnchor} open={Boolean(spacingMenuAnchor)} onClose={() => setSpacingMenuAnchor(null)}>
          <MenuItem onClick={() => applyLineSpacing('1.0')}>1.0 (Single)</MenuItem>
          <MenuItem onClick={() => applyLineSpacing('1.15')}>1.15 (Default)</MenuItem>
          <MenuItem onClick={() => applyLineSpacing('1.5')}>1.5 (One and half)</MenuItem>
          <MenuItem onClick={() => applyLineSpacing('2.0')}>2.0 (Double)</MenuItem>
          <MenuItem onClick={() => applyLineSpacing('2.5')}>2.5</MenuItem>
          <MenuItem onClick={() => applyLineSpacing('3.0')}>3.0</MenuItem>
        </Menu>

        {/* Bullets */}
        <div className="ribbon-split-btn">
          <Tooltip title="Bullets">
            <button type="button" className={`ribbon-split-btn-main ${activeFormats.list === 'bullet' ? 'active' : ''}`} onClick={toggleBulletList}>
              <FormatListBulletedIcon sx={{ fontSize: 16 }} />
            </button>
          </Tooltip>
          <button type="button" className="ribbon-split-btn-arrow" onClick={(e) => setBulletMenuAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 13 }} />
          </button>
        </div>
        <Menu anchorEl={bulletMenuAnchor} open={Boolean(bulletMenuAnchor)} onClose={() => setBulletMenuAnchor(null)}>
          <MenuItem onClick={() => { toggleBulletList(); setBulletMenuAnchor(null); }}>● Disc Bullet</MenuItem>
          <MenuItem onClick={() => { toggleBulletList(); setBulletMenuAnchor(null); }}>○ Circle Bullet</MenuItem>
          <MenuItem onClick={() => { toggleBulletList(); setBulletMenuAnchor(null); }}>■ Square Bullet</MenuItem>
        </Menu>

        {/* Numbering */}
        <div className="ribbon-split-btn">
          <Tooltip title="Numbering">
            <button type="button" className={`ribbon-split-btn-main ${activeFormats.list === 'ordered' ? 'active' : ''}`} onClick={toggleNumberedList}>
              <FormatListNumberedIcon sx={{ fontSize: 16 }} />
            </button>
          </Tooltip>
          <button type="button" className="ribbon-split-btn-arrow" onClick={(e) => setNumberMenuAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 13 }} />
          </button>
        </div>
        <Menu anchorEl={numberMenuAnchor} open={Boolean(numberMenuAnchor)} onClose={() => setNumberMenuAnchor(null)}>
          <MenuItem onClick={() => { toggleNumberedList(); setNumberMenuAnchor(null); }}>1. 2. 3. Numbers</MenuItem>
          <MenuItem onClick={() => { toggleNumberedList(); setNumberMenuAnchor(null); }}>a. b. c. Letters</MenuItem>
          <MenuItem onClick={() => { toggleNumberedList(); setNumberMenuAnchor(null); }}>i. ii. iii. Roman</MenuItem>
        </Menu>

        {/* Checklist */}
        <Tooltip title="Checklist">
          <button type="button" className={`ribbon-btn ${activeFormats.list === 'check' ? 'active' : ''}`} onClick={toggleChecklist}>
            <ChecklistIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Decrease Indent">
          <button type="button" className="ribbon-btn" onClick={() => handleIndent('less')}>
            <FormatIndentDecreaseIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Increase Indent">
          <button type="button" className="ribbon-btn" onClick={() => handleIndent('more')}>
            <FormatIndentIncreaseIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        <Tooltip title="Sort Lines Alphabetically (A-Z)">
          <button type="button" className="ribbon-btn" onClick={handleSortLines}>
            <SortByAlphaIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>

        {/* Shading */}
        <Tooltip title="Paragraph Shading">
          <button type="button" className="ribbon-btn" onClick={(e) => setShadingMenuAnchor(e.currentTarget)}>
            <FormatColorFillIcon sx={{ fontSize: 16 }} />
            <ArrowDropDownIcon sx={{ fontSize: 13, ml: -0.3 }} />
          </button>
        </Tooltip>
        <Popover anchorEl={shadingMenuAnchor} open={Boolean(shadingMenuAnchor)} onClose={() => setShadingMenuAnchor(null)}>
          <Box className="p-2 grid grid-cols-5 gap-1.5 w-[160px]">
            {HIGHLIGHT_COLORS.map((h) => (
              <button
                key={h.name}
                type="button"
                onClick={() => applyShading(h.color)}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: h.color === 'transparent' ? '#ffffff' : h.color }}
              />
            ))}
          </Box>
        </Popover>

        {/* Borders */}
        <Tooltip title="Borders & Dividers">
          <button type="button" className="ribbon-btn" onClick={(e) => setBorderMenuAnchor(e.currentTarget)}>
            <BorderAllIcon sx={{ fontSize: 16 }} />
            <ArrowDropDownIcon sx={{ fontSize: 13, ml: -0.3 }} />
          </button>
        </Tooltip>
        <Menu anchorEl={borderMenuAnchor} open={Boolean(borderMenuAnchor)} onClose={() => setBorderMenuAnchor(null)}>
          <MenuItem onClick={() => applyBorder('bottom')}>Bottom Border</MenuItem>
          <MenuItem onClick={() => applyBorder('all')}>All Borders</MenuItem>
          <MenuItem onClick={() => applyBorder('none')}>No Border</MenuItem>
          <Divider />
          <MenuItem onClick={() => applyBorder('horizontal-line')}>
            <HorizontalRuleIcon sx={{ fontSize: 16, mr: 1 }} /> Horizontal Divider Line
          </MenuItem>
        </Menu>

        {/* Show/Hide Paragraph Marks */}
        <Tooltip title="Show/Hide Paragraph Marks (¶)">
          <button
            type="button"
            className={`ribbon-btn ${showParagraphMarks ? 'active' : ''}`}
            onClick={() => setShowParagraphMarks(!showParagraphMarks)}
          >
            <span className="font-bold text-xs">¶</span>
          </button>
        </Tooltip>

        <div className="ribbon-divider" />

        {/* Styles Dropdown */}
        <Tooltip title="Styles">
          <button
            type="button"
            className="ribbon-dropdown-btn w-[92px]"
            onClick={(e) => setStyleMenuAnchor(e.currentTarget)}
          >
            <span className="truncate">{currentStyleObj.name}</span>
            <ArrowDropDownIcon sx={{ fontSize: 15 }} />
          </button>
        </Tooltip>
        <Menu
          anchorEl={styleMenuAnchor}
          open={Boolean(styleMenuAnchor)}
          onClose={() => setStyleMenuAnchor(null)}
          slotProps={{ paper: { sx: { maxHeight: 340, minWidth: 160 } } }}
        >
          {STYLES_GALLERY.map((style) => (
            <MenuItem
              key={style.id}
              onClick={() => {
                applyStyle(style);
                setStyleMenuAnchor(null);
              }}
              selected={activeStyle === style.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                py: 0.8
              }}
            >
              <span
                style={{
                  fontFamily: style.formats.font || 'inherit',
                  fontWeight: style.formats.bold ? 700 : 400,
                  fontStyle: style.formats.italic ? 'italic' : 'normal',
                  color: style.formats.color || 'inherit',
                  fontSize: style.id === 'heading1' ? '1.05rem' : style.id === 'heading2' ? '0.92rem' : '0.82rem'
                }}
              >
                {style.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{style.desc}</span>
            </MenuItem>
          ))}
        </Menu>

        <div className="ribbon-divider" />

        {/* Insert Elements: Table, Picture, Link, Symbol */}
        <Tooltip title="Insert Table">
          <button
            type="button"
            className="ribbon-btn"
            onClick={(e) => setTableGridAnchor(e.currentTarget)}
          >
            <TableChartIcon sx={{ fontSize: 16, color: '#059669' }} />
          </button>
        </Tooltip>
        <Popover
          anchorEl={tableGridAnchor}
          open={Boolean(tableGridAnchor)}
          onClose={() => setTableGridAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box className="p-3">
            <Typography variant="caption" className="font-bold text-gray-600 block mb-2">
              Insert Table ({gridHover.rows} × {gridHover.cols})
            </Typography>
            <Box className="grid grid-cols-6 gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              {[1, 2, 3, 4, 5, 6].map((r) =>
                [1, 2, 3, 4, 5, 6].map((c) => (
                  <div
                    key={`${r}-${c}`}
                    onMouseEnter={() => setGridHover({ rows: r, cols: c })}
                    onClick={() => handleCreateGridTable(r, c)}
                    className={`w-4 h-4 border cursor-pointer transition-colors ${
                      r <= gridHover.rows && c <= gridHover.cols
                        ? 'bg-blue-500 border-blue-600'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                ))
              )}
            </Box>
          </Box>
        </Popover>

        <Tooltip title="Insert Image / Picture">
          <button type="button" className="ribbon-btn" onClick={onInsertImage}>
            <AddPhotoAlternateIcon sx={{ fontSize: 16, color: '#2563eb' }} />
          </button>
        </Tooltip>

        <Tooltip title="Insert Hyperlink (Ctrl+K)">
          <button type="button" className="ribbon-btn" onClick={() => setLinkDialogOpen(true)}>
            <InsertLinkIcon sx={{ fontSize: 16, color: '#d97706' }} />
          </button>
        </Tooltip>

        <Tooltip title="Symbols & Special Characters">
          <button type="button" className="ribbon-btn" onClick={(e) => setSymbolMenuAnchor(e.currentTarget)}>
            <FunctionsIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
          </button>
        </Tooltip>
        <Popover
          anchorEl={symbolMenuAnchor}
          open={Boolean(symbolMenuAnchor)}
          onClose={() => setSymbolMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box className="p-3 w-[220px]">
            <Typography variant="caption" className="font-bold text-gray-600 block mb-2">
              Insert Symbol
            </Typography>
            <Box className="grid grid-cols-6 gap-1">
              {SPECIAL_SYMBOLS.map((sym, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertSymbol(sym)}
                  className="w-7 h-7 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-400 font-serif text-sm flex items-center justify-center transition-all"
                >
                  {sym}
                </button>
              ))}
            </Box>
          </Box>
        </Popover>

        <div className="ribbon-divider" />

        {/* Editing & Proofing & Voice */}
        <Tooltip title="Find in Document (Ctrl+F)">
          <button
            type="button"
            className={`ribbon-btn ${findBarOpen ? 'active' : ''}`}
            onClick={() => setFindBarOpen(!findBarOpen)}
          >
            <SearchIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
          </button>
        </Tooltip>

        <Tooltip title="Find and Replace (Ctrl+H)">
          <button
            type="button"
            className="ribbon-btn"
            onClick={() => setFindBarOpen(true)}
          >
            <FindReplaceIcon sx={{ fontSize: 16, color: '#10b981' }} />
          </button>
        </Tooltip>

        <Tooltip title="Select All (Ctrl+A)">
          <button
            type="button"
            className="ribbon-btn"
            onClick={() => quillRef.current?.getEditor().setSelection(0, quillRef.current.getEditor().getLength())}
          >
            <SelectAllIcon sx={{ fontSize: 16, color: '#6366f1' }} />
          </button>
        </Tooltip>

        <Tooltip title="Document Statistics & Word Count">
          <button type="button" className="ribbon-btn" onClick={calculateStats}>
            <SpellcheckIcon sx={{ fontSize: 16, color: '#059669' }} />
          </button>
        </Tooltip>

        <Tooltip title={isListening ? 'Stop Speech Dictation' : 'Start Speech Dictation'}>
          <button
            type="button"
            className={`ribbon-btn ${isListening ? 'dictate-pulse bg-red-100 dark:bg-red-900/40 text-red-600' : ''}`}
            onClick={toggleListen}
          >
            {isListening ? (
              <MicOffIcon sx={{ fontSize: 16, color: '#ef4444' }} />
            ) : (
              <MicIcon sx={{ fontSize: 16, color: '#2563eb' }} />
            )}
          </button>
        </Tooltip>
      </Box>

      {/* ── Floating Find & Replace Bar ─────────────────────────────── */}
      {findBarOpen && (
        <Box className="word-find-replace-bar">
          <SearchIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
          <InputBase
            placeholder="Find in document..."
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFind();
            }}
            sx={{ fontSize: '0.82rem', width: 160, bgcolor: 'rgba(0,0,0,0.04)', px: 1, py: 0.2, borderRadius: 1 }}
          />

          <InputBase
            placeholder="Replace with..."
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            sx={{ fontSize: '0.82rem', width: 160, bgcolor: 'rgba(0,0,0,0.04)', px: 1, py: 0.2, borderRadius: 1 }}
          />

          <Button size="small" variant="contained" onClick={handleFind} sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem' }}>
            Find
          </Button>

          <Button size="small" variant="outlined" onClick={handleReplace} sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem' }}>
            Replace
          </Button>

          <Button size="small" variant="outlined" onClick={handleReplaceAll} sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem' }}>
            Replace All
          </Button>

          {matchCount > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#3b82f6' }}>
              {currentMatchIndex + 1} of {matchCount}
            </Typography>
          )}

          <IconButton size="small" onClick={handlePrevMatch} disabled={matchCount === 0}>
            <NavigateBeforeIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleNextMatch} disabled={matchCount === 0}>
            <NavigateNextIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={() => setFindBarOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* ── Document Statistics Dialog ─────────────────────────────── */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <SpellcheckIcon color="primary" /> Document Statistics
        </DialogTitle>
        <DialogContent className="pt-2">
          <Box className="grid grid-cols-2 gap-3 mb-4">
            <Box className="stat-pill">
              <span className="stat-pill-value">{stats.words}</span>
              <span className="stat-pill-label">Words</span>
            </Box>
            <Box className="stat-pill">
              <span className="stat-pill-value">{stats.characters}</span>
              <span className="stat-pill-label">Characters</span>
            </Box>
            <Box className="stat-pill">
              <span className="stat-pill-value">{stats.paragraphs}</span>
              <span className="stat-pill-label">Paragraphs</span>
            </Box>
            <Box className="stat-pill">
              <span className="stat-pill-value">{stats.readingTime}</span>
              <span className="stat-pill-label">Reading Time</span>
            </Box>
          </Box>
          <Box className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Characters (no spaces):</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.charactersNoSpaces}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Lines:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.lines}</span>
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)} variant="contained" size="small" sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Insert Link Dialog ─────────────────────────────── */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-bold text-gray-800">Insert Hyperlink</DialogTitle>
        <DialogContent className="pt-2 space-y-3">
          <TextField
            autoFocus
            fullWidth
            label="Text to display"
            size="small"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
          <TextField
            fullWidth
            label="Address (URL)"
            placeholder="https://example.com"
            size="small"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)} size="small" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleInsertLinkSubmit} variant="contained" size="small" disabled={!linkUrl} sx={{ textTransform: 'none' }}>
            Insert Link
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WordRibbonToolbar;
