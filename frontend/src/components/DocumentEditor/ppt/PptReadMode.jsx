import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Chip
} from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import SlideCanvas from './SlideCanvas';
import SlideThumbnails from './SlideThumbnails';
import SlideshowModal from './SlideshowModal';
import { SLIDE_THEMES, getInitialDeck } from './presentationConstants';
import { downloadPptAsPdf, downloadPptAsPptx } from '../../../utils/documentExporter';

const PptReadMode = ({
  doc,
  isDarkMode,
  onClose
}) => {
  // Parse presentation deck
  const deck = useMemo(() => {
    if (doc?.content) {
      try {
        const parsed = JSON.parse(doc.content);
        if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return getInitialDeck(doc?.title || 'Executive Presentation');
  }, [doc]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const activeSlide = useMemo(() => {
    return deck.slides[activeSlideIndex] || deck.slides[0];
  }, [deck, activeSlideIndex]);

  const activeTheme = useMemo(() => {
    return SLIDE_THEMES[deck.themeId] || SLIDE_THEMES.emeraldGradient;
  }, [deck.themeId]);

  // Keyboard navigation for presentation slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPresenting) return; // Handled by SlideshowModal

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setActiveSlideIndex((prev) => Math.min(deck.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setActiveSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'p' || e.key === 'P') {
        setSlideshowIndex(activeSlideIndex);
        setIsPresenting(true);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck.slides.length, isPresenting, activeSlideIndex, onClose]);

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => Math.min(deck.slides.length - 1, prev + 1));
  };

  const handleStartSlideshow = () => {
    setSlideshowIndex(activeSlideIndex);
    setIsPresenting(true);
  };

  const handleDownloadPdf = () => {
    downloadPptAsPdf(doc?.title || 'Presentation', doc?.content);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDarkMode ? '#0b1120' : '#f1f5f9',
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 1,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        {/* Left: Presentation Icon + Title + Read Mode Pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '8px',
              bgcolor: 'rgba(234, 88, 12, 0.12)',
              color: '#ea580c',
              flexShrink: 0
            }}
          >
            <SlideshowIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2
              }}
            >
              {doc?.title || 'Presentation'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
              Slide Deck Viewer • Read Mode
            </Typography>
          </Box>
          <Chip
            label="PPT Read Mode"
            size="small"
            sx={{
              bgcolor: 'rgba(234, 88, 12, 0.12)',
              color: '#ea580c',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
              display: { xs: 'none', sm: 'inline-flex' }
            }}
          />
        </Box>

        {/* Center: Slide Controls (Previous / Slide Counter / Next) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Previous Slide (← / Arrow Left)">
            <span>
              <IconButton
                size="small"
                onClick={handlePrevSlide}
                disabled={activeSlideIndex === 0}
                sx={{
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  border: '1px solid',
                  borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                  '&.Mui-disabled': { opacity: 0.3 }
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </span>
          </Tooltip>

          <Chip
            size="small"
            label={`Slide ${activeSlideIndex + 1} of ${deck.slides.length}`}
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: isDarkMode ? '#334155' : '#e2e8f0',
              color: isDarkMode ? '#f8fafc' : '#334155',
              px: 0.5
            }}
          />

          <Tooltip title="Next Slide (→ / Space / Enter)">
            <span>
              <IconButton
                size="small"
                onClick={handleNextSlide}
                disabled={activeSlideIndex === deck.slides.length - 1}
                sx={{
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  border: '1px solid',
                  borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                  '&.Mui-disabled': { opacity: 0.3 }
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Right: Present & Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
            onClick={handleStartSlideshow}
            sx={{
              bgcolor: '#c43e1c !important',
              color: '#ffffff !important',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              borderRadius: '8px',
              px: 1.5,
              py: 0.4,
              boxShadow: '0 2px 8px rgba(196, 62, 28, 0.35)',
              '&:hover': {
                bgcolor: '#9a3412 !important',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.15s ease'
            }}
          >
            Present
          </Button>

          <Tooltip title="Download PDF">
            <IconButton
              size="small"
              onClick={handleDownloadPdf}
              sx={{
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: '#ef4444',
                border: '1px solid',
                borderColor: isDarkMode ? '#334155' : '#cbd5e1'
              }}
            >
              <PictureAsPdfIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exit Read Mode">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                bgcolor: '#fee2e2',
                color: '#ef4444',
                '&:hover': { bgcolor: '#fecaca', transform: 'translateY(-1px)' },
                transition: 'all 0.15s ease'
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Slide Reading Workspace */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left Thumbnails Strip */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: 220, flexShrink: 0, height: '100%' }}>
          <SlideThumbnails
            slides={deck.slides}
            activeSlideIndex={activeSlideIndex}
            onSelectSlide={setActiveSlideIndex}
            onStartPresentation={handleStartSlideshow}
            activeTheme={activeTheme}
            readOnly={true}
          />
        </Box>

        {/* Center Canvas */}
        <Box sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <SlideCanvas
            activeSlide={activeSlide}
            activeSlideIndex={activeSlideIndex}
            totalSlides={deck.slides.length}
            activeTheme={activeTheme}
            readOnly={true}
          />
        </Box>
      </Box>

      {/* Fullscreen Slideshow Presentation Modal */}
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

export default PptReadMode;
