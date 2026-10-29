import React, { useRef, useState, useEffect } from 'react';

// Shapes are stored in a fixed 960×540 reference space and rendered with percentages,
// so the same deck looks identical in the editor, thumbnails, read mode and slideshow.
export const SLIDE_REF_WIDTH = 960;
export const SLIDE_REF_HEIGHT = 540;

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

// SVG geometry in a 0..100 box (stretched to the shape's frame)
export const SVG_SHAPES = {
  triangle: { type: 'polygon', points: '50,2 98,98 2,98' },
  right_arrow: { type: 'polygon', points: '2,30 62,30 62,4 98,50 62,96 62,70 2,70' },
  down_arrow: { type: 'polygon', points: '30,2 70,2 70,62 96,62 50,98 4,62 30,62' },
  star: { type: 'polygon', points: '50,3 61,37 97,37 68,59 79,95 50,73 21,95 32,59 3,37 39,37' },
  callout: { type: 'path', d: 'M6 2 H94 Q98 2 98 6 V66 Q98 70 94 70 H40 L22 96 L26 70 H6 Q2 70 2 66 V6 Q2 2 6 2 Z' },
  brackets: { type: 'path', d: 'M18 2 Q4 2 4 14 V86 Q4 98 18 98 M82 2 Q96 2 96 14 V86 Q96 98 82 98', open: true },
  line: { type: 'line', x1: 0, y1: 50, x2: 100, y2: 50 },
  arrow: { type: 'line', x1: 2, y1: 98, x2: 96, y2: 4, arrow: true }
};

export const createShape = (type, theme, overrides = {}) => {
  const isText = type === 'textbox';
  const isLine = type === 'line' || type === 'arrow';
  return {
    id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    x: 360,
    y: 200,
    width: isText ? 300 : isLine ? 220 : 180,
    height: isText ? 70 : type === 'line' ? 24 : isLine ? 120 : 120,
    fill: isText || isLine || type === 'brackets' ? 'transparent' : theme?.accentColor || '#2563eb',
    stroke: isText ? 'transparent' : isLine || type === 'brackets' ? theme?.accentColor || '#2563eb' : 'transparent',
    strokeWidth: isLine ? 3 : 2,
    text: isText ? 'Click to add text' : '',
    color: isText ? theme?.textColor || '#262b27' : '#ffffff',
    fontSize: isText ? 22 : 18,
    bold: false,
    italic: false,
    align: 'center',
    shadow: !isText && !isLine,
    ...overrides
  };
};

const pct = (v, total) => `${(v / total) * 100}%`;

const ShapeGeometry = ({ shape }) => {
  const fill = shape.fill || 'transparent';
  const stroke = shape.stroke && shape.stroke !== 'transparent' ? shape.stroke : 'none';
  const sw = shape.strokeWidth || 2;
  const geo = SVG_SHAPES[shape.type];
  if (!geo) return null;
  const common = { vectorEffect: 'non-scaling-stroke', strokeWidth: sw, stroke, strokeLinejoin: 'round' };
  const markerId = `arrowhead-${shape.id}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="slide-shape-svg">
      {geo.arrow && (
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={stroke === 'none' ? '#2563eb' : stroke} />
          </marker>
        </defs>
      )}
      {geo.type === 'polygon' && <polygon points={geo.points} fill={fill} {...common} />}
      {geo.type === 'path' && <path d={geo.d} fill={geo.open ? 'none' : fill} {...common} stroke={geo.open && stroke === 'none' ? fill : stroke} />}
      {geo.type === 'line' && (
        <line x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2} {...common} stroke={stroke === 'none' ? '#2563eb' : stroke}
          strokeLinecap="round" markerEnd={geo.arrow ? `url(#${markerId})` : undefined} />
      )}
    </svg>
  );
};

