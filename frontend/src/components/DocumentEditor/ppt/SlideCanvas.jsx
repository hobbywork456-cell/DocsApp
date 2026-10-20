import React from 'react';
import { Box, Typography, IconButton, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import CloseIcon from '@mui/icons-material/Close';

const SlideCanvas = ({
  activeSlide,
  activeSlideIndex,
  totalSlides,
  activeTheme,
  updateActiveSlide,
  readOnly
}) => {
  if (!activeSlide) return null;

  const handleBulletChange = (bIdx, text) => {
    const bullets = [...(activeSlide.bullets || [])];
    bullets[bIdx] = text;
    updateActiveSlide('bullets', bullets);
  };

  const handleAddBullet = () => {
    const bullets = [...(activeSlide.bullets || []), 'New key point or milestone'];
    updateActiveSlide('bullets', bullets);
  };

  const handleDeleteBullet = (bIdx) => {
    const bullets = (activeSlide.bullets || []).filter((_, i) => i !== bIdx);
    updateActiveSlide('bullets', bullets);
  };

  // Shape manipulations
  const handleUpdateShapeText = (shapeId, text) => {
    const shapes = (activeSlide.shapes || []).map((s) => (s.id === shapeId ? { ...s, text } : s));
    updateActiveSlide('shapes', shapes);
  };

  const handleDeleteShape = (shapeId) => {
    const shapes = (activeSlide.shapes || []).filter((s) => s.id !== shapeId);
    updateActiveSlide('shapes', shapes);
  };

  // Dynamic font & paragraph styling from activeSlide
  const slideTextStyle = {
    fontFamily: activeSlide.fontFamily || undefined,
    letterSpacing: activeSlide.letterSpacing || undefined,
    textAlign: activeSlide.textAlign || undefined,
    textTransform: activeSlide.textTransform || undefined,
    lineHeight: activeSlide.lineSpacing || undefined,
    textShadow: activeSlide.isShadow ? '2px 2px 4px rgba(0,0,0,0.7)' : undefined,
    fontWeight: activeSlide.isBold ? 700 : undefined,
    fontStyle: activeSlide.isItalic ? 'italic' : undefined,
    textDecoration: activeSlide.isUnderline && activeSlide.isStrike
      ? 'underline line-through'
      : activeSlide.isUnderline
      ? 'underline'
      : activeSlide.isStrike
      ? 'line-through'
      : undefined
  };

  const titleColor = activeSlide.customColor || activeTheme.titleColor;
  const bodyColor = activeSlide.customColor || activeTheme.textColor;
  const highlightStyle = activeSlide.highlightColor && activeSlide.highlightColor !== 'transparent'
    ? { backgroundColor: activeSlide.highlightColor }
    : {};

  return (
    <Box className="slide-stage-area">
      <Box
        className="presentation-slide-card"
        style={{
          background: activeTheme.bg,
          color: activeTheme.textColor,
          position: 'relative'
        }}
      >
        {/* Top-Right Slide Number / Layout Pill */}
        <Box className="slide-card-header">
          <Chip
            size="small"
            label={`${activeSlideIndex + 1} / ${totalSlides}`}
            className="slide-index-chip"
            style={{ color: activeTheme.textColor }}
          />
          <Chip
            size="small"
            label={activeSlide.layout ? activeSlide.layout.toUpperCase() : 'TITLE'}
            className="slide-index-chip"
            style={{ color: activeTheme.accentColor }}
          />
        </Box>

        {/* 1. TITLE LAYOUT */}
        {activeSlide.layout === 'title' && (
          <Box className="slide-content-layout layout-title-slide">
            <input
              type="text"
              className="slide-title-input"
              placeholder="Presentation Headline..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <input
              type="text"
              className="slide-subtitle-input"
              placeholder="Presentation Subtitle / Keynote Speaker..."
              value={activeSlide.subtitle || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('subtitle', e.target.value)}
            />
          </Box>
        )}

        {/* 2. BULLETS / AGENDA LAYOUT */}
        {activeSlide.layout === 'bullets' && (
          <Box className="slide-content-layout layout-bullets-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Slide Topic / Header..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <input
              type="text"
              className="slide-header-subtitle-input"
              placeholder="Context or summary..."
              value={activeSlide.subtitle || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('subtitle', e.target.value)}
            />
            <Box className="bullets-container custom-scrollbar">
              {(activeSlide.bullets || []).map((bullet, bIdx) => (
                <Box key={bIdx} className="bullet-item-row">
                  <span className="bullet-dot" style={{ backgroundColor: activeTheme.accentColor }} />
                  <input
                    type="text"
                    className="bullet-input"
                    value={bullet}
                    disabled={readOnly}
                    style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                    onChange={(e) => handleBulletChange(bIdx, e.target.value)}
                  />
                  {!readOnly && (
                    <IconButton size="small" onClick={() => handleDeleteBullet(bIdx)} className="delete-bullet-btn">
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              ))}
              {!readOnly && (
                <Button
                  size="small"
                  onClick={handleAddBullet}
                  startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  className="add-bullet-action"
                  sx={{ color: activeTheme.accentColor }}
                >
                  Add Bullet Point
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* 3. TWO COLUMNS LAYOUT */}
        {activeSlide.layout === 'two-column' && (
          <Box className="slide-content-layout layout-two-column-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Comparison / Dual Topic..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <Box className="two-column-grid">
              <Box className="column-box" style={{ background: activeTheme.cardBg }}>
                <input
                  type="text"
                  className="column-header-input"
                  placeholder="Column 1 Title..."
                  value={activeSlide.col1Title || 'Topic A'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                  onChange={(e) => updateActiveSlide('col1Title', e.target.value)}
                />
                <textarea
                  className="column-textarea"
                  placeholder="Details, key factors, or pros..."
                  value={activeSlide.leftColumn || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('leftColumn', e.target.value)}
                />
              </Box>
              <Box className="column-box" style={{ background: activeTheme.cardBg }}>
                <input
                  type="text"
                  className="column-header-input"
                  placeholder="Column 2 Title..."
                  value={activeSlide.col2Title || 'Topic B'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                  onChange={(e) => updateActiveSlide('col2Title', e.target.value)}
                />
                <textarea
                  className="column-textarea"
                  placeholder="Details, key factors, or alternatives..."
                  value={activeSlide.rightColumn || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('rightColumn', e.target.value)}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* 4. THREE COLUMNS / CARDS LAYOUT */}
        {activeSlide.layout === 'three-column' && (
          <Box className="slide-content-layout layout-three-column-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Features / Three Pillars / Roadmap..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <input
              type="text"
              className="slide-header-subtitle-input"
              placeholder="Overview statement..."
              value={activeSlide.subtitle || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('subtitle', e.target.value)}
            />
            <Box className="three-column-grid">
              <Box className="trio-card" style={{ background: activeTheme.cardBg }}>
                <input
                  type="text"
                  className="trio-card-title-input"
                  placeholder="Pillar 1..."
                  value={activeSlide.col1Title || 'Pillar 1'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                  onChange={(e) => updateActiveSlide('col1Title', e.target.value)}
                />
                <textarea
                  className="trio-card-textarea"
                  placeholder="Description of pillar 1..."
                  value={activeSlide.col1Text || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('col1Text', e.target.value)}
                />
              </Box>
              <Box className="trio-card" style={{ background: activeTheme.cardBg }}>
                <input
                  type="text"
                  className="trio-card-title-input"
                  placeholder="Pillar 2..."
                  value={activeSlide.col2Title || 'Pillar 2'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                  onChange={(e) => updateActiveSlide('col2Title', e.target.value)}
                />
                <textarea
                  className="trio-card-textarea"
                  placeholder="Description of pillar 2..."
                  value={activeSlide.col2Text || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('col2Text', e.target.value)}
                />
              </Box>
              <Box className="trio-card" style={{ background: activeTheme.cardBg }}>
                <input
                  type="text"
                  className="trio-card-title-input"
                  placeholder="Pillar 3..."
                  value={activeSlide.col3Title || 'Pillar 3'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                  onChange={(e) => updateActiveSlide('col3Title', e.target.value)}
                />
                <textarea
                  className="trio-card-textarea"
                  placeholder="Description of pillar 3..."
                  value={activeSlide.col3Text || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('col3Text', e.target.value)}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* 5. METRIC / BIG STAT LAYOUT */}
        {activeSlide.layout === 'metric' && (
          <Box className="slide-content-layout layout-metric-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Metric Header..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <Box className="metric-display-card" style={{ background: activeTheme.cardBg }}>
              <input
                type="text"
                className="metric-number-input"
                placeholder="99.9%"
                value={activeSlide.metricNumber || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                onChange={(e) => updateActiveSlide('metricNumber', e.target.value)}
              />
              <input
                type="text"
                className="metric-label-input"
                placeholder="Statistic Metric / Indicator Name..."
                value={activeSlide.metricLabel || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
                onChange={(e) => updateActiveSlide('metricLabel', e.target.value)}
              />
              <textarea
                className="metric-desc-textarea"
                placeholder="Explain the significance, context, and growth drivers..."
                value={activeSlide.metricDesc || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                onChange={(e) => updateActiveSlide('metricDesc', e.target.value)}
              />
            </Box>
          </Box>
        )}

        {/* 6. QUOTE LAYOUT */}
        {activeSlide.layout === 'quote' && (
          <Box className="slide-content-layout layout-quote-slide">
            <FormatQuoteIcon className="quote-giant-icon" style={{ color: activeTheme.accentColor }} />
            <textarea
              className="quote-text-textarea"
              placeholder="Inspiring quote, customer testimony, or leadership statement..."
              value={activeSlide.quoteText || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('quoteText', e.target.value)}
            />
            <Box className="quote-author-row">
              <input
                type="text"
                className="quote-author-input"
                placeholder="— Author Name"
                value={activeSlide.quoteAuthor || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, color: activeTheme.accentColor }}
                onChange={(e) => updateActiveSlide('quoteAuthor', e.target.value)}
              />
              <input
                type="text"
                className="quote-role-input"
                placeholder="Title, Organization"
                value={activeSlide.quoteRole || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                onChange={(e) => updateActiveSlide('quoteRole', e.target.value)}
              />
            </Box>
          </Box>
        )}

        {/* 7. SECTION DIVIDER LAYOUT */}
        {activeSlide.layout === 'section' && (
          <Box className="slide-content-layout layout-section-slide">
            <Box className="section-divider-bar" style={{ backgroundColor: activeTheme.accentColor }} />
            <input
              type="text"
              className="slide-title-input"
              placeholder="Section / Part Name..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <input
              type="text"
              className="slide-subtitle-input"
              placeholder="Section description or chapter objectives..."
              value={activeSlide.subtitle || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('subtitle', e.target.value)}
            />
          </Box>
        )}

        {/* 8. COMPARISON MATRIX LAYOUT */}
        {activeSlide.layout === 'comparison' && (
          <Box className="slide-content-layout layout-comparison-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Comparison Matrix / Options..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <Box className="two-column-grid">
              <Box className="column-box" style={{ background: activeTheme.cardBg, borderTop: `4px solid ${activeTheme.accentColor}` }}>
                <input
                  type="text"
                  className="column-header-input"
                  placeholder="Option A..."
                  value={activeSlide.col1Title || 'Option A'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: titleColor }}
                  onChange={(e) => updateActiveSlide('col1Title', e.target.value)}
                />
                <textarea
                  className="column-textarea"
                  placeholder="Pros, features, and advantages..."
                  value={activeSlide.leftColumn || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('leftColumn', e.target.value)}
                />
              </Box>
              <Box className="column-box" style={{ background: activeTheme.cardBg, borderTop: '4px solid #f59e0b' }}>
                <input
                  type="text"
                  className="column-header-input"
                  placeholder="Option B..."
                  value={activeSlide.col2Title || 'Option B'}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, color: titleColor }}
                  onChange={(e) => updateActiveSlide('col2Title', e.target.value)}
                />
                <textarea
                  className="column-textarea"
                  placeholder="Pros, features, and trade-offs..."
                  value={activeSlide.rightColumn || ''}
                  disabled={readOnly}
                  style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
                  onChange={(e) => updateActiveSlide('rightColumn', e.target.value)}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* 9. MEDIA & CAPTION LAYOUT */}
        {activeSlide.layout === 'media' && (
          <Box className="slide-content-layout layout-media-slide">
            <input
              type="text"
              className="slide-header-title-input"
              placeholder="Media Title..."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: titleColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
            <Box className="media-preview-container" style={{ background: activeTheme.cardBg }}>
              {activeSlide.mediaUrl ? (
                <img src={activeSlide.mediaUrl} alt="Slide Media" className="media-image-preview" />
              ) : (
                <Box className="media-placeholder">
                  <PermMediaIcon sx={{ fontSize: 44, color: activeTheme.accentColor, mb: 1, opacity: 0.8 }} />
                  <Typography variant="body2" style={{ color: activeTheme.textColor, opacity: 0.8 }}>
                    Paste an image URL below to display visual content on this slide
                  </Typography>
                </Box>
              )}
              <input
                type="text"
                className="media-url-input"
                placeholder="Image URL (e.g. https://images.unsplash.com/...)"
                value={activeSlide.mediaUrl || ''}
                disabled={readOnly}
                style={{ ...slideTextStyle, color: bodyColor }}
                onChange={(e) => updateActiveSlide('mediaUrl', e.target.value)}
              />
            </Box>
            <textarea
              className="media-caption-textarea"
              placeholder="Caption and contextual notes..."
              value={activeSlide.subtitle || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('subtitle', e.target.value)}
            />
          </Box>
        )}

        {/* 10. BLANK CANVAS LAYOUT */}
        {activeSlide.layout === 'blank' && (
          <Box className="slide-content-layout layout-blank-slide">
            <textarea
              className="blank-slide-textarea"
              placeholder="Freeform text canvas... Type any presentation notes, insert shapes or custom text boxes from the Drawing ribbon above."
              value={activeSlide.title || ''}
              disabled={readOnly}
              style={{ ...slideTextStyle, ...highlightStyle, color: bodyColor }}
              onChange={(e) => updateActiveSlide('title', e.target.value)}
            />
          </Box>
        )}

        {/* INSERTED SHAPES & TEXT BOXES FROM DRAWING RIBBON */}
        {(activeSlide.shapes || []).map((shape) => (
          <Box
            key={shape.id}
            sx={{
              position: 'absolute',
              left: `${shape.x || 60}px`,
              top: `${shape.y || 80}px`,
              width: `${shape.width || 140}px`,
              minHeight: `${shape.height || 60}px`,
              background: shape.fill || activeTheme.cardBg,
              border: `${shape.strokeWidth || 2}px solid ${shape.stroke || activeTheme.accentColor}`,
              borderRadius: shape.type === 'rounded_rect' ? '12px' : shape.type === 'oval' ? '50%' : '4px',
              boxShadow: shape.shadow ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
              zIndex: 10,
              transition: 'box-shadow 0.15s ease'
            }}
          >
            {shape.type === 'textbox' ? (
              <textarea
                value={shape.text || ''}
                placeholder="Type text in text box..."
                disabled={readOnly}
                onChange={(e) => handleUpdateShapeText(shape.id, e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '40px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: bodyColor,
                  fontFamily: activeSlide.fontFamily || 'inherit',
                  fontSize: activeSlide.fontSize ? `${activeSlide.fontSize}px` : '14px',
                  textAlign: activeSlide.textAlign || 'center',
                  fontWeight: activeSlide.isBold ? 700 : 400
                }}
              />
            ) : (
              <input
                type="text"
                value={shape.text || ''}
                placeholder={shape.type.toUpperCase()}
                disabled={readOnly}
                onChange={(e) => handleUpdateShapeText(shape.id, e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: bodyColor,
                  width: '100%',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              />
            )}
            {!readOnly && (
              <IconButton
                size="small"
                onClick={() => handleDeleteShape(shape.id)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  width: 18,
                  height: 18,
                  padding: 0,
                  '&:hover': { backgroundColor: '#dc2626' }
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SlideCanvas;
