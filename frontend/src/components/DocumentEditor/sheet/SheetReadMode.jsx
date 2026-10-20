import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Paper
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import SpreadsheetEditor from './SpreadsheetEditor';
import { downloadSheetAsXlsx, downloadSheetAsCsv } from '../../../utils/documentExporter';

const SheetReadMode = ({
  doc,
  isDarkMode,
  onClose
}) => {
  if (!doc) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownloadXlsx = () => {
    downloadSheetAsXlsx(doc.title || 'Spreadsheet', doc.content);
  };

  const handleDownloadCsv = () => {
    downloadSheetAsCsv(doc.title || 'Spreadsheet', doc.content);
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
        bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9',
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
        {/* Left: Sheet Icon + Title + Read Mode Pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '8px',
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              flexShrink: 0
            }}
          >
            <TableChartIcon sx={{ fontSize: 20 }} />
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
              {doc.title || 'Spreadsheet'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
              Interactive Spreadsheet Viewer • Read Mode
            </Typography>
          </Box>
          <Chip
            label="Sheet Read Mode"
            size="small"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
              display: { xs: 'none', sm: 'inline-flex' }
            }}
          />
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Download Excel (.xlsx)">
            <IconButton
              size="small"
              onClick={handleDownloadXlsx}
              sx={{
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: '#059669',
                border: '1px solid',
                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' }
              }}
            >
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download CSV (.csv)">
            <IconButton
              size="small"
              onClick={handleDownloadCsv}
              sx={{
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: '#0284c7',
                border: '1px solid',
                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.1)' }
              }}
            >
              <TableChartIcon sx={{ fontSize: 18 }} />
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

      {/* Spreadsheet Main Grid Area */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1.5 } }}>
        <Paper
          elevation={isDarkMode ? 0 : 2}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: { xs: 0, sm: '12px' },
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff'
          }}
        >
          <SpreadsheetEditor
            content={doc.content}
            readOnly={true}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default SheetReadMode;