const SlideShape = ({
  shape,
  editable = false,
  selected = false,
  onSelect,
  onChange,         // (patch, { commit }) — commit=false for live drag previews
  layerRef,         // the slide layer, used to convert pixels to reference units
  defaultTextColor  // theme text color for shapes saved without an explicit color
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [live, setLive] = useState(null); // live geometry while dragging
  const textRef = useRef(null);

  useEffect(() => {
    if (!selected) setIsEditingText(false);
  }, [selected]);

  useEffect(() => {
    if (isEditingText && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [isEditingText]);

  const geo = live || shape;
  const usesBox = !SVG_SHAPES[shape.type];
  const isLine = shape.type === 'line' || shape.type === 'arrow';

  const startDrag = (e, mode) => {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    if (isEditingText && mode === 'move') return;
    e.preventDefault();
    onSelect?.(shape.id);
    const layer = layerRef?.current;
    const scale = layer ? layer.getBoundingClientRect().width / SLIDE_REF_WIDTH : 1;
    const start = { x: e.clientX, y: e.clientY };
    const orig = { x: shape.x || 0, y: shape.y || 0, width: shape.width || 140, height: shape.height || 60 };
    let latest = null;

    const move = (ev) => {
      const dx = (ev.clientX - start.x) / scale;
      const dy = (ev.clientY - start.y) / scale;
      let next = { ...orig };
      if (mode === 'move') {
        next.x = orig.x + dx;
        next.y = orig.y + dy;
      } else {
        if (mode.includes('e')) next.width = orig.width + dx;
        if (mode.includes('s')) next.height = orig.height + dy;
        if (mode.includes('w')) { next.width = orig.width - dx; next.x = orig.x + dx; }
        if (mode.includes('n')) { next.height = orig.height - dy; next.y = orig.y + dy; }
        // Shift keeps proportions, like PowerPoint
        if (ev.shiftKey && mode.length === 2) {
          const ratio = orig.width / orig.height;
          next.height = next.width / ratio;
          if (mode.includes('n')) next.y = orig.y + orig.height - next.height;
        }
        const min = isLine ? 4 : 20;
        if (next.width < 20) { if (mode.includes('w')) next.x = orig.x + orig.width - 20; next.width = 20; }
        if (next.height < min) { if (mode.includes('n')) next.y = orig.y + orig.height - min; next.height = min; }
      }
      // Keep at least part of the shape on the slide
      next.x = Math.max(-next.width + 20, Math.min(SLIDE_REF_WIDTH - 20, next.x));
      next.y = Math.max(-next.height + 20, Math.min(SLIDE_REF_HEIGHT - 20, next.y));
      next = { x: Math.round(next.x), y: Math.round(next.y), width: Math.round(next.width), height: Math.round(next.height) };
      latest = next;
      setLive(next);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (latest) onChange?.(latest, { commit: true });
      setLive(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const boxStyle = usesBox
    ? {
        background: shape.fill || 'transparent',
        border: shape.stroke && shape.stroke !== 'transparent' ? `${shape.strokeWidth || 2}px solid ${shape.stroke}` : 'none',
        borderRadius: shape.type === 'rounded_rect' ? '14%/22%' : shape.type === 'oval' ? '50%' : shape.type === 'textbox' ? 0 : 3
      }
    : {};

  const textStyle = {
    color: shape.color || defaultTextColor || 'inherit',
    fontSize: `calc(${shape.fontSize || 18} / ${SLIDE_REF_WIDTH} * 100cqw)`,
    fontWeight: shape.bold ? 700 : 400,
    fontStyle: shape.italic ? 'italic' : 'normal',
    textDecoration: shape.underline ? 'underline' : 'none',
    textAlign: shape.align || 'center',
    fontFamily: shape.fontFamily || 'inherit'
  };

  return (
    <div
      className={`slide-shape${editable ? ' editable' : ''}${selected ? ' selected' : ''}${shape.shadow ? ' has-shadow' : ''}`}
      style={{
        left: pct(geo.x || 0, SLIDE_REF_WIDTH),
        top: pct(geo.y || 0, SLIDE_REF_HEIGHT),
        width: pct(geo.width || 140, SLIDE_REF_WIDTH),
        height: pct(geo.height || 60, SLIDE_REF_HEIGHT),
        transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
        ...boxStyle
      }}
      onMouseDown={(e) => startDrag(e, 'move')}
      onDoubleClick={(e) => {
        if (!editable || isLine) return;
        e.stopPropagation();
        setIsEditingText(true);
      }}
    >
      {!usesBox && <ShapeGeometry shape={shape} />}

      {!isLine && (
        isEditingText ? (
          <textarea
            ref={textRef}
            className="slide-shape-text editing"
            style={textStyle}
            value={shape.text || ''}
            onChange={(e) => onChange?.({ text: e.target.value }, { commit: true, coalesce: `text-${shape.id}` })}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') setIsEditingText(false);
            }}
            onBlur={() => setIsEditingText(false)}
          />
        ) : (
          (shape.text || (editable && shape.type === 'textbox')) && (
            <div className={`slide-shape-text${!shape.text ? ' placeholder' : ''}`} style={textStyle}>
              {shape.text || 'Double-click to add text'}
            </div>
          )
        )
      )}

      {editable && selected && !isEditingText && HANDLES.map((h) => (
        <span key={h} className={`slide-shape-handle h-${h}`} onMouseDown={(e) => startDrag(e, h)} />
      ))}
    </div>
  );
};

// Overlay that hosts a slide's shapes. It ignores pointer events itself so the
// layout's own text fields underneath stay clickable; only the shapes are interactive.
export const SlideShapesLayer = ({ shapes = [], editable = false, selectedId, onSelect, onChangeShape, defaultTextColor }) => {
  const layerRef = useRef(null);
  if (!shapes.length) return null;
  return (
    <div ref={layerRef} className="slide-shapes-layer">
      {shapes.map((shape) => (
        <SlideShape
          key={shape.id}
          shape={shape}
          editable={editable}
          selected={selectedId === shape.id}
          onSelect={onSelect}
          onChange={(patch, opts) => onChangeShape?.(shape.id, patch, opts)}
          layerRef={layerRef}
          defaultTextColor={defaultTextColor}
        />
      ))}
    </div>
  );
};

export default SlideShape;
