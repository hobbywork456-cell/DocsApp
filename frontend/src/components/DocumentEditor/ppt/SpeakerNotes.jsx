import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
import CloseIcon from '@mui/icons-material/Close';

const SpeakerNotes = ({
  notes,
  slideIndex,
  onNotesChange,
  onClose,
  readOnly
}) => {
  return (
    <Box className="speaker-notes-panel">
      <Box className="notes-header">
        <Typography variant="caption" className="notes-title">
          <NotesIcon sx={{ fontSize: 15, mr: 0.5 }} /> Speaker Notes for Slide {slideIndex + 1}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
      <textarea
        className="notes-textarea"
        placeholder="Private presenter talking points, speaker cues, and prompts..."
        value={notes || ''}
        disabled={readOnly}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </Box>
  );
};

export default SpeakerNotes;
