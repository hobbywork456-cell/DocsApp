import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const SlideThumbnails = ({
  slides,
  activeSlideIndex,
  onSelectSlide,
  onAddSlideClick,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onStartPresentation,
  activeTheme,
  readOnly
}) => {
  return (
    <Box className="thumbnails-sidebar custom-scrollbar">
      <Box className="thumbnails-header">
        <Typography variant="caption" className="thumbnails-title">
          Slides ({slides.length})
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onStartPresentation && (
            <Tooltip title="Present Slideshow">
              <IconButton size="small" onClick={onStartPresentation} sx={{ color: '#c43e1c', p: '3px' }}>
                <PlayArrowIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {!readOnly && (
            <Tooltip title="Add New Slide">
              <IconButton size="small" onClick={onAddSlideClick} className="add-slide-btn">
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box className="thumbnails-list">
        {slides.map((slide, sIdx) => {
          const isSelected = sIdx === activeSlideIndex;

          return (
            <Box
              key={slide.id || sIdx}
              className={`thumbnail-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSlide(sIdx)}
            >
              {/* Slide Number */}
              <Typography className="thumbnail-num">
                {sIdx + 1}
              </Typography>

              {/* Scaled Preview Canvas */}
              <Box
                className="thumbnail-preview"
                style={{
                  background: activeTheme.bg,
                  color: activeTheme.textColor
                }}
              >
                <Typography className="preview-title" style={{ color: activeTheme.titleColor }}>
                  {slide.title || 'Untitled Slide'}
                </Typography>
                <Typography className="preview-sub" style={{ color: activeTheme.textColor }}>
                  {slide.layout ? `${slide.layout.toUpperCase()}` : ''}
                </Typography>
              </Box>

              {/* Slide Actions on Hover */}
              {!readOnly && (
                <Box className="thumbnail-actions" onClick={(e) => e.stopPropagation()}>
                  {sIdx > 0 && (
                    <Tooltip title="Move Up">
                      <IconButton size="small" onClick={() => onMoveSlide(sIdx, -1)} sx={{ p: '2px', color: '#fff' }}>
                        <ArrowUpwardIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {sIdx < slides.length - 1 && (
                    <Tooltip title="Move Down">
                      <IconButton size="small" onClick={() => onMoveSlide(sIdx, 1)} sx={{ p: '2px', color: '#fff' }}>
                        <ArrowDownwardIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Duplicate Slide">
                    <IconButton size="small" onClick={() => onDuplicateSlide(sIdx)} sx={{ p: '2px', color: '#fff' }}>
                      <ContentCopyIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  {slides.length > 1 && (
                    <Tooltip title="Delete Slide">
                      <IconButton size="small" onClick={() => onDeleteSlide(sIdx)} sx={{ p: '2px', color: '#f87171' }}>
                        <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SlideThumbnails;
