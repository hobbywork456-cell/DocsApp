import React, { useState } from 'react';
import { Box, Tooltip, Popover, Typography } from '@mui/material';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import BlurOnIcon from '@mui/icons-material/BlurOn';

const SWATCHES = [
  'transparent', '#ffffff', '#f1f5f9', '#94a3b8', '#475569', '#0f172a',
  '#fee2e2', '#ef4444', '#b91c1c', '#ffedd5', '#f97316', '#c2410c',
  '#fef9c3', '#eab308', '#a16207', '#dcfce7', '#22c55e', '#15803d',
  '#dbeafe', '#3b82f6', '#1d4ed8', '#ede9fe', '#8b5cf6', '#6d28d9',
  '#fce7f3', '#ec4899', '#be185d', '#ccfbf1', '#14b8a6', '#0f766e'
];

const ColorPopover = ({ anchor, onClose, onPick, allowNone = true }) => (
  <Popover
    open={Boolean(anchor)}
    anchorEl={anchor}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    slotProps={{ paper: { sx: { p: 1.25, borderRadius: '10px' } } }}
  >
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: '6px' }}>
      {SWATCHES.filter((c) => allowNone || c !== 'transparent').map((c) => (
        <button
          key={c}
          type="button"
          title={c === 'transparent' ? 'No color' : c}
          onClick={() => { onPick(c); onClose(); }}
          className="shape-swatch"
          style={{
            background: c === 'transparent'
              ? 'linear-gradient(135deg, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)'
              : c
          }}
        />
      ))}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
      <Typography variant="caption" color="text.secondary">Custom</Typography>
      <input type="color" onChange={(e) => onPick(e.target.value)} style={{ width: 36, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
    </Box>
  </Popover>
);

const Btn = ({ title, active, onClick, children, danger }) => (
  <Tooltip title={title}>
    <button type="button" className={`shape-bar-btn${active ? ' active' : ''}${danger ? ' danger' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  </Tooltip>
);

const ShapeFormatBar = ({ shape, onChange, onArrange, onDuplicate, onDelete }) => {
  const [anchor, setAnchor] = useState(null);
  const [target, setTarget] = useState(null);
  if (!shape) return null;

  const open = (e, which) => {
    setAnchor(e.currentTarget);
    setTarget(which);
  };
  const isLine = shape.type === 'line' || shape.type === 'arrow';
  const size = shape.fontSize || 18;

  return (
    <Box className="shape-format-bar" onMouseDown={(e) => e.stopPropagation()}>
      <span className="shape-bar-label">Shape Format</span>
      {!isLine && (
        <Btn title="Shape fill" onClick={(e) => open(e, 'fill')}>
          <FormatColorFillIcon sx={{ fontSize: 16 }} />
          <span className="shape-bar-chip" style={{ background: shape.fill === 'transparent' ? '#fff' : shape.fill }} />
        </Btn>
      )}
      <Btn title={isLine ? 'Line color' : 'Shape outline'} onClick={(e) => open(e, 'stroke')}>
        <BorderColorIcon sx={{ fontSize: 16 }} />
        <span className="shape-bar-chip" style={{ background: shape.stroke === 'transparent' ? '#fff' : shape.stroke }} />
      </Btn>
      <select
        className="shape-bar-select"
        title="Outline weight"
        value={shape.strokeWidth || 2}
        onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 6, 8].map((w) => <option key={w} value={w}>{w}px</option>)}
      </select>
      <Btn title="Shadow" active={shape.shadow} onClick={() => onChange({ shadow: !shape.shadow })}>
        <BlurOnIcon sx={{ fontSize: 16 }} />
      </Btn>

      {!isLine && (
        <>
          <span className="shape-bar-sep" />
          <Btn title="Text color" onClick={(e) => open(e, 'color')}>
            <FormatColorTextIcon sx={{ fontSize: 16 }} />
            <span className="shape-bar-chip" style={{ background: shape.color || '#000' }} />
          </Btn>
          <Btn title="Decrease font size" onClick={() => onChange({ fontSize: Math.max(8, size - 2) })}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>A−</span>
          </Btn>
          <span className="shape-bar-size">{size}</span>
          <Btn title="Increase font size" onClick={() => onChange({ fontSize: Math.min(120, size + 2) })}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>A+</span>
          </Btn>
          <Btn title="Bold" active={shape.bold} onClick={() => onChange({ bold: !shape.bold })}><FormatBoldIcon sx={{ fontSize: 16 }} /></Btn>
          <Btn title="Italic" active={shape.italic} onClick={() => onChange({ italic: !shape.italic })}><FormatItalicIcon sx={{ fontSize: 16 }} /></Btn>
          <Btn title="Underline" active={shape.underline} onClick={() => onChange({ underline: !shape.underline })}><FormatUnderlinedIcon sx={{ fontSize: 16 }} /></Btn>
          <Btn title="Align left" active={shape.align === 'left'} onClick={() => onChange({ align: 'left' })}><FormatAlignLeftIcon sx={{ fontSize: 16 }} /></Btn>
          <Btn title="Center" active={!shape.align || shape.align === 'center'} onClick={() => onChange({ align: 'center' })}><FormatAlignCenterIcon sx={{ fontSize: 16 }} /></Btn>
          <Btn title="Align right" active={shape.align === 'right'} onClick={() => onChange({ align: 'right' })}><FormatAlignRightIcon sx={{ fontSize: 16 }} /></Btn>
        </>
      )}

      <span className="shape-bar-sep" />
      <Btn title="Bring to front" onClick={() => onArrange('front')}><FlipToFrontIcon sx={{ fontSize: 16 }} /></Btn>
      <Btn title="Send to back" onClick={() => onArrange('back')}><FlipToBackIcon sx={{ fontSize: 16 }} /></Btn>
      <Btn title="Duplicate (Ctrl+D)" onClick={onDuplicate}><ContentCopyIcon sx={{ fontSize: 15 }} /></Btn>
      <Btn title="Delete (Del)" danger onClick={onDelete}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></Btn>

      <span className="shape-bar-hint">Drag to move · Handles resize (Shift keeps ratio) · Double-click to type · Arrow keys nudge</span>

      <ColorPopover
        anchor={anchor}
        onClose={() => setAnchor(null)}
        allowNone={target !== 'color'}
        onPick={(c) => onChange({ [target]: c })}
      />
    </Box>
  );
};

export default ShapeFormatBar;
