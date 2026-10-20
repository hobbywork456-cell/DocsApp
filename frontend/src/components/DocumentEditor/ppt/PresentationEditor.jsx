import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import PresentationToolbar from './PresentationToolbar';
import SlideThumbnails from './SlideThumbnails';
import SlideCanvas from './SlideCanvas';
import SpeakerNotes from './SpeakerNotes';
import SlideLayoutDialog from './SlideLayoutDialog';
import SlideshowModal from './SlideshowModal';
import { SLIDE_THEMES, getInitialDeck } from './presentationConstants';
import '../PresentationEditor.css';

const PresentationEditor = ({ content, docTitle, onChange, readOnly = false }) => {
  // Parse or initialize deck
  const [deck, setDeck] = useState(() => {
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to initial deck
      }
    }
    return getInitialDeck(docTitle);
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);

  const activeSlide = useMemo(() => {
    return deck.slides[activeSlideIndex] || deck.slides[0];
  }, [deck, activeSlideIndex]);

  const activeTheme = useMemo(() => {
    return SLIDE_THEMES[deck.themeId] || SLIDE_THEMES.emeraldGradient;
  }, [deck.themeId]);

  const lastContentRef = useRef(content);

  // Synchronize when content prop changes externally (e.g. read mode, loading, switching docs)
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      lastContentRef.current = content;
      try {
        const parsed = JSON.parse(content);
        if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          setDeck(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, [content]);

  // Update deck & notify parent for persistence
  const updateDeck = useCallback((newDeck) => {
    setDeck(newDeck);
    if (onChange) {
      const serialized = JSON.stringify(newDeck);
      lastContentRef.current = serialized;
      onChange(serialized);
    }
  }, [onChange]);

  // Change theme
  const handleThemeChange = (newThemeId) => {
    if (readOnly) return;
    updateDeck({
      ...deck,
      themeId: newThemeId
    });
  };

  // Change active slide layout
  const handleLayoutChange = (newLayout) => {
    if (readOnly) return;
    const updatedSlides = [...deck.slides];
    updatedSlides[activeSlideIndex] = {
      ...updatedSlides[activeSlideIndex],
      layout: newLayout
    };
    updateDeck({
      ...deck,
      slides: updatedSlides
    });
  };

  // Update field of active slide
  const updateActiveSlide = (field, value) => {
    if (readOnly) return;
    const updatedSlides = [...deck.slides];
    updatedSlides[activeSlideIndex] = {
      ...updatedSlides[activeSlideIndex],
      [field]: value
    };
    updateDeck({
      ...deck,
      slides: updatedSlides
    });
  };

  // Add new slide with a chosen layout
  const handleAddSlideWithLayout = (layoutId) => {
    if (readOnly) return;
    const newSlideId = `slide_${Date.now()}`;
    const newSlide = {
      id: newSlideId,
      layout: layoutId,
      title: 'New Slide Title',
      subtitle: 'Slide description and talking points',
      bullets: layoutId === 'bullets' ? ['First bullet point', 'Second bullet point'] : undefined,
      col1Title: layoutId === 'three-column' ? 'Pillar 1' : 'Topic A',
      col2Title: layoutId === 'three-column' ? 'Pillar 2' : 'Topic B',
      col3Title: 'Pillar 3',
      col1Text: 'Description and key details...',
      col2Text: 'Description and key details...',
      col3Text: 'Description and key details...',
      leftColumn: 'Details for left side...',
      rightColumn: 'Details for right side...',
      metricNumber: '100%',
      metricLabel: 'Key Metric Indicator',
      metricDesc: 'Metric significance and impact summary.',
      quoteText: 'Inspiring quote or key customer feedback statement.',
      quoteAuthor: 'Customer Name',
      quoteRole: 'CEO, Company',
      notes: ''
    };

    const newIndex = activeSlideIndex + 1;
    const updatedSlides = [...deck.slides];
    updatedSlides.splice(newIndex, 0, newSlide);

    updateDeck({
      ...deck,
      slides: updatedSlides
    });
    setActiveSlideIndex(newIndex);
  };

  // Duplicate slide
  const handleDuplicateSlide = (index) => {
    if (readOnly) return;
    const slideToDup = deck.slides[index];
    const duplicated = {
      ...slideToDup,
      id: `slide_${Date.now()}`,
      title: `${slideToDup.title || 'Slide'} (Copy)`
    };

    const updatedSlides = [...deck.slides];
    updatedSlides.splice(index + 1, 0, duplicated);

    updateDeck({
      ...deck,
      slides: updatedSlides
    });
    setActiveSlideIndex(index + 1);
  };

  // Delete slide
  const handleDeleteSlide = (index) => {
    if (readOnly || deck.slides.length <= 1) return;
    const updatedSlides = deck.slides.filter((_, i) => i !== index);
    const nextIndex = Math.min(activeSlideIndex, updatedSlides.length - 1);

    updateDeck({
      ...deck,
      slides: updatedSlides
    });
    setActiveSlideIndex(nextIndex);
  };

  // Move slide up or down
  const handleMoveSlide = (index, delta) => {
    if (readOnly) return;
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= deck.slides.length) return;

    const updatedSlides = [...deck.slides];
    const temp = updatedSlides[index];
    updatedSlides[index] = updatedSlides[targetIndex];
    updatedSlides[targetIndex] = temp;

    updateDeck({
      ...deck,
      slides: updatedSlides
    });
    setActiveSlideIndex(targetIndex);
  };

  // Add Shape to Active Slide
  const handleAddShape = (shapeId) => {
    if (readOnly) return;
    const newShape = {
      id: `shape_${Date.now()}`,
      type: shapeId,
      x: 70,
      y: 90,
      width: shapeId === 'textbox' ? 220 : 130,
      height: shapeId === 'textbox' ? 70 : 80,
      fill: activeSlide.shapeFill || activeTheme.cardBg,
      stroke: activeSlide.shapeOutline || activeTheme.accentColor,
      strokeWidth: 2,
      text: shapeId === 'textbox' ? 'Click to add text' : '',
      shadow: true
    };
    const existingShapes = activeSlide.shapes || [];
    updateActiveSlide('shapes', [...existingShapes, newShape]);
  };

  // Reset Slide Formatting
  const handleResetSlide = () => {
    if (readOnly) return;
    const updatedSlides = [...deck.slides];
    const current = updatedSlides[activeSlideIndex];
    updatedSlides[activeSlideIndex] = {
      ...current,
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
    };
    updateDeck({
      ...deck,
      slides: updatedSlides
    });
  };

  // Start presentation slideshow
  const handleStartPresentation = () => {
    setSlideshowIndex(activeSlideIndex);
    setIsPresenting(true);
  };

  return (
    <Box className="presentation-container">
      {/* PRESENTATION RIBBON TOOLBAR - ONLY SHOWN IN EDIT MODE */}
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
          onDuplicateSlide={() => handleDuplicateSlide(activeSlideIndex)}
          onDeleteSlide={() => handleDeleteSlide(activeSlideIndex)}
          onResetSlide={handleResetSlide}
          updateDeck={updateDeck}
          showNotes={showNotes}
          setShowNotes={setShowNotes}
          onStartPresentation={handleStartPresentation}
          readOnly={readOnly}
        />
      )}

      {/* WORKSPACE AREA: THUMBNAILS + SLIDE CANVAS */}
      <Box className="presentation-workspace">
        <SlideThumbnails
          slides={deck.slides}
          activeSlideIndex={activeSlideIndex}
          onSelectSlide={setActiveSlideIndex}
          onAddSlideClick={() => setLayoutDialogOpen(true)}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onMoveSlide={handleMoveSlide}
          onStartPresentation={handleStartPresentation}
          activeTheme={activeTheme}
          readOnly={readOnly}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
          <SlideCanvas
            activeSlide={activeSlide}
            activeSlideIndex={activeSlideIndex}
            totalSlides={deck.slides.length}
            activeTheme={activeTheme}
            updateActiveSlide={updateActiveSlide}
            readOnly={readOnly}
          />

          {showNotes && (
            <SpeakerNotes
              notes={activeSlide.notes}
              slideIndex={activeSlideIndex}
              onNotesChange={(val) => updateActiveSlide('notes', val)}
              onClose={() => setShowNotes(false)}
              readOnly={readOnly}
            />
          )}
        </Box>
      </Box>

      {/* VISUAL SLIDE LAYOUT PICKER DIALOG */}
      <SlideLayoutDialog
        open={layoutDialogOpen}
        onClose={() => setLayoutDialogOpen(false)}
        onSelectLayout={handleAddSlideWithLayout}
        currentLayoutId={activeSlide.layout}
      />

      {/* FULLSCREEN PRESENTATION SLIDESHOW */}
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
