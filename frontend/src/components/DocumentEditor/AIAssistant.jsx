import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Paper, Box, Typography, IconButton, Menu, MenuItem, TextField, CircularProgress, Button, Tooltip, Divider, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TuneIcon from '@mui/icons-material/Tune';
import SendIcon from '@mui/icons-material/Send';
const AIAssistant = ({
  open,
  onClose,
  aiModel,
  setAiModel,
  aiPrompt,
  setAiPrompt,
  aiResult,
  isAiLoading,
  onGenerate,
  onInsert
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleModelMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleModelMenuClose = () => setAnchorEl(null);

  const handleModelSelect = (modelValue) => {
    setAiModel(modelValue);
    handleModelMenuClose();
  };

  const handleCopy = () => {
    // Strip HTML tags for clean copying if needed, but since it's rich text we copy as is
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = aiResult;
    navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getModelLabel = () => {
    switch (aiModel) {
      case 'gemma-4-26b-a4b-it': return 'Gemma 4 26B (Reliable)';
      case 'gemma-4-31b-it': return 'Gemma 4 31B';
      case 'gemini-3.8-flash': return 'Gemini 3.8 Flash (Fastest)';
      case 'gemini-3.6-flash': return 'Gemini 3.6 Flash';
      case 'gemini-flash-lite-latest': return 'Gemini Flash Lite';
      case 'deep-research-preview-04-2026': return 'Deep Research';
      default: return 'AI Model';
    }
  };

  return (
    <Draggable handle=".ai-drag-handle" bounds="body">
      <Paper 
        elevation={24}
        className="bg-white/95 dark:bg-gray-900/95"
        sx={{ 
          position: 'fixed', 
          bottom: 24,
          right: 24,
          left: 'auto',
          width: 380,
          height: 560,
          zIndex: 99999, 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'rgba(66,124,54,0.2)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          transition: 'width 0.3s, height 0.3s, top 0.3s, left 0.3s, bottom 0.3s, right 0.3s'
        }}
      >
        {/* Header / Drag Handle */}
        <Box 
          className="ai-drag-handle" 
          sx={{ 
            p: 1.5, 
            background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)',
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
            boxShadow: '0 4px 12px rgba(66,124,54,0.2)'
          }}
        >
          <Typography sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, fontSize: '15px', letterSpacing: '0.02em' }}>
            <AutoAwesomeIcon fontSize="small" /> AI Assistant
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title={`Current Model: ${getModelLabel()}`}>
              <IconButton size="small" onClick={handleModelMenuOpen} sx={{ color: 'white', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'white', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* AI Model Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleModelMenuClose}
          PaperProps={{ sx: { width: 250, mt: 1, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
        >
          <MenuItem selected={aiModel === 'gemma-4-26b-a4b-it'} onClick={() => handleModelSelect('gemma-4-26b-a4b-it')} sx={{ fontSize: '13px', fontWeight: 600 }}>Gemma 4 26B (Reliable)</MenuItem>
          <MenuItem selected={aiModel === 'gemma-4-31b-it'} onClick={() => handleModelSelect('gemma-4-31b-it')} sx={{ fontSize: '13px', fontWeight: 600 }}>Gemma 4 31B</MenuItem>
          <MenuItem selected={aiModel === 'gemini-3.8-flash'} onClick={() => handleModelSelect('gemini-3.8-flash')} sx={{ fontSize: '13px', fontWeight: 600 }}>Gemini 3.8 Flash (Fastest)</MenuItem>
          <MenuItem selected={aiModel === 'gemini-3.6-flash'} onClick={() => handleModelSelect('gemini-3.6-flash')} sx={{ fontSize: '13px', fontWeight: 600 }}>Gemini 3.6 Flash</MenuItem>
          <MenuItem selected={aiModel === 'gemini-flash-lite-latest'} onClick={() => handleModelSelect('gemini-flash-lite-latest')} sx={{ fontSize: '13px', fontWeight: 600 }}>Gemini Flash Lite</MenuItem>
          <MenuItem selected={aiModel === 'deep-research-preview-04-2026'} onClick={() => handleModelSelect('deep-research-preview-04-2026')} sx={{ fontSize: '13px', fontWeight: 600 }}>Deep Research (Preview)</MenuItem>
        </Menu>

        {/* Content Area */}
        <Box className="bg-transparent dark:bg-transparent" sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
          
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder="Ask the AI to draft content..."
              variant="outlined"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (aiPrompt.trim() && !isAiLoading) {
                    onGenerate();
                  }
                }
              }}
              disabled={isAiLoading}
              InputProps={{
                className: 'bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100',
                sx: { fontSize: '14px', py: 1.5, px: 2, borderRadius: '12px', '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' } }
              }}
            />
            <Button
              variant="contained"
              onClick={onGenerate}
              disabled={!aiPrompt.trim() || isAiLoading}
              sx={{
                minWidth: '100px',
                height: '46px',
                background: aiPrompt.trim() ? 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)' : '#e5e7eb',
                color: aiPrompt.trim() ? 'white' : '#9ca3af',
                '&:hover': { background: aiPrompt.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #326127 100%)' : '#e5e7eb' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '12px',
                boxShadow: aiPrompt.trim() ? '0 4px 10px rgba(66,124,54,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {isAiLoading ? <CircularProgress size={18} color="inherit" /> : <><SendIcon fontSize="small" /> Submit</>}
            </Button>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(0,0,0,0.05)' }} className="dark:border-gray-700" />

          {!aiResult && (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 48, color: '#427c36', mb: 2, opacity: 0.3 }} />
              <Typography variant="body2" sx={{ mb: 3 }} className="text-gray-500 dark:text-gray-400 font-medium">
                Ask the AI to draft content, fix grammar, summarize, or generate ideas.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {['Summarize this document', 'Fix grammar & spelling', 'Make it professional', 'Generate an outline'].map(suggestion => (
                  <Chip
                    key={suggestion}
                    label={suggestion}
                    onClick={() => setAiPrompt(suggestion)}
                    sx={{ 
                      bgcolor: 'rgba(66,124,54,0.08)', 
                      color: '#427c36',
                      fontWeight: 600,
                      fontSize: '12px',
                      '&:hover': { bgcolor: 'rgba(66,124,54,0.15)' }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {aiResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <Box 
                className="bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                sx={{ 
                  p: 2, 
                  borderRadius: '12px', 
                  fontSize: '14px', 
                  flexGrow: 1,
                  overflowY: 'auto',
                  border: '1px solid',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }} 
              >
                <div className="custom-quill" dangerouslySetInnerHTML={{ __html: aiResult }} />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button 
                  size="small" 
                  variant="contained" 
                  startIcon={<CheckIcon />}
                  onClick={onInsert}
                  sx={{ 
                    background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #3b82f6 0%, #326127 100%)', boxShadow: '0 4px 12px rgba(66,124,54,0.3)' },
                    textTransform: 'none', 
                    fontWeight: 700,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(66,124,54,0.2)'
                  }}
                >
                  Add to page
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={handleCopy}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy text'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Draggable>
  );
};

export default AIAssistant;
