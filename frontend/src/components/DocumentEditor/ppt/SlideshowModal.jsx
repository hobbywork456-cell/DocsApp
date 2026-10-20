import React, { useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Button,
  Divider
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

const SlideshowModal = ({
  open,
  onClose,
  deck,
  slideshowIndex,
  setSlideshowIndex,
  activeTheme
}) => {
  const currentSlide = deck.slides[slideshowIndex];

  // Slideshow keyboard navigation listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setSlideshowIndex(prev => Math.min(deck.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideshowIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, deck.slides.length, onClose, setSlideshowIndex]);

  if (!open || !currentSlide) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slotProps={{
        paper: {
          className: 'slideshow-dialog-paper'
        }
      }}
    >
      <Box
        className="slideshow-container"
        style={{
          background: activeTheme.bg,
          color: activeTheme.textColor
        }}
      >
        <Box className="slideshow-slide-content">
          {/* 1. TITLE LAYOUT */}
          {currentSlide.layout === 'title' && (
            <Box className="slideshow-center">
              <Typography variant="h2" className="slideshow-main-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Typography variant="h5" className="slideshow-sub-title" style={{ color: activeTheme.textColor }}>
                {currentSlide.subtitle}
              </Typography>
            </Box>
          )}

          {/* 2. BULLETS LAYOUT */}
          {currentSlide.layout === 'bullets' && (
            <Box className="slideshow-bullets-layout">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              {currentSlide.subtitle && (
                <Typography variant="h6" className="slideshow-slide-sub" style={{ color: activeTheme.textColor, opacity: 0.85 }}>
                  {currentSlide.subtitle}
                </Typography>
              )}
              <Box className="slideshow-bullets-list">
                {(currentSlide.bullets || []).map((b, bI) => (
                  <Box key={bI} className="slideshow-bullet-item">
                    <span className="slideshow-dot" style={{ backgroundColor: activeTheme.accentColor }} />
                    <Typography variant="h5" style={{ color: activeTheme.textColor }}>
                      {b}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* 3. TWO COLUMNS LAYOUT */}
          {currentSlide.layout === 'two-column' && (
            <Box className="slideshow-two-col-layout">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Box className="slideshow-columns">
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg }}>
                  <Typography variant="h5" style={{ fontWeight: 700, color: activeTheme.accentColor, marginBottom: 12 }}>
                    {currentSlide.col1Title || 'Topic A'}
                  </Typography>
                  <Typography variant="h6" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor }}>
                    {currentSlide.leftColumn}
                  </Typography>
                </Box>
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg }}>
                  <Typography variant="h5" style={{ fontWeight: 700, color: activeTheme.accentColor, marginBottom: 12 }}>
                    {currentSlide.col2Title || 'Topic B'}
                  </Typography>
                  <Typography variant="h6" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor }}>
                    {currentSlide.rightColumn}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* 4. THREE COLUMNS LAYOUT */}
          {currentSlide.layout === 'three-column' && (
            <Box className="slideshow-two-col-layout">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              {currentSlide.subtitle && (
                <Typography variant="h6" className="slideshow-slide-sub" style={{ color: activeTheme.textColor, opacity: 0.85 }}>
                  {currentSlide.subtitle}
                </Typography>
              )}
              <Box className="slideshow-trio-grid">
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg }}>
                  <Typography variant="h5" style={{ fontWeight: 700, color: activeTheme.accentColor, marginBottom: 10 }}>
                    {currentSlide.col1Title || 'Pillar 1'}
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor, fontSize: '1.15rem', lineHeight: 1.6 }}>
                    {currentSlide.col1Text}
                  </Typography>
                </Box>
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg }}>
                  <Typography variant="h5" style={{ fontWeight: 700, color: activeTheme.accentColor, marginBottom: 10 }}>
                    {currentSlide.col2Title || 'Pillar 2'}
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor, fontSize: '1.15rem', lineHeight: 1.6 }}>
                    {currentSlide.col2Text}
                  </Typography>
                </Box>
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg }}>
                  <Typography variant="h5" style={{ fontWeight: 700, color: activeTheme.accentColor, marginBottom: 10 }}>
                    {currentSlide.col3Title || 'Pillar 3'}
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor, fontSize: '1.15rem', lineHeight: 1.6 }}>
                    {currentSlide.col3Text}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* 5. METRIC LAYOUT */}
          {currentSlide.layout === 'metric' && (
            <Box className="slideshow-center">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Typography variant="h1" className="slideshow-giant-metric" style={{ color: activeTheme.accentColor, fontWeight: 900, fontSize: '6rem' }}>
                {currentSlide.metricNumber}
              </Typography>
              <Typography variant="h4" style={{ color: activeTheme.titleColor, fontWeight: 700, marginBottom: 12 }}>
                {currentSlide.metricLabel}
              </Typography>
              <Typography variant="h6" style={{ color: activeTheme.textColor, maxWidth: 800, textAlign: 'center', opacity: 0.9 }}>
                {currentSlide.metricDesc}
              </Typography>
            </Box>
          )}

          {/* 6. QUOTE LAYOUT */}
          {currentSlide.layout === 'quote' && (
            <Box className="slideshow-center">
              <FormatQuoteIcon sx={{ fontSize: 80, color: activeTheme.accentColor, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" style={{ color: activeTheme.titleColor, fontWeight: 600, fontStyle: 'italic', maxWidth: 900, textAlign: 'center', lineHeight: 1.4, mb: 4 }}>
                "{currentSlide.quoteText}"
              </Typography>
              <Typography variant="h5" style={{ color: activeTheme.accentColor, fontWeight: 700 }}>
                {currentSlide.quoteAuthor}
              </Typography>
              <Typography variant="h6" style={{ color: activeTheme.textColor, opacity: 0.85 }}>
                {currentSlide.quoteRole}
              </Typography>
            </Box>
          )}

          {/* 7. SECTION DIVIDER LAYOUT */}
          {currentSlide.layout === 'section' && (
            <Box className="slideshow-center">
              <Box sx={{ width: 80, height: 6, bgcolor: activeTheme.accentColor, borderRadius: 3, mb: 4 }} />
              <Typography variant="h2" className="slideshow-main-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Typography variant="h5" className="slideshow-sub-title" style={{ color: activeTheme.textColor }}>
                {currentSlide.subtitle}
              </Typography>
            </Box>
          )}

          {/* 8. COMPARISON LAYOUT */}
          {currentSlide.layout === 'comparison' && (
            <Box className="slideshow-two-col-layout">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Box className="slideshow-columns">
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg, borderTop: `6px solid ${activeTheme.accentColor}` }}>
                  <Typography variant="h4" style={{ fontWeight: 800, color: activeTheme.titleColor, marginBottom: 16 }}>
                    {currentSlide.col1Title || 'Option A'}
                  </Typography>
                  <Typography variant="h6" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor, lineHeight: 1.6 }}>
                    {currentSlide.leftColumn}
                  </Typography>
                </Box>
                <Box className="slideshow-col" style={{ background: activeTheme.cardBg, borderTop: '6px solid #f59e0b' }}>
                  <Typography variant="h4" style={{ fontWeight: 800, color: activeTheme.titleColor, marginBottom: 16 }}>
                    {currentSlide.col2Title || 'Option B'}
                  </Typography>
                  <Typography variant="h6" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor, lineHeight: 1.6 }}>
                    {currentSlide.rightColumn}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* 9. MEDIA LAYOUT */}
          {currentSlide.layout === 'media' && (
            <Box className="slideshow-two-col-layout">
              <Typography variant="h3" className="slideshow-slide-title" style={{ color: activeTheme.titleColor }}>
                {currentSlide.title}
              </Typography>
              <Box className="slideshow-media-container" style={{ background: activeTheme.cardBg }}>
                {currentSlide.mediaUrl && (
                  <img src={currentSlide.mediaUrl} alt="Slide Presentation Media" className="slideshow-media-img" />
                )}
                {currentSlide.subtitle && (
                  <Typography variant="h6" style={{ color: activeTheme.textColor, marginTop: 16, textAlign: 'center' }}>
                    {currentSlide.subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* 10. BLANK CANVAS */}
          {currentSlide.layout === 'blank' && (
            <Box className="slideshow-center">
              <Typography variant="h4" style={{ whiteSpace: 'pre-line', color: activeTheme.textColor }}>
                {currentSlide.title}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Floating Navigation Pill at bottom */}
        <Box className="slideshow-nav-bar">
          <IconButton
            size="small"
            onClick={() => setSlideshowIndex(prev => Math.max(0, prev - 1))}
            disabled={slideshowIndex === 0}
            sx={{ color: '#ffffff' }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <Typography variant="body2" className="slideshow-counter">
            {slideshowIndex + 1} / {deck.slides.length}
          </Typography>

          <IconButton
            size="small"
            onClick={() => setSlideshowIndex(prev => Math.min(deck.slides.length - 1, prev + 1))}
            disabled={slideshowIndex === deck.slides.length - 1}
            sx={{ color: '#ffffff' }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1 }} />

          <Button
            size="small"
            onClick={onClose}
            startIcon={<CloseIcon />}
            sx={{ color: '#ffffff', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Exit (Esc)
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default SlideshowModal;
