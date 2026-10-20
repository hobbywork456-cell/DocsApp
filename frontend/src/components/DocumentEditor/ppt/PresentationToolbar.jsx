import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Tooltip,
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

// Standard MUI Icons
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import TextRotateVerticalIcon from '@mui/icons-material/TextRotateVertical';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CropDinIcon from '@mui/icons-material/CropDin';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LayersIcon from '@mui/icons-material/Layers';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PaletteIcon from '@mui/icons-material/Palette';
import SearchIcon from '@mui/icons-material/Search';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import AppsIcon from '@mui/icons-material/Apps';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NotesIcon from '@mui/icons-material/Notes';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LaunchIcon from '@mui/icons-material/Launch';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

import { SLIDE_THEMES, SLIDE_LAYOUTS } from './presentationConstants';
import './PptRibbonToolbar.css';

// Font Families
const FONT_FAMILIES = [
  'Calibri',
  'Aptos',
  'Arial',
  'Segoe UI',
  'Roboto',
  'Times New Roman',
  'Georgia',
  'Trebuchet MS',
  'Verdana',
  'Impact',
  'Courier New'
];

// Font Sizes
const FONT_SIZES = [
  '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '44', '48', '54', '60', '72'
];

// Color Palette for Font & Shapes
const COLOR_PALETTE = [
  ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
  ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
  ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47']
];

// Highlight Colors
const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#0000ff', '#ff0000',
  '#000080', '#008080', '#008000', '#800080', '#800000', '#808000',
  '#808080', '#c0c0c0', '#000000', 'transparent'
];

// PowerPoint Visual Shapes List
const SHAPES_LIST = [
  { id: 'textbox', name: 'Text Box', icon: <TextFieldsIcon sx={{ fontSize: 13 }} /> },
  { id: 'line', name: 'Line', icon: <HorizontalRuleIcon sx={{ fontSize: 13 }} /> },
  { id: 'arrow', name: 'Arrow', icon: <NorthEastIcon sx={{ fontSize: 13 }} /> },
  { id: 'rect', name: 'Rectangle', icon: <CropSquareIcon sx={{ fontSize: 13 }} /> },
  { id: 'rounded_rect', name: 'Rounded Rectangle', icon: <CropDinIcon sx={{ fontSize: 13 }} /> },
  { id: 'oval', name: 'Oval / Circle', icon: <RadioButtonUncheckedIcon sx={{ fontSize: 13 }} /> },
  { id: 'triangle', name: 'Triangle', icon: <ChangeHistoryIcon sx={{ fontSize: 13 }} /> },
  { id: 'right_arrow', name: 'Right Arrow', icon: <ArrowForwardIcon sx={{ fontSize: 13 }} /> },
  { id: 'down_arrow', name: 'Down Arrow', icon: <ArrowDownwardIcon sx={{ fontSize: 13 }} /> },
  { id: 'star', name: '5-Point Star', icon: <StarBorderIcon sx={{ fontSize: 13 }} /> },
  { id: 'callout', name: 'Callout', icon: <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} /> },
  { id: 'brackets', name: 'Brackets', icon: <span style={{ fontSize: 11, fontWeight: 'bold' }}>{'{ }'}</span> }
];

