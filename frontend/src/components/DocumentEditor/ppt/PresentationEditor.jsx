import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import PresentationToolbar from './PresentationToolbar';
import SlideThumbnails from './SlideThumbnails';
import SlideCanvas from './SlideCanvas';
import SpeakerNotes from './SpeakerNotes';
import SlideLayoutDialog from './SlideLayoutDialog';
import SlideshowModal from './SlideshowModal';
import ShapeFormatBar from './ShapeFormatBar';
import { createShape } from './SlideShape';
import { SLIDE_THEMES, getInitialDeck } from './presentationConstants';
import '../PresentationEditor.css';

const MAX_HISTORY = 100;
const COALESCE_MS = 900;

const parseDeck = (content, docTitle) => {
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) return parsed;
    } catch {
      // Fallback to initial deck
    }
  }
  return getInitialDeck(docTitle);
};

const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const PresentationEditor = ({ content, docTitle, onChange, readOnly = false }) => {
  const [deck, setDeck] = useState(() => parseDeck(content, docTitle));
  const deckRef = useRef(deck);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const lastEditRef = useRef({ key: null, time: 0 });
  const batchOpenRef = useRef(false);
  const [historyLens, setHistoryLens] = useState({ undo: 0, redo: 0 });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const containerRef = useRef(null);
  const shapeClipboardRef = useRef(null);

  const safeIndex = Math.min(activeSlideIndex, deck.slides.length - 1);
  const activeSlide = deck.slides[safeIndex] || deck.slides[0];
  const activeTheme = useMemo(() => SLIDE_THEMES[deck.themeId] || SLIDE_THEMES.emeraldGradient, [deck.themeId]);
  const selectedShape = (activeSlide.shapes || []).find((s) => s.id === selectedShapeId) || null;

  const lastContentRef = useRef(content);
  // Synchronize when content changes externally (read mode, loading, switching docs)
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      lastContentRef.current = content;
      const parsed = parseDeck(content, docTitle);
      deckRef.current = parsed;
      setDeck(parsed);
      undoRef.current = [];
      redoRef.current = [];
    }
  }, [content, docTitle]);

  useEffect(() => {
    setSelectedShapeId(null);
  }, [safeIndex]);

  /**
   * Single write path. Always builds from deckRef so several updates in one handler stack correctly.
   * Updates made in the same tick form one undo step; rapid typing into the same field also coalesces.
   */
  const commit = useCallback((next, { record = true, coalesceKey } = {}) => {
    if (record) {
      const now = Date.now();
      const sameTyping = coalesceKey && lastEditRef.current.key === coalesceKey && now - lastEditRef.current.time < COALESCE_MS;
      if (!sameTyping && !batchOpenRef.current) {
        undoRef.current.push(deckRef.current);
        if (undoRef.current.length > MAX_HISTORY) undoRef.current.shift();
        redoRef.current = [];
        batchOpenRef.current = true;
        setTimeout(() => {
          batchOpenRef.current = false;
        }, 0);
      }
      lastEditRef.current = { key: coalesceKey || null, time: now };
    }
    deckRef.current = next;
    setDeck(next);
    setHistoryLens({ undo: undoRef.current.length, redo: redoRef.current.length });
    const serialized = JSON.stringify(next);
    lastContentRef.current = serialized;
    if (onChangeRef.current) onChangeRef.current(serialized);
  }, []);

  const updateDeck = useCallback((newDeck) => {
    if (readOnly) return;
    commit(newDeck);
  }, [commit, readOnly]);

  const undo = useCallback(() => {
    if (readOnly || !undoRef.current.length) return;
    redoRef.current.push(deckRef.current);
    lastEditRef.current = { key: null, time: 0 };
    commit(undoRef.current.pop(), { record: false });
  }, [commit, readOnly]);

  const redo = useCallback(() => {
    if (readOnly || !redoRef.current.length) return;
    undoRef.current.push(deckRef.current);
    lastEditRef.current = { key: null, time: 0 };
    commit(redoRef.current.pop(), { record: false });
  }, [commit, readOnly]);

  const indexRef = useRef(safeIndex);
  useEffect(() => {
    indexRef.current = safeIndex;
  }, [safeIndex]);

  const patchSlide = useCallback((index, patch, opts) => {
    if (readOnly) return;
    const d = deckRef.current;
    const slides = [...d.slides];
    slides[index] = { ...slides[index], ...patch };
    commit({ ...d, slides }, opts);
  }, [commit, readOnly]);

  const patchShape = useCallback((shapeId, patch, opts = {}) => {
    const d = deckRef.current;
    const slide = d.slides[indexRef.current];
    const shapes = (slide.shapes || []).map((s) => (s.id === shapeId ? { ...s, ...patch } : s));
    patchSlide(indexRef.current, { shapes }, { coalesceKey: opts.coalesce });
  }, [patchSlide]);

  // Toolbar API: update one field (or an object of fields) on the active slide.
  // Shape fill/outline also restyle the selected shape, like PowerPoint's Drawing group.
  const updateActiveSlide = useCallback((field, value) => {
    if (readOnly) return;
    const patch = typeof field === 'object' ? field : { [field]: value };
    const typingFields = ['title', 'subtitle', 'notes', 'bullets', 'leftColumn', 'rightColumn', 'col1Text', 'col2Text', 'col3Text',
      'col1Title', 'col2Title', 'col3Title', 'metricNumber', 'metricLabel', 'metricDesc', 'quoteText', 'quoteAuthor', 'quoteRole', 'mediaUrl'];
    const key = typeof field === 'string' && typingFields.includes(field) ? `slide-${indexRef.current}-${field}` : undefined;
    patchSlide(indexRef.current, patch, { coalesceKey: key });
    if (selectedShapeId && (patch.shapeFill || patch.shapeOutline)) {
      patchShape(selectedShapeId, {
        ...(patch.shapeFill ? { fill: patch.shapeFill } : {}),
        ...(patch.shapeOutline ? { stroke: patch.shapeOutline } : {})
      });
    }
  }, [readOnly, patchSlide, patchShape, selectedShapeId]);

  const handleThemeChange = (newThemeId) => updateDeck({ ...deckRef.current, themeId: newThemeId });

  const handleLayoutChange = (newLayout) => patchSlide(indexRef.current, { layout: newLayout });

  const handleAddSlideWithLayout = (layoutId) => {
    if (readOnly) return;
    const newSlide = {
      id: newId('slide'),
      layout: layoutId,
      title: 'Click to add title',
      subtitle: layoutId === 'title' ? 'Click to add subtitle' : '',
      bullets: layoutId === 'bullets' ? ['First key point', 'Second key point'] : undefined,
      col1Title: layoutId === 'three-column' ? 'Pillar 1' : 'Topic A',
      col2Title: layoutId === 'three-column' ? 'Pillar 2' : 'Topic B',
      col3Title: 'Pillar 3',
      col1Text: 'Key details…',
      col2Text: 'Key details…',
      col3Text: 'Key details…',
      leftColumn: 'Details for the left side…',
      rightColumn: 'Details for the right side…',
      metricNumber: '100%',
      metricLabel: 'Key metric',
      metricDesc: 'Why this number matters.',
      quoteText: 'An inspiring quote or customer statement.',
      quoteAuthor: 'Name',
      quoteRole: 'Role, Company',
      notes: ''
    };
    const d = deckRef.current;
    const at = indexRef.current + 1;
    const slides = [...d.slides];
    slides.splice(at, 0, newSlide);
    commit({ ...d, slides });
    setActiveSlideIndex(at);
  };

  const handleDuplicateSlide = (index) => {
    if (readOnly) return;
    const d = deckRef.current;
    const src = d.slides[index];
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = newId('slide');
    (copy.shapes || []).forEach((s) => { s.id = newId('shape'); });
    const slides = [...d.slides];
    slides.splice(index + 1, 0, copy);
    commit({ ...d, slides });
    setActiveSlideIndex(index + 1);
  };

  const handleDeleteSlide = (index) => {
    const d = deckRef.current;
    if (readOnly || d.slides.length <= 1) return;
    const slides = d.slides.filter((_, i) => i !== index);
    commit({ ...d, slides });
    setActiveSlideIndex(Math.min(index, slides.length - 1));
  };

  const handleMoveSlide = (index, delta) => {
    if (readOnly) return;
    const d = deckRef.current;
    const target = index + delta;
    if (target < 0 || target >= d.slides.length) return;
    const slides = [...d.slides];
    [slides[index], slides[target]] = [slides[target], slides[index]];
    commit({ ...d, slides });
    setActiveSlideIndex(target);
  };

  // Drag-and-drop reorder from the thumbnail rail
  const handleReorderSlide = (from, to) => {
    if (readOnly || from === to) return;
    const d = deckRef.current;
    const slides = [...d.slides];
    const [moved] = slides.splice(from, 1);
    slides.splice(to, 0, moved);
    commit({ ...d, slides });
    setActiveSlideIndex(to);
  };

  // ── Shapes ──
  const handleAddShape = (shapeId) => {
    if (readOnly) return;
    const existing = activeSlide.shapes || [];
    const offset = (existing.length % 6) * 18;
    const shape = createShape(shapeId, activeTheme, { x: 360 + offset, y: 200 + offset });
    if (activeSlide.shapeFill && shape.fill !== 'transparent') shape.fill = activeSlide.shapeFill;
    if (activeSlide.shapeOutline && shape.stroke !== 'transparent') shape.stroke = activeSlide.shapeOutline;
    patchSlide(indexRef.current, { shapes: [...existing, shape] });
    setSelectedShapeId(shape.id);
  };

  const deleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    const slide = deckRef.current.slides[indexRef.current];
    patchSlide(indexRef.current, { shapes: (slide.shapes || []).filter((s) => s.id !== selectedShapeId) });
    setSelectedShapeId(null);
  }, [selectedShapeId, patchSlide]);

  const duplicateSelectedShape = useCallback(() => {
    const slide = deckRef.current.slides[indexRef.current];
    const src = (slide.shapes || []).find((s) => s.id === selectedShapeId);
    if (!src) return;
    const copy = { ...src, id: newId('shape'), x: src.x + 20, y: src.y + 20 };
    patchSlide(indexRef.current, { shapes: [...slide.shapes, copy] });
    setSelectedShapeId(copy.id);
  }, [selectedShapeId, patchSlide]);

  const arrangeSelectedShape = (where) => {
    const slide = deckRef.current.slides[indexRef.current];
    const shapes = [...(slide.shapes || [])];
    const i = shapes.findIndex((s) => s.id === selectedShapeId);
    if (i === -1) return;
    const [s] = shapes.splice(i, 1);
    if (where === 'front') shapes.push(s);
    else shapes.unshift(s);
    patchSlide(indexRef.current, { shapes });
  };

  const handleResetSlide = () => {
    patchSlide(indexRef.current, {
      fontFamily: undefined,
      fontSize: undefined,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isShadow: false,
      isStrike: false,
      letterSpacing: undefined,
      textAlign: 'left',
      textTransform: 'none',
      customColor: undefined,
      highlightColor: undefined,
      lineSpacing: undefined,
      shapes: []
    });
    setSelectedShapeId(null);
  };

  const handleStartPresentation = (fromStart = false) => {
    setSlideshowIndex(fromStart ? 0 : safeIndex);
    setIsPresenting(true);
  };

  // ── Keyboard: PowerPoint-style shortcuts when focus is not inside a text field ──
  const handleKeyDown = (e) => {
    const tag = e.target.tagName;
    const inText = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F5') {
      e.preventDefault();
      handleStartPresentation(!e.shiftKey);
      return;
    }
    if (inText || readOnly) {
      if (!inText && (e.key === 'ArrowDown' || e.key === 'PageDown')) setActiveSlideIndex((i) => Math.min(deck.slides.length - 1, i + 1));
      if (!inText && (e.key === 'ArrowUp' || e.key === 'PageUp')) setActiveSlideIndex((i) => Math.max(0, i - 1));
      return;
    }
    const k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (mod && k === 'd') {
      e.preventDefault();
      if (selectedShapeId) duplicateSelectedShape();
      else handleDuplicateSlide(safeIndex);
      return;
    }
    if (mod && k === 'c' && selectedShape) { shapeClipboardRef.current = selectedShape; return; }
    if (mod && k === 'v' && shapeClipboardRef.current) {
      e.preventDefault();
      const src = shapeClipboardRef.current;
      const copy = { ...src, id: newId('shape'), x: src.x + 20, y: src.y + 20 };
      shapeClipboardRef.current = copy;
      patchSlide(indexRef.current, { shapes: [...(activeSlide.shapes || []), copy] });
      setSelectedShapeId(copy.id);
      return;
    }
    if (mod && k === 'm') { e.preventDefault(); setLayoutDialogOpen(true); return; }

    if (selectedShape) {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedShape(); return; }
      if (e.key === 'Escape') { setSelectedShapeId(null); return; }
      const step = e.shiftKey ? 10 : 1;
      const nudge = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (nudge) {
        e.preventDefault();
        patchShape(selectedShape.id, { x: selectedShape.x + nudge[0], y: selectedShape.y + nudge[1] }, { coalesce: `nudge-${selectedShape.id}` });
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); setActiveSlideIndex((i) => Math.min(deck.slides.length - 1, i + 1)); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); setActiveSlideIndex((i) => Math.max(0, i - 1)); }
    if (e.key === 'Delete' && deck.slides.length > 1 && e.target.closest('.slide-thumbnails-rail, .ppt-thumbnails')) handleDeleteSlide(safeIndex);
  };

  return (
    <Box className="presentation-container" ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown} sx={{ outline: 'none' }}>
      {!readOnly && (
        <PresentationToolbar
          deck={deck}
          activeSlide={activeSlide}
          onThemeChange={handleThemeChange}
          onLayoutChange={handleLayoutChange}
          onOpenLayoutDialog={() => setLayoutDialogOpen(true)}
          onAddSlide={(layoutId) => handleAddSlideWithLayout(layoutId || 'bullets')}
          onUpdateSlide={updateActiveSlide}
          onAddShape={handleAddShape}
          onDuplicateSlide={() => handleDuplicateSlide(safeIndex)}
          onDeleteSlide={() => handleDeleteSlide(safeIndex)}
          onResetSlide={handleResetSlide}
          updateDeck={updateDeck}
          showNotes={showNotes}
          setShowNotes={setShowNotes}
          onStartPresentation={() => handleStartPresentation(false)}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyLens.undo > 0}
          canRedo={historyLens.redo > 0}
          readOnly={readOnly}
        />
      )}

      <Box className="presentation-workspace">
        <SlideThumbnails
          slides={deck.slides}
          activeSlideIndex={safeIndex}
          onSelectSlide={setActiveSlideIndex}
          onAddSlideClick={() => setLayoutDialogOpen(true)}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onMoveSlide={handleMoveSlide}
          onReorderSlide={handleReorderSlide}
          onStartPresentation={() => handleStartPresentation(false)}
          activeTheme={activeTheme}
          readOnly={readOnly}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
          {!readOnly && selectedShape && (
            <ShapeFormatBar
              shape={selectedShape}
              onChange={(patch) => patchShape(selectedShape.id, patch)}
              onArrange={arrangeSelectedShape}
              onDuplicate={duplicateSelectedShape}
              onDelete={deleteSelectedShape}
            />
          )}

          <SlideCanvas
            activeSlide={activeSlide}
            activeSlideIndex={safeIndex}
            totalSlides={deck.slides.length}
            activeTheme={activeTheme}
            updateActiveSlide={updateActiveSlide}
            selectedShapeId={selectedShapeId}
            onSelectShape={(id) => {
              setSelectedShapeId(id);
              // Keep keyboard shortcuts (Delete, arrows) working after clicking a shape
              if (id) containerRef.current?.focus({ preventScroll: true });
            }}
            onUpdateShape={patchShape}
            readOnly={readOnly}
          />

          {showNotes && (
            <SpeakerNotes
              notes={activeSlide.notes}
              slideIndex={safeIndex}
              onNotesChange={(val) => updateActiveSlide('notes', val)}
              onClose={() => setShowNotes(false)}
              readOnly={readOnly}
            />
          )}
        </Box>
      </Box>

      <SlideLayoutDialog
        open={layoutDialogOpen}
        onClose={() => setLayoutDialogOpen(false)}
        onSelectLayout={handleAddSlideWithLayout}
        currentLayoutId={activeSlide.layout}
      />

      <SlideshowModal
        open={isPresenting}
        onClose={() => setIsPresenting(false)}
        deck={deck}
        slideshowIndex={slideshowIndex}
        setSlideshowIndex={setSlideshowIndex}
        activeTheme={activeTheme}
      />
    </Box>
  );
};

export default PresentationEditor;