const PresentationToolbar = ({
  deck,
  activeSlide,
  onThemeChange,
  onLayoutChange,
  onOpenLayoutDialog,
  onAddSlide,
  onUpdateSlide,
  onAddShape,
  onDuplicateSlide,
  onDeleteSlide,
  onResetSlide,
  updateDeck,
  showNotes,
  setShowNotes,
  onStartPresentation,
  readOnly = false
}) => {
  // Menu anchors
  const [pasteMenuAnchor, setPasteMenuAnchor] = useState(null);
  const [newSlideMenuAnchor, setNewSlideMenuAnchor] = useState(null);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState(null);
  const [sectionMenuAnchor, setSectionMenuAnchor] = useState(null);
  const [charSpacingAnchor, setCharSpacingAnchor] = useState(null);
  const [caseMenuAnchor, setCaseMenuAnchor] = useState(null);
  const [highlightAnchor, setHighlightAnchor] = useState(null);
  const [fontColorAnchor, setFontColorAnchor] = useState(null);
  const [bulletsAnchor, setBulletsAnchor] = useState(null);
  const [numberingAnchor, setNumberingAnchor] = useState(null);
  const [lineSpacingAnchor, setLineSpacingAnchor] = useState(null);
  const [columnsAnchor, setColumnsAnchor] = useState(null);
  const [textDirAnchor, setTextDirAnchor] = useState(null);
  const [alignTextAnchor, setAlignTextAnchor] = useState(null);
  const [smartArtAnchor, setSmartArtAnchor] = useState(null);
  const [shapesMenuAnchor, setShapesMenuAnchor] = useState(null);
  const [arrangeAnchor, setArrangeAnchor] = useState(null);
  const [quickStylesAnchor, setQuickStylesAnchor] = useState(null);
  const [shapeFillAnchor, setShapeFillAnchor] = useState(null);
  const [shapeOutlineAnchor, setShapeOutlineAnchor] = useState(null);
  const [shapeEffectsAnchor, setShapeEffectsAnchor] = useState(null);
  const [selectMenuAnchor, setSelectMenuAnchor] = useState(null);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);

  // Dialogs
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceCount, setReplaceCount] = useState(null);

  const [replaceFontsOpen, setReplaceFontsOpen] = useState(false);
  const [replaceFontFrom, setReplaceFontFrom] = useState('Calibri');
  const [replaceFontTo, setReplaceFontTo] = useState('Arial');

  const [addinsOpen, setAddinsOpen] = useState(false);

  // Format Painter state
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const copiedFormatRef = useRef(null);

  // Dictation Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Color bar indicators
  const [currentFontColor, setCurrentFontColor] = useState('#c43e1c');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('#ffff00');
  const [currentShapeFill, setCurrentShapeFill] = useState('#3b82f6');
  const [currentShapeOutline, setCurrentShapeOutline] = useState('#1d4ed8');

  // Font styling state derived from activeSlide
  const currentFontFamily = activeSlide?.fontFamily || 'Calibri';
  const currentFontSize = activeSlide?.fontSize || '24';
  const isBold = !!activeSlide?.isBold;
  const isItalic = !!activeSlide?.isItalic;
  const isUnderline = !!activeSlide?.isUnderline;
  const isShadow = !!activeSlide?.isShadow;
  const isStrike = !!activeSlide?.isStrike;
  const textAlign = activeSlide?.textAlign || 'left';

  // Toggle slide text styling property
  const handleToggleStyle = (prop) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide(prop, !activeSlide?.[prop]);
  };

  // Change font family
  const handleFontFamilyChange = (e) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('fontFamily', e.target.value);
  };

  // Change font size
  const handleFontSizeChange = (e) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('fontSize', e.target.value);
  };

  // Grow Font Size (A^)
  const handleGrowFont = () => {
    if (readOnly || !onUpdateSlide) return;
    const current = parseInt(currentFontSize, 10) || 24;
    const nextIdx = FONT_SIZES.findIndex((sz) => parseInt(sz, 10) > current);
    const nextVal = nextIdx !== -1 ? FONT_SIZES[nextIdx] : String(current + 4);
    onUpdateSlide('fontSize', nextVal);
  };

  // Shrink Font Size (Av)
  const handleShrinkFont = () => {
    if (readOnly || !onUpdateSlide) return;
    const current = parseInt(currentFontSize, 10) || 24;
    const prevSizes = [...FONT_SIZES].reverse();
    const prevIdx = prevSizes.findIndex((sz) => parseInt(sz, 10) < current);
    const prevVal = prevIdx !== -1 ? prevSizes[prevIdx] : String(Math.max(8, current - 4));
    onUpdateSlide('fontSize', prevVal);
  };

  // Clear Formatting
  const handleClearFormatting = () => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('fontFamily', 'Calibri');
    onUpdateSlide('fontSize', '24');
    onUpdateSlide('isBold', false);
    onUpdateSlide('isItalic', false);
    onUpdateSlide('isUnderline', false);
    onUpdateSlide('isShadow', false);
    onUpdateSlide('isStrike', false);
    onUpdateSlide('letterSpacing', 'normal');
    onUpdateSlide('textAlign', 'left');
    onUpdateSlide('textTransform', 'none');
    onUpdateSlide('customColor', null);
    onUpdateSlide('highlightColor', null);
    onUpdateSlide('lineSpacing', '1.2');
  };

  // Character Spacing
  const handleSetCharSpacing = (spacing) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('letterSpacing', spacing);
    setCharSpacingAnchor(null);
  };

  // Change Case
  const handleSetChangeCase = (caseType) => {
    if (readOnly || !onUpdateSlide) return;
    let transform = 'none';
    if (caseType === 'uppercase') transform = 'uppercase';
    if (caseType === 'lowercase') transform = 'lowercase';
    if (caseType === 'capitalize') transform = 'capitalize';
    onUpdateSlide('textTransform', transform);
    setCaseMenuAnchor(null);
  };

  // Highlight Color
  const handleSelectHighlight = (color) => {
    if (readOnly || !onUpdateSlide) return;
    setCurrentHighlightColor(color);
    onUpdateSlide('highlightColor', color);
    setHighlightAnchor(null);
  };

  // Font Color
  const handleSelectFontColor = (color) => {
    if (readOnly || !onUpdateSlide) return;
    setCurrentFontColor(color);
    onUpdateSlide('customColor', color);
    setFontColorAnchor(null);
  };

  // Alignment
  const handleSetAlign = (align) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('textAlign', align);
  };

  // Line Spacing
  const handleSetLineSpacing = (spacing) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('lineSpacing', spacing);
    setLineSpacingAnchor(null);
  };

  // Text Direction
  const handleSetTextDirection = (dir) => {
    if (readOnly || !onUpdateSlide) return;
    onUpdateSlide('textDirection', dir);
    setTextDirAnchor(null);
  };

  // Columns Layout
  const handleSetColumns = (layout) => {
    if (readOnly) return;
    if (layout === '1') onLayoutChange('bullets');
    if (layout === '2') onLayoutChange('two-column');
    if (layout === '3') onLayoutChange('three-column');
    setColumnsAnchor(null);
  };

  // Shape Insertion
  const handleInsertShape = (shapeId) => {
    if (readOnly) return;
    if (onAddShape) {
      onAddShape(shapeId);
    } else if (onUpdateSlide) {
      const newShape = {
        id: `shape_${Date.now()}`,
        type: shapeId,
        x: 60,
        y: 80,
        width: shapeId === 'textbox' ? 220 : 130,
        height: shapeId === 'textbox' ? 70 : 80,
        fill: currentShapeFill,
        stroke: currentShapeOutline,
        strokeWidth: 2,
        text: shapeId === 'textbox' ? 'Click to add text' : '',
        shadow: true
      };
      const existingShapes = activeSlide?.shapes || [];
      onUpdateSlide('shapes', [...existingShapes, newShape]);
    }
    setShapesMenuAnchor(null);
  };

  // Quick Styles preset application
  const handleApplyQuickStyle = (stylePreset) => {
    if (readOnly || !onUpdateSlide) return;
    setCurrentShapeFill(stylePreset.fill);
    setCurrentShapeOutline(stylePreset.stroke);
    onUpdateSlide('shapeStylePreset', stylePreset.id);
    setQuickStylesAnchor(null);
  };

  // Shape Fill & Outline
  const handleSelectShapeFill = (color) => {
    if (readOnly || !onUpdateSlide) return;
    setCurrentShapeFill(color);
    onUpdateSlide('shapeFill', color);
    setShapeFillAnchor(null);
  };

  const handleSelectShapeOutline = (color) => {
    if (readOnly || !onUpdateSlide) return;
    setCurrentShapeOutline(color);
    onUpdateSlide('shapeOutline', color);
    setShapeOutlineAnchor(null);
  };

  // Format Painter
  const handleToggleFormatPainter = () => {
    if (readOnly) return;
    if (!formatPainterActive) {
      copiedFormatRef.current = {
        fontFamily: activeSlide?.fontFamily,
        fontSize: activeSlide?.fontSize,
        isBold: activeSlide?.isBold,
        isItalic: activeSlide?.isItalic,
        isUnderline: activeSlide?.isUnderline,
        isShadow: activeSlide?.isShadow,
        isStrike: activeSlide?.isStrike,
        textAlign: activeSlide?.textAlign,
        customColor: activeSlide?.customColor,
        highlightColor: activeSlide?.highlightColor,
        letterSpacing: activeSlide?.letterSpacing,
        lineSpacing: activeSlide?.lineSpacing
      };
      setFormatPainterActive(true);
    } else {
      setFormatPainterActive(false);
      copiedFormatRef.current = null;
    }
  };

  // Apply Format Painter when slide changes
  useEffect(() => {
    if (formatPainterActive && copiedFormatRef.current && onUpdateSlide) {
      Object.entries(copiedFormatRef.current).forEach(([k, v]) => {
        if (v !== undefined) onUpdateSlide(k, v);
      });
      setFormatPainterActive(false);
      copiedFormatRef.current = null;
    }
  }, [activeSlide?.id, formatPainterActive, onUpdateSlide]);

  // Clipboard Paste
  const handlePasteClipboard = async () => {
    if (readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && onUpdateSlide) {
        if (activeSlide?.layout === 'bullets') {
          const bullets = [...(activeSlide?.bullets || []), text];
          onUpdateSlide('bullets', bullets);
        } else {
          onUpdateSlide('subtitle', text);
        }
      }
    } catch {
      // Fallback: duplicate slide
      if (onDuplicateSlide) onDuplicateSlide();
    }
    setPasteMenuAnchor(null);
  };

  // Clipboard Cut
  const handleCut = () => {
    if (readOnly) return;
    const textToCopy = activeSlide?.title || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      if (onUpdateSlide) onUpdateSlide('title', '');
    }
  };

  // Clipboard Copy
  const handleCopy = () => {
    const textToCopy = `${activeSlide?.title || ''}\n${activeSlide?.subtitle || ''}`;
    navigator.clipboard.writeText(textToCopy);
    setPasteMenuAnchor(null);
  };

  // Speech Recognition (Dictate)
  const handleToggleDictation = () => {
    if (readOnly) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(' ');

        if (onUpdateSlide) {
          if (activeSlide?.layout === 'bullets') {
            const bullets = [...(activeSlide?.bullets || []), transcript];
            onUpdateSlide('bullets', bullets);
          } else {
            const currentTitle = activeSlide?.title || '';
            onUpdateSlide('title', currentTitle ? `${currentTitle} ${transcript}` : transcript);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setIsListening(false);
    }
  };

  // Find & Replace Handler across all slides
  const handleExecuteReplace = (replaceAll = false) => {
    if (!deck || !updateDeck || !findText) return;
    let count = 0;
    const updatedSlides = deck.slides.map((s) => {
      let slideChanged = false;
      const copy = { ...s };

      ['title', 'subtitle', 'col1Title', 'col2Title', 'col3Title', 'col1Text', 'col2Text', 'col3Text', 'leftColumn', 'rightColumn', 'quoteText', 'quoteAuthor', 'notes'].forEach((key) => {
        if (copy[key] && typeof copy[key] === 'string' && copy[key].includes(findText)) {
          if (replaceAll) {
            copy[key] = copy[key].replaceAll(findText, replaceText);
          } else if (count === 0) {
            copy[key] = copy[key].replace(findText, replaceText);
          }
          count += 1;
          slideChanged = true;
        }
      });

      if (Array.isArray(copy.bullets)) {
        copy.bullets = copy.bullets.map((b) => {
          if (b.includes(findText)) {
            count += 1;
            slideChanged = true;
            return replaceAll ? b.replaceAll(findText, replaceText) : b.replace(findText, replaceText);
          }
          return b;
        });
      }

      return slideChanged ? copy : s;
    });

    setReplaceCount(count);
    updateDeck({ ...deck, slides: updatedSlides });
  };

  // Replace Fonts Handler
  const handleExecuteReplaceFonts = () => {
    if (!deck || !updateDeck) return;
    const updatedSlides = deck.slides.map((s) => ({
      ...s,
      fontFamily: (s.fontFamily === replaceFontFrom || !s.fontFamily) ? replaceFontTo : s.fontFamily
    }));
    updateDeck({ ...deck, slides: updatedSlides });
    setReplaceFontsOpen(false);
  };

  return (
    <Box className="ppt-ribbon-container">
      {/* 1. CLIPBOARD GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content">
          {/* Big Paste Button with split dropdown */}
          <Tooltip title="Paste (Ctrl+V)">
            <Box
              className="ppt-btn-big"
              onClick={handlePasteClipboard}
            >
              <Box className="ppt-btn-big-icon">
                <ContentPasteIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
              </Box>
              <Box className="ppt-btn-big-label">
                <span>Paste</span>
                <ArrowDropDownIcon
                  sx={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPasteMenuAnchor(e.currentTarget);
                  }}
                />
              </Box>
            </Box>
          </Tooltip>

          {/* Stacked Cut, Copy, Format Painter */}
          <Box className="ppt-stacked-column">
            <Tooltip title="Cut (Ctrl+X)">
              <button className="ppt-btn-stacked" onClick={handleCut} disabled={readOnly}>
                <ContentCutIcon sx={{ fontSize: 13, color: '#6b7280' }} />
                <span>Cut</span>
              </button>
            </Tooltip>
            <Tooltip title="Copy (Ctrl+C)">
              <button className="ppt-btn-stacked" onClick={handleCopy}>
                <ContentCopyIcon sx={{ fontSize: 13, color: '#6b7280' }} />
                <span>Copy</span>
              </button>
            </Tooltip>
            <Tooltip title="Format Painter (Copy & Paint Formatting)">
              <button
                className={`ppt-btn-stacked ${formatPainterActive ? 'active' : ''}`}
                onClick={handleToggleFormatPainter}
                disabled={readOnly}
              >
                <FormatPaintIcon sx={{ fontSize: 13, color: formatPainterActive ? '#c43e1c' : '#f59e0b' }} />
                <span>Format Painter</span>
              </button>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Clipboard</span>
          <LaunchIcon className="ppt-launcher-icon" onClick={(e) => setPasteMenuAnchor(e.currentTarget)} />
        </Box>
      </Box>

      {/* 2. SLIDES GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content">
          {/* Big New Slide Button */}
          <Tooltip title="Add New Slide (Click to choose layout)">
            <Box
              className="ppt-btn-big"
              onClick={(e) => setNewSlideMenuAnchor(e.currentTarget)}
            >
              <Box className="ppt-btn-big-icon">
                <PostAddIcon sx={{ fontSize: 28, color: '#107c41' }} />
              </Box>
              <Box className="ppt-btn-big-label">
                <span>New Slide</span>
                <ArrowDropDownIcon sx={{ fontSize: 13 }} />
              </Box>
            </Box>
          </Tooltip>

          {/* Stacked Layout, Reset, Section */}
          <Box className="ppt-stacked-column">
            <Tooltip title="Change Slide Layout">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <ViewAgendaIcon sx={{ fontSize: 13, color: '#2563eb' }} />
                <span>Layout</span>
                <ArrowDropDownIcon sx={{ fontSize: 12, ml: -0.5 }} />
              </button>
            </Tooltip>
            <Tooltip title="Reset Slide to Theme Defaults">
              <button
                className="ppt-btn-stacked"
                onClick={onResetSlide || handleClearFormatting}
                disabled={readOnly}
              >
                <RestartAltIcon sx={{ fontSize: 13, color: '#059669' }} />
                <span>Reset</span>
              </button>
            </Tooltip>
            <Tooltip title="Add or Organize Sections">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setSectionMenuAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <CreateNewFolderIcon sx={{ fontSize: 13, color: '#8b5cf6' }} />
                <span>Section</span>
                <ArrowDropDownIcon sx={{ fontSize: 12, ml: -0.5 }} />
              </button>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Slides</span>
        </Box>
      </Box>

      {/* 3. FONT GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content" style={{ flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
          {/* Top Row: Font Family, Font Size, Grow, Shrink, Clear */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Tooltip title="Font Family">
              <select
                className="ppt-combo-select ppt-font-family-select"
                value={currentFontFamily}
                onChange={handleFontFamilyChange}
                disabled={readOnly}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </Tooltip>

            <Tooltip title="Font Size">
              <select
                className="ppt-combo-select ppt-font-size-select"
                value={currentFontSize}
                onChange={handleFontSizeChange}
                disabled={readOnly}
              >
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </Tooltip>

            <Tooltip title="Increase Font Size (Grow)">
              <button className="ppt-icon-btn" onClick={handleGrowFont} disabled={readOnly}>
                <span style={{ fontSize: 11, fontWeight: 'bold' }}>A<sup>^</sup></span>
              </button>
            </Tooltip>
            <Tooltip title="Decrease Font Size (Shrink)">
              <button className="ppt-icon-btn" onClick={handleShrinkFont} disabled={readOnly}>
                <span style={{ fontSize: 10, fontWeight: 'bold' }}>A<sub>v</sub></span>
              </button>
            </Tooltip>
            <Tooltip title="Clear All Formatting">
              <button className="ppt-icon-btn" onClick={handleClearFormatting} disabled={readOnly}>
                <FormatClearIcon sx={{ fontSize: 13, color: '#ec4899' }} />
              </button>
            </Tooltip>
          </Box>

          {/* Bottom Row: Bold, Italic, Underline, Shadow, Strike, Char Spacing, Change Case, Highlight, Color */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Tooltip title="Bold (Ctrl+B)">
              <button
                className={`ppt-icon-btn ${isBold ? 'active' : ''}`}
                onClick={() => handleToggleStyle('isBold')}
                disabled={readOnly}
              >
                <FormatBoldIcon sx={{ fontSize: 14 }} />
              </button>
            </Tooltip>
            <Tooltip title="Italic (Ctrl+I)">
              <button
                className={`ppt-icon-btn ${isItalic ? 'active' : ''}`}
                onClick={() => handleToggleStyle('isItalic')}
                disabled={readOnly}
              >
                <FormatItalicIcon sx={{ fontSize: 14 }} />
              </button>
            </Tooltip>
            <Tooltip title="Underline (Ctrl+U)">
              <button
                className={`ppt-icon-btn ${isUnderline ? 'active' : ''}`}
                onClick={() => handleToggleStyle('isUnderline')}
                disabled={readOnly}
              >
                <FormatUnderlinedIcon sx={{ fontSize: 14 }} />
              </button>
            </Tooltip>
            <Tooltip title="Text Shadow (PowerPoint S)">
              <button
                className={`ppt-icon-btn ${isShadow ? 'active' : ''}`}
                onClick={() => handleToggleStyle('isShadow')}
                disabled={readOnly}
              >
                <span style={{ fontWeight: 800, fontSize: 12, textShadow: '1px 1px 2px #64748b' }}>S</span>
              </button>
            </Tooltip>
            <Tooltip title="Strikethrough">
              <button
                className={`ppt-icon-btn ${isStrike ? 'active' : ''}`}
                onClick={() => handleToggleStyle('isStrike')}
                disabled={readOnly}
              >
                <StrikethroughSIcon sx={{ fontSize: 14 }} />
              </button>
            </Tooltip>

            {/* Character Spacing AV<-> */}
            <Tooltip title="Character Spacing (AV)">
              <button
                className="ppt-icon-btn"
                onClick={(e) => setCharSpacingAnchor(e.currentTarget)}
                disabled={readOnly}
                style={{ width: 'auto', padding: '0 2px' }}
              >
                <span style={{ fontSize: 10, fontWeight: 700 }}>AV</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
              </button>
            </Tooltip>

            {/* Change Case Aa */}
            <Tooltip title="Change Case (Aa)">
              <button
                className="ppt-icon-btn"
                onClick={(e) => setCaseMenuAnchor(e.currentTarget)}
                disabled={readOnly}
                style={{ width: 'auto', padding: '0 2px' }}
              >
                <span style={{ fontSize: 11, fontWeight: 700 }}>Aa</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
              </button>
            </Tooltip>

            {/* Text Highlight Color */}
            <Tooltip title="Text Highlight Color">
              <Box
                className="ppt-color-indicator-btn"
                onClick={(e) => setHighlightAnchor(e.currentTarget)}
              >
                <BorderColorIcon sx={{ fontSize: 12, color: '#374151' }} />
                <Box className="ppt-color-bar" style={{ backgroundColor: currentHighlightColor }} />
              </Box>
            </Tooltip>

            {/* Font Color */}
            <Tooltip title="Font Color">
              <Box
                className="ppt-color-indicator-btn"
                onClick={(e) => setFontColorAnchor(e.currentTarget)}
              >
                <FormatColorTextIcon sx={{ fontSize: 12, color: '#374151' }} />
                <Box className="ppt-color-bar" style={{ backgroundColor: currentFontColor }} />
              </Box>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Font</span>
          <LaunchIcon className="ppt-launcher-icon" onClick={() => setReplaceFontsOpen(true)} />
        </Box>
      </Box>

      {/* 4. PARAGRAPH GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content" style={{ gap: 6 }}>
          {/* Left Sub-Group: Bullets, Indents, Spacing, Alignments */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
            {/* Top row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Tooltip title="Bullets">
                <button
                  className="ppt-icon-btn"
                  onClick={(e) => setBulletsAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <FormatListBulletedIcon sx={{ fontSize: 13 }} />
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
                </button>
              </Tooltip>
              <Tooltip title="Numbering">
                <button
                  className="ppt-icon-btn"
                  onClick={(e) => setNumberingAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <FormatListNumberedIcon sx={{ fontSize: 13 }} />
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
                </button>
              </Tooltip>
              <Tooltip title="Decrease List Indent">
                <button
                  className="ppt-icon-btn"
                  onClick={() => onUpdateSlide && onUpdateSlide('indent', Math.max(0, (activeSlide?.indent || 0) - 1))}
                  disabled={readOnly}
                >
                  <FormatIndentDecreaseIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Increase List Indent">
                <button
                  className="ppt-icon-btn"
                  onClick={() => onUpdateSlide && onUpdateSlide('indent', (activeSlide?.indent || 0) + 1)}
                  disabled={readOnly}
                >
                  <FormatIndentIncreaseIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Line Spacing">
                <button
                  className="ppt-icon-btn"
                  onClick={(e) => setLineSpacingAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <FormatLineSpacingIcon sx={{ fontSize: 13 }} />
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
                </button>
              </Tooltip>
            </Box>

            {/* Bottom row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Tooltip title="Align Left (Ctrl+L)">
                <button
                  className={`ppt-icon-btn ${textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => handleSetAlign('left')}
                  disabled={readOnly}
                >
                  <FormatAlignLeftIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Center (Ctrl+E)">
                <button
                  className={`ppt-icon-btn ${textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => handleSetAlign('center')}
                  disabled={readOnly}
                >
                  <FormatAlignCenterIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Align Right (Ctrl+R)">
                <button
                  className={`ppt-icon-btn ${textAlign === 'right' ? 'active' : ''}`}
                  onClick={() => handleSetAlign('right')}
                  disabled={readOnly}
                >
                  <FormatAlignRightIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Justify (Ctrl+J)">
                <button
                  className={`ppt-icon-btn ${textAlign === 'justify' ? 'active' : ''}`}
                  onClick={() => handleSetAlign('justify')}
                  disabled={readOnly}
                >
                  <FormatAlignJustifyIcon sx={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Tooltip title="Add or Remove Columns">
                <button
                  className="ppt-icon-btn"
                  onClick={(e) => setColumnsAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <ViewColumnIcon sx={{ fontSize: 13 }} />
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.4 }} />
                </button>
              </Tooltip>
            </Box>
          </Box>

          {/* Right Sub-Group: Text Direction, Align Text, SmartArt */}
          <Box className="ppt-stacked-column">
            <Tooltip title="Text Direction (Rotate text)">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setTextDirAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <TextRotateVerticalIcon sx={{ fontSize: 12, color: '#6b7280' }} />
                <span>Text Direction</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
              </button>
            </Tooltip>
            <Tooltip title="Align Text (Top, Middle, Bottom)">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setAlignTextAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <VerticalAlignCenterIcon sx={{ fontSize: 12, color: '#6b7280' }} />
                <span>Align Text</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
              </button>
            </Tooltip>
            <Tooltip title="Convert to SmartArt Graphic">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setSmartArtAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <AccountTreeIcon sx={{ fontSize: 12, color: '#059669' }} />
                <span>Convert to SmartArt</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
              </button>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Paragraph</span>
          <LaunchIcon className="ppt-launcher-icon" onClick={(e) => setAlignTextAnchor(e.currentTarget)} />
        </Box>
      </Box>

      {/* 5. DRAWING GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content" style={{ gap: 4 }}>
          {/* Visual Shapes Gallery Frame */}
          <Tooltip title="Insert Shapes & Text Boxes">
            <Box className="ppt-shapes-box">
              <Box className="ppt-shapes-grid custom-scrollbar">
                {SHAPES_LIST.map((shape) => (
                  <button
                    key={shape.id}
                    className="ppt-shape-btn"
                    title={shape.name}
                    onClick={() => handleInsertShape(shape.id)}
                    disabled={readOnly}
                  >
                    {shape.icon}
                  </button>
                ))}
              </Box>
              <Box className="ppt-shapes-nav">
                <button
                  className="ppt-shape-nav-btn"
                  onClick={() => {
                    const el = document.querySelector('.ppt-shapes-grid');
                    if (el) el.scrollTop -= 20;
                  }}
                >
                  <KeyboardArrowUpIcon sx={{ fontSize: 12 }} />
                </button>
                <button
                  className="ppt-shape-nav-btn"
                  onClick={() => {
                    const el = document.querySelector('.ppt-shapes-grid');
                    if (el) el.scrollTop += 20;
                  }}
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 12 }} />
                </button>
                <button
                  className="ppt-shape-nav-btn"
                  onClick={(e) => setShapesMenuAnchor(e.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: 12 }} />
                </button>
              </Box>
            </Box>
          </Tooltip>

          {/* Right Column: Arrange, Quick Styles, Shape Fill, Outline, Effects */}
          <Box className="ppt-stacked-column">
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Arrange Objects (Order, Group, Align)">
                <button
                  className="ppt-btn-stacked"
                  onClick={(e) => setArrangeAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <LayersIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                  <span>Arrange</span>
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
                </button>
              </Tooltip>
              <Tooltip title="Quick Styles (Color Themes for Shapes)">
                <button
                  className="ppt-btn-stacked"
                  onClick={(e) => setQuickStylesAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 12, color: '#3b82f6' }} />
                  <span>Quick Styles</span>
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
                </button>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Shape Fill Color">
                <button
                  className="ppt-btn-stacked"
                  onClick={(e) => setShapeFillAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <FormatColorFillIcon sx={{ fontSize: 12, color: currentShapeFill }} />
                  <span>Shape Fill</span>
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
                </button>
              </Tooltip>
              <Tooltip title="Shape Outline Color & Weight">
                <button
                  className="ppt-btn-stacked"
                  onClick={(e) => setShapeOutlineAnchor(e.currentTarget)}
                  disabled={readOnly}
                >
                  <BorderColorIcon sx={{ fontSize: 12, color: currentShapeOutline }} />
                  <span>Shape Outline</span>
                  <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
                </button>
              </Tooltip>
            </Box>

            <Tooltip title="Shape Effects (Shadow, Glow, 3D)">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setShapeEffectsAnchor(e.currentTarget)}
                disabled={readOnly}
              >
                <CropSquareIcon sx={{ fontSize: 12, color: '#8b5cf6' }} />
                <span>Shape Effects</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
              </button>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Drawing</span>
        </Box>
      </Box>

      {/* 6. EDITING GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content">
          <Box className="ppt-stacked-column">
            <Tooltip title="Find and Replace Text in Slide Deck">
              <button
                className="ppt-btn-stacked"
                onClick={() => setFindReplaceOpen(true)}
              >
                <SearchIcon sx={{ fontSize: 13, color: '#2563eb' }} />
                <span>Find & Replace</span>
              </button>
            </Tooltip>
            <Tooltip title="Replace Fonts Globally in Deck">
              <button
                className="ppt-btn-stacked"
                onClick={() => setReplaceFontsOpen(true)}
              >
                <FindReplaceIcon sx={{ fontSize: 13, color: '#059669' }} />
                <span>Replace Fonts</span>
              </button>
            </Tooltip>
            <Tooltip title="Select Slide Objects or Text">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setSelectMenuAnchor(e.currentTarget)}
              >
                <SelectAllIcon sx={{ fontSize: 13, color: '#6b7280' }} />
                <span>Select</span>
                <ArrowDropDownIcon sx={{ fontSize: 11, ml: -0.5 }} />
              </button>
            </Tooltip>
          </Box>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Editing</span>
        </Box>
      </Box>

      {/* 7. VOICE GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content">
          <Tooltip title={isListening ? 'Stop Dictating (Recording Speech)' : 'Dictate (Speech to Text in Slide)'}>
            <Box
              className={`ppt-btn-big ${isListening ? 'ppt-dictate-recording' : ''}`}
              onClick={handleToggleDictation}
            >
              <Box className="ppt-btn-big-icon">
                {isListening ? (
                  <MicIcon sx={{ fontSize: 26, color: '#dc2626' }} />
                ) : (
                  <MicIcon sx={{ fontSize: 26, color: '#2563eb' }} />
                )}
              </Box>
              <Box className="ppt-btn-big-label">
                <span>{isListening ? 'Listening...' : 'Dictate'}</span>
                <ArrowDropDownIcon sx={{ fontSize: 12 }} />
              </Box>
            </Box>
          </Tooltip>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Voice</span>
        </Box>
      </Box>

      {/* 8. ADD-INS GROUP */}
      <Box className="ppt-ribbon-group">
        <Box className="ppt-ribbon-group-content">
          <Tooltip title="Explore PowerPoint Add-ins & Extension Tools">
            <Box
              className="ppt-btn-big"
              onClick={() => setAddinsOpen(true)}
            >
              <Box className="ppt-btn-big-icon">
                <AppsIcon sx={{ fontSize: 26, color: '#ea580c' }} />
              </Box>
              <Box className="ppt-btn-big-label">
                <span>Add-ins</span>
              </Box>
            </Box>
          </Tooltip>
        </Box>
        <Box className="ppt-ribbon-group-label">
          <span>Add-ins</span>
        </Box>
      </Box>

      {/* 9. DESIGNER & EXISTING PPT SETTINGS GROUP (Theme & Option Selection) */}
      <Box className="ppt-ribbon-group" style={{ borderRight: 'none', background: 'rgba(234, 88, 12, 0.03)' }}>
        <Box className="ppt-ribbon-group-content" style={{ gap: 6 }}>
          {/* Designer Big Button */}
          <Tooltip title="Slide Design Ideas & Quick Layouts">
            <Box
              className="ppt-btn-big"
              onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
            >
              <Box className="ppt-btn-big-icon">
                <BoltIcon sx={{ fontSize: 28, color: '#ea580c' }} />
              </Box>
              <Box className="ppt-btn-big-label">
                <span style={{ color: '#ea580c', fontWeight: 700 }}>Designer</span>
                <ArrowDropDownIcon sx={{ fontSize: 12 }} />
              </Box>
            </Box>
          </Tooltip>

          {/* Existing PPT Settings Controls: Theme Selector, Layout Selector, Notes & Present */}
          <Box className="ppt-stacked-column" style={{ minWidth: 150 }}>
            {/* Theme Selector */}
            <Tooltip title="Choose Deck Presentation Theme">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
                style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 4, height: 21 }}
              >
                <Box
                  className="ppt-theme-circle"
                  style={{
                    background: SLIDE_THEMES[deck.themeId]?.bg || '#1e3a8a',
                    width: 12,
                    height: 12
                  }}
                />
                <span style={{ fontWeight: 600 }}>{SLIDE_THEMES[deck.themeId]?.name || 'Theme'}</span>
                <ArrowDropDownIcon sx={{ fontSize: 12, ml: 'auto' }} />
              </button>
            </Tooltip>

            {/* Layout Picker */}
            <Tooltip title="Change Slide Template Layout">
              <button
                className="ppt-btn-stacked"
                onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
                style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 4, height: 21 }}
              >
                <ViewAgendaIcon sx={{ fontSize: 13, color: '#2563eb' }} />
                <span>
                  {SLIDE_LAYOUTS.find((l) => l.id === activeSlide?.layout)?.name || 'Layout'}
                </span>
                <ArrowDropDownIcon sx={{ fontSize: 12, ml: 'auto' }} />
              </button>
            </Tooltip>

            {/* Speaker Notes Toggle */}
            <Tooltip title={showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes Pane'}>
              <button
                className={`ppt-btn-stacked ${showNotes ? 'active' : ''}`}
                onClick={() => setShowNotes(!showNotes)}
                style={{ height: 20 }}
              >
                <NotesIcon sx={{ fontSize: 13, color: showNotes ? '#c43e1c' : '#6b7280' }} />
                <span>Speaker Notes</span>
                {showNotes && <CheckIcon sx={{ fontSize: 11, ml: 'auto', color: '#c43e1c' }} />}
              </button>
            </Tooltip>
          </Box>

          {/* Big Present (Slideshow) Button */}
          <Tooltip title="Present Slide Deck (Fullscreen Slideshow)">
            <Button
              variant="contained"
              className="ppt-present-ribbon-btn"
              startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
              onClick={onStartPresentation}
            >
              Present
            </Button>
          </Tooltip>
        </Box>
        <Box className="ppt-ribbon-group-label" style={{ color: '#ea580c', fontWeight: 600 }}>
          <span>Designer & Settings</span>
        </Box>
      </Box>

      {/* ── DROPDOWN MENUS & MODALS ────────────────────────────────────────── */}

      {/* Paste Menu */}
      <Menu
        anchorEl={pasteMenuAnchor}
        open={Boolean(pasteMenuAnchor)}
        onClose={() => setPasteMenuAnchor(null)}
      >
        <MenuItem onClick={handlePasteClipboard}>
          <ContentPasteIcon sx={{ fontSize: 16, mr: 1, color: '#f59e0b' }} />
          Paste Content
        </MenuItem>
        <MenuItem onClick={() => { handlePasteClipboard(); setPasteMenuAnchor(null); }}>
          <TextFieldsIcon sx={{ fontSize: 16, mr: 1, color: '#6b7280' }} />
          Keep Text Only
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (onDuplicateSlide) onDuplicateSlide(); setPasteMenuAnchor(null); }}>
          <ContentCopyIcon sx={{ fontSize: 16, mr: 1, color: '#2563eb' }} />
          Duplicate Current Slide
        </MenuItem>
      </Menu>

      {/* New Slide Layout Menu */}
      <Menu
        anchorEl={newSlideMenuAnchor}
        open={Boolean(newSlideMenuAnchor)}
        onClose={() => setNewSlideMenuAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280' }}>
            SELECT NEW SLIDE LAYOUT
          </Typography>
        </Box>
        {SLIDE_LAYOUTS.map((layout) => (
          <MenuItem
            key={layout.id}
            onClick={() => {
              if (onAddSlide) onAddSlide(layout.id);
              setNewSlideMenuAnchor(null);
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {layout.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                {layout.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            if (onOpenLayoutDialog) onOpenLayoutDialog();
            setNewSlideMenuAnchor(null);
          }}
        >
          <AppsIcon sx={{ fontSize: 16, mr: 1, color: '#ea580c' }} />
          Visual Layout Picker Gallery...
        </MenuItem>
      </Menu>

      {/* Layout Switcher Menu */}
      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={() => setLayoutMenuAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280' }}>
            SWITCH ACTIVE SLIDE LAYOUT
          </Typography>
        </Box>
        {SLIDE_LAYOUTS.map((layout) => (
          <MenuItem
            key={layout.id}
            selected={activeSlide?.layout === layout.id}
            onClick={() => {
              onLayoutChange(layout.id);
              setLayoutMenuAnchor(null);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: activeSlide?.layout === layout.id ? 700 : 500 }}>
                  {layout.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  {layout.description}
                </Typography>
              </Box>
              {activeSlide?.layout === layout.id && <CheckIcon sx={{ fontSize: 16, color: '#2563eb' }} />}
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            if (onOpenLayoutDialog) onOpenLayoutDialog();
            setLayoutMenuAnchor(null);
          }}
        >
          <LaunchIcon sx={{ fontSize: 16, mr: 1, color: '#2563eb' }} />
          Open Visual Layout Dialog...
        </MenuItem>
      </Menu>

      {/* Section Menu */}
      <Menu
        anchorEl={sectionMenuAnchor}
        open={Boolean(sectionMenuAnchor)}
        onClose={() => setSectionMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            if (onAddSlide) onAddSlide('section');
            setSectionMenuAnchor(null);
          }}
        >
          <CreateNewFolderIcon sx={{ fontSize: 16, mr: 1, color: '#8b5cf6' }} />
          Add Section Divider Slide
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (onDeleteSlide) onDeleteSlide();
            setSectionMenuAnchor(null);
          }}
        >
          <CloseIcon sx={{ fontSize: 16, mr: 1, color: '#ef4444' }} />
          Remove Active Slide
        </MenuItem>
      </Menu>

      {/* Character Spacing Menu */}
      <Menu
        anchorEl={charSpacingAnchor}
        open={Boolean(charSpacingAnchor)}
        onClose={() => setCharSpacingAnchor(null)}
      >
        <MenuItem onClick={() => handleSetCharSpacing('-0.06em')}>Very Tight (-0.06em)</MenuItem>
        <MenuItem onClick={() => handleSetCharSpacing('-0.03em')}>Tight (-0.03em)</MenuItem>
        <MenuItem onClick={() => handleSetCharSpacing('normal')}>Normal</MenuItem>
        <MenuItem onClick={() => handleSetCharSpacing('0.06em')}>Loose (+0.06em)</MenuItem>
        <MenuItem onClick={() => handleSetCharSpacing('0.14em')}>Very Loose (+0.14em)</MenuItem>
      </Menu>

      {/* Change Case Menu */}
      <Menu
        anchorEl={caseMenuAnchor}
        open={Boolean(caseMenuAnchor)}
        onClose={() => setCaseMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleSetChangeCase('none')}>Sentence case</MenuItem>
        <MenuItem onClick={() => handleSetChangeCase('lowercase')}>lowercase</MenuItem>
        <MenuItem onClick={() => handleSetChangeCase('uppercase')}>UPPERCASE</MenuItem>
        <MenuItem onClick={() => handleSetChangeCase('capitalize')}>Capitalize Each Word</MenuItem>
      </Menu>

      {/* Highlight Color Popover */}
      <Popover
        anchorEl={highlightAnchor}
        open={Boolean(highlightAnchor)}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, px: 0.5 }}>
            Highlight Colors
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 22px)', gap: '4px', p: 0.5 }}>
            {HIGHLIGHT_COLORS.map((col) => (
              <Box
                key={col}
                className="ppt-palette-swatch"
                style={{ backgroundColor: col, width: 20, height: 20 }}
                onClick={() => handleSelectHighlight(col)}
              />
            ))}
          </Box>
        </Box>
      </Popover>

      {/* Font Color Popover */}
      <Popover
        anchorEl={fontColorAnchor}
        open={Boolean(fontColorAnchor)}
        onClose={() => setFontColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box className="ppt-palette-grid">
          <Typography variant="caption" sx={{ fontWeight: 600, px: 0.5, mb: 0.5 }}>
            Theme Colors
          </Typography>
          {COLOR_PALETTE.map((row, rIdx) => (
            <Box key={rIdx} className="ppt-palette-row">
              {row.map((col) => (
                <Box
                  key={col}
                  className="ppt-palette-swatch"
                  style={{ backgroundColor: col }}
                  onClick={() => handleSelectFontColor(col)}
                />
              ))}
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Button
            size="small"
            sx={{ fontSize: '0.72rem', textTransform: 'none' }}
            onClick={() => handleSelectFontColor(null)}
          >
            Automatic / Theme Default
          </Button>
        </Box>
      </Popover>

      {/* Bullets Menu */}
      <Menu
        anchorEl={bulletsAnchor}
        open={Boolean(bulletsAnchor)}
        onClose={() => setBulletsAnchor(null)}
      >
        <MenuItem onClick={() => { onLayoutChange('bullets'); setBulletsAnchor(null); }}>
          • Solid Circle Bullets
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('bullets'); setBulletsAnchor(null); }}>
          ■ Square Bullets
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('bullets'); setBulletsAnchor(null); }}>
          ➔ Arrow Bullets
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('bullets'); setBulletsAnchor(null); }}>
          ✔ Checkmark Bullets
        </MenuItem>
      </Menu>

      {/* Numbering Menu */}
      <Menu
        anchorEl={numberingAnchor}
        open={Boolean(numberingAnchor)}
        onClose={() => setNumberingAnchor(null)}
      >
        <MenuItem onClick={() => { onLayoutChange('bullets'); setNumberingAnchor(null); }}>
          1. 2. 3. Numbered List
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('bullets'); setNumberingAnchor(null); }}>
          A. B. C. Uppercase Alpha
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('bullets'); setNumberingAnchor(null); }}>
          i. ii. iii. Roman Numerals
        </MenuItem>
      </Menu>

      {/* Line Spacing Menu */}
      <Menu
        anchorEl={lineSpacingAnchor}
        open={Boolean(lineSpacingAnchor)}
        onClose={() => setLineSpacingAnchor(null)}
      >
        <MenuItem onClick={() => handleSetLineSpacing('1.0')}>1.0</MenuItem>
        <MenuItem onClick={() => handleSetLineSpacing('1.15')}>1.15</MenuItem>
        <MenuItem onClick={() => handleSetLineSpacing('1.5')}>1.5</MenuItem>
        <MenuItem onClick={() => handleSetLineSpacing('2.0')}>2.0</MenuItem>
        <MenuItem onClick={() => handleSetLineSpacing('2.5')}>2.5</MenuItem>
        <MenuItem onClick={() => handleSetLineSpacing('3.0')}>3.0</MenuItem>
      </Menu>

      {/* Columns Menu */}
      <Menu
        anchorEl={columnsAnchor}
        open={Boolean(columnsAnchor)}
        onClose={() => setColumnsAnchor(null)}
      >
        <MenuItem onClick={() => handleSetColumns('1')}>1 Column (Single Block)</MenuItem>
        <MenuItem onClick={() => handleSetColumns('2')}>2 Columns (Side by Side)</MenuItem>
        <MenuItem onClick={() => handleSetColumns('3')}>3 Columns (Trio Cards)</MenuItem>
      </Menu>

      {/* Text Direction Menu */}
      <Menu
        anchorEl={textDirAnchor}
        open={Boolean(textDirAnchor)}
        onClose={() => setTextDirAnchor(null)}
      >
        <MenuItem onClick={() => handleSetTextDirection('horizontal')}>Horizontal</MenuItem>
        <MenuItem onClick={() => handleSetTextDirection('vertical')}>Rotate all text 90°</MenuItem>
        <MenuItem onClick={() => handleSetTextDirection('vertical-270')}>Rotate all text 270°</MenuItem>
      </Menu>

      {/* Align Text Menu */}
      <Menu
        anchorEl={alignTextAnchor}
        open={Boolean(alignTextAnchor)}
        onClose={() => setAlignTextAnchor(null)}
      >
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('verticalAlign', 'top'); setAlignTextAnchor(null); }}>
          <VerticalAlignTopIcon sx={{ fontSize: 16, mr: 1 }} />
          Top
        </MenuItem>
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('verticalAlign', 'middle'); setAlignTextAnchor(null); }}>
          <VerticalAlignCenterIcon sx={{ fontSize: 16, mr: 1 }} />
          Middle
        </MenuItem>
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('verticalAlign', 'bottom'); setAlignTextAnchor(null); }}>
          <VerticalAlignBottomIcon sx={{ fontSize: 16, mr: 1 }} />
          Bottom
        </MenuItem>
      </Menu>

      {/* Convert to SmartArt Graphic Menu */}
      <Menu
        anchorEl={smartArtAnchor}
        open={Boolean(smartArtAnchor)}
        onClose={() => setSmartArtAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>
            SMARTART DIAGRAMS
          </Typography>
        </Box>
        <MenuItem onClick={() => { onLayoutChange('three-column'); setSmartArtAnchor(null); }}>
          3-Card Process Flow
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('two-column'); setSmartArtAnchor(null); }}>
          Comparison Matrix
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('metric'); setSmartArtAnchor(null); }}>
          KPI & Metric Callout
        </MenuItem>
        <MenuItem onClick={() => { onLayoutChange('quote'); setSmartArtAnchor(null); }}>
          Callout & Testimonial
        </MenuItem>
      </Menu>

      {/* Shapes Full Menu */}
      <Menu
        anchorEl={shapesMenuAnchor}
        open={Boolean(shapesMenuAnchor)}
        onClose={() => setShapesMenuAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280' }}>
            ALL SHAPES & ELEMENTS
          </Typography>
        </Box>
        {SHAPES_LIST.map((shape) => (
          <MenuItem
            key={shape.id}
            onClick={() => handleInsertShape(shape.id)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {shape.icon}
              <Typography variant="body2">{shape.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Arrange Menu */}
      <Menu
        anchorEl={arrangeAnchor}
        open={Boolean(arrangeAnchor)}
        onClose={() => setArrangeAnchor(null)}
      >
        <MenuItem onClick={() => setArrangeAnchor(null)}>Bring Forward</MenuItem>
        <MenuItem onClick={() => setArrangeAnchor(null)}>Send Backward</MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleSetAlign('center'); setArrangeAnchor(null); }}>Align Center</MenuItem>
        <MenuItem onClick={() => { handleSetAlign('left'); setArrangeAnchor(null); }}>Align Left</MenuItem>
      </Menu>

      {/* Quick Styles Menu */}
      <Menu
        anchorEl={quickStylesAnchor}
        open={Boolean(quickStylesAnchor)}
        onClose={() => setQuickStylesAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#3b82f6' }}>
            PRESET SHAPE STYLES
          </Typography>
        </Box>
        {[
          { id: 'blue', name: 'Corporate Blue', fill: '#2563eb', stroke: '#1d4ed8' },
          { id: 'emerald', name: 'Emerald Gradient', fill: '#059669', stroke: '#047857' },
          { id: 'neon', name: 'Cyber Neon', fill: '#8b5cf6', stroke: '#7c3aed' },
          { id: 'amber', name: 'Sunset Amber', fill: '#ea580c', stroke: '#c2410c' },
          { id: 'dark', name: 'Midnight Card', fill: '#1e293b', stroke: '#475569' },
          { id: 'minimal', name: 'Clean White', fill: '#ffffff', stroke: '#cbd5e1' }
        ].map((style) => (
          <MenuItem key={style.id} onClick={() => handleApplyQuickStyle(style)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '3px',
                  backgroundColor: style.fill,
                  border: `1px solid ${style.stroke}`
                }}
              />
              <Typography variant="body2">{style.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Shape Fill Popover */}
      <Popover
        anchorEl={shapeFillAnchor}
        open={Boolean(shapeFillAnchor)}
        onClose={() => setShapeFillAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box className="ppt-palette-grid">
          <Typography variant="caption" sx={{ fontWeight: 600, px: 0.5, mb: 0.5 }}>
            Shape Fill
          </Typography>
          {COLOR_PALETTE.map((row, rIdx) => (
            <Box key={rIdx} className="ppt-palette-row">
              {row.map((col) => (
                <Box
                  key={col}
                  className="ppt-palette-swatch"
                  style={{ backgroundColor: col }}
                  onClick={() => handleSelectShapeFill(col)}
                />
              ))}
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Button
            size="small"
            sx={{ fontSize: '0.72rem', textTransform: 'none' }}
            onClick={() => handleSelectShapeFill('transparent')}
          >
            No Fill
          </Button>
        </Box>
      </Popover>

      {/* Shape Outline Popover */}
      <Popover
        anchorEl={shapeOutlineAnchor}
        open={Boolean(shapeOutlineAnchor)}
        onClose={() => setShapeOutlineAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box className="ppt-palette-grid">
          <Typography variant="caption" sx={{ fontWeight: 600, px: 0.5, mb: 0.5 }}>
            Shape Outline
          </Typography>
          {COLOR_PALETTE.map((row, rIdx) => (
            <Box key={rIdx} className="ppt-palette-row">
              {row.map((col) => (
                <Box
                  key={col}
                  className="ppt-palette-swatch"
                  style={{ backgroundColor: col }}
                  onClick={() => handleSelectShapeOutline(col)}
                />
              ))}
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Button
            size="small"
            sx={{ fontSize: '0.72rem', textTransform: 'none' }}
            onClick={() => handleSelectShapeOutline('transparent')}
          >
            No Outline
          </Button>
        </Box>
      </Popover>

      {/* Shape Effects Menu */}
      <Menu
        anchorEl={shapeEffectsAnchor}
        open={Boolean(shapeEffectsAnchor)}
        onClose={() => setShapeEffectsAnchor(null)}
      >
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('shapeShadow', true); setShapeEffectsAnchor(null); }}>
          Soft Drop Shadow
        </MenuItem>
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('shapeGlow', true); setShapeEffectsAnchor(null); }}>
          Outer Glow
        </MenuItem>
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('shapeRounded', true); setShapeEffectsAnchor(null); }}>
          Rounded 12px Corners
        </MenuItem>
        <MenuItem onClick={() => { if (onUpdateSlide) onUpdateSlide('shapeElevation', 'high'); setShapeEffectsAnchor(null); }}>
          High 3D Elevation
        </MenuItem>
      </Menu>

      {/* Select Menu */}
      <Menu
        anchorEl={selectMenuAnchor}
        open={Boolean(selectMenuAnchor)}
        onClose={() => setSelectMenuAnchor(null)}
      >
        <MenuItem onClick={() => setSelectMenuAnchor(null)}>Select All Elements</MenuItem>
        <MenuItem onClick={() => setSelectMenuAnchor(null)}>Select Slide Shapes</MenuItem>
        <MenuItem onClick={() => setSelectMenuAnchor(null)}>Selection Pane</MenuItem>
      </Menu>

      {/* THEME SELECTOR MENU (Existing PPT Settings Feature) */}
      <Menu
        anchorEl={themeMenuAnchor}
        open={Boolean(themeMenuAnchor)}
        onClose={() => setThemeMenuAnchor(null)}
      >
        <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#ea580c' }}>
            PRESENTATION THEMES & PALETTES
          </Typography>
        </Box>
        {Object.values(SLIDE_THEMES).map((theme) => (
          <MenuItem
            key={theme.id}
            selected={deck.themeId === theme.id}
            onClick={() => {
              onThemeChange(theme.id);
              setThemeMenuAnchor(null);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: theme.bg,
                    border: '1px solid rgba(0,0,0,0.2)'
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: deck.themeId === theme.id ? 700 : 500 }}>
                  {theme.name}
                </Typography>
              </Box>
              {deck.themeId === theme.id && <CheckIcon sx={{ fontSize: 16, color: '#ea580c' }} />}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* FIND & REPLACE DIALOG */}
      <Dialog
        open={findReplaceOpen}
        onClose={() => { setFindReplaceOpen(false); setReplaceCount(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Find and Replace (All Slides)
          </Typography>
          <CloseIcon
            sx={{ cursor: 'pointer', fontSize: 18 }}
            onClick={() => { setFindReplaceOpen(false); setReplaceCount(null); }}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 2 }}>
          <TextField
            size="small"
            label="Find text"
            fullWidth
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
          />
          <TextField
            size="small"
            label="Replace with"
            fullWidth
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
          {replaceCount !== null && (
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
              Replaced {replaceCount} occurrence{replaceCount === 1 ? '' : 's'} across the presentation.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => handleExecuteReplace(false)} disabled={!findText}>
            Replace
          </Button>
          <Button size="small" variant="contained" onClick={() => handleExecuteReplace(true)} disabled={!findText}>
            Replace All
          </Button>
        </DialogActions>
      </Dialog>

      {/* REPLACE FONTS DIALOG */}
      <Dialog
        open={replaceFontsOpen}
        onClose={() => setReplaceFontsOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Replace Fonts in Deck
          </Typography>
          <CloseIcon sx={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setReplaceFontsOpen(false)} />
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280', mb: 0.5, display: 'block' }}>
              Replace:
            </Typography>
            <select
              className="ppt-combo-select"
              style={{ width: '100%', height: 32 }}
              value={replaceFontFrom}
              onChange={(e) => setReplaceFontFrom(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280', mb: 0.5, display: 'block' }}>
              With:
            </Typography>
            <select
              className="ppt-combo-select"
              style={{ width: '100%', height: 32 }}
              value={replaceFontTo}
              onChange={(e) => setReplaceFontTo(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setReplaceFontsOpen(false)}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleExecuteReplaceFonts}>
            Replace
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD-INS MODAL */}
      <Dialog
        open={addinsOpen}
        onClose={() => setAddinsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
            Office PowerPoint Add-ins & Extension Tools
          </Typography>
          <CloseIcon sx={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setAddinsOpen(false)} />
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            {[
              { title: 'Unsplash Photos', desc: 'Search and insert high-res royalty-free presentation photography.', icon: '📷' },
              { title: 'Icons & Symbols', desc: 'Over 10,000 vector icons and presentation badges.', icon: '⭐' },
              { title: 'AI Slide Copilot', desc: 'Auto-generate talking points, bullet lists, and summary cards.', icon: '✨' },
              { title: 'Interactive Charts', desc: 'Bar charts, pie charts, and KPI financial progression graphs.', icon: '📊' }
            ].map((tool, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#ea580c', background: '#fff7ed' }
                }}
                onClick={() => setAddinsOpen(false)}
              >
                <Typography variant="h5" sx={{ mb: 0.5 }}>{tool.icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{tool.title}</Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>{tool.desc}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setAddinsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresentationToolbar;
