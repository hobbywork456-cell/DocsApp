import React from 'react';
import {
  Box,
  Typography,
  InputBase,
  Button,
  IconButton,
  Tooltip,
  Popover,
  TextField,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import LockIcon from '@mui/icons-material/Lock';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArticleIcon from '@mui/icons-material/Article';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';

export const getTagColor = (tag) => {
  if (!tag) return '#9ca3af';
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
    '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e'
  ];
  return colors[Math.abs(hash) % colors.length];
};

const EditorHeader = ({
  documentId,
  title,
  setTitle,
  tags,
  onAddTag,
  onRemoveTag,
  tagAnchorEl,
  onOpenTagMenu,
  onCloseTagMenu,
  newTagInput,
  setNewTagInput,
  docType,
  isEditing,
  setIsEditing,
  isSaving,
  onSave,
  isA4Mode,
  setIsA4Mode,
  isDownloading,
  onDownloadPdf,
  onDownloadFormat,
  onHistoryOpen,
  onAiOpen,
  onImportClick,
  fileInputRef,
  onFileImport,
  isImporting,
  onCloseDoc,
  onBackToLibrary,
  isStorageExceeded,
  onUpgradeClick,
  onReadModeOpen
}) => {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = React.useState(null);
  const [importMenuAnchor, setImportMenuAnchor] = React.useState(null);
  const [fileAccept, setFileAccept] = React.useState('.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.json');

  const handleTriggerImport = (acceptTypes) => {
    setImportMenuAnchor(null);
    setFileAccept(acceptTypes);
    setTimeout(() => {
      if (fileInputRef && fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 60);
  };

  const handleSelectDownloadFormat = (fmt) => {
    setDownloadMenuAnchor(null);
    if (onDownloadFormat) {
      onDownloadFormat(fmt);
    } else if (onDownloadPdf) {
      onDownloadPdf();
    }
  };

  return (
    <>
      {/* ── Single-Row Compact Header ──────────────────────── */}
      <Box className="flex items-start gap-1 mb-1 sm:mb-1.5 min-w-0">
        {/* Left: Back btn (mobile) + Title + DocType Switcher + Tags */}
        <Box className="flex-1 flex flex-col min-w-0">
          <Box className="flex items-center gap-1 min-w-0 flex-wrap">
            {onBackToLibrary && (
              <Tooltip title="Back to Library">
                <IconButton
                  id={`doc-back-library-btn-${documentId}`}
                  aria-label="Back to Library"
                  onClick={onBackToLibrary}
                  size="small"
                  className="md:hidden shrink-0"
                  sx={{ color: '#427c36', bgcolor: 'rgba(255,255,255,0.85)', p: '5px', borderRadius: '8px', '&:hover': { bgcolor: '#f0fdf4' } }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <InputBase
              id={`doc-title-input-${documentId}`}
              slotProps={{ input: { 'aria-label': 'Document Title', id: `doc-title-field-${documentId}` } }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              readOnly={!isEditing}
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                fontWeight: '900',
                color: '#1f2937',
                letterSpacing: '-0.02em',
                opacity: isEditing ? 1 : 0.9,
                lineHeight: 1.2,
                flex: 1,
                minWidth: '150px',
                '& input': { padding: '2px 0' }
              }}
            />
          </Box>

          {/* Tags Row */}
          <Box className="flex flex-wrap items-center gap-1 mt-0.5 px-0.5">
            {tags && tags.map((tag, idx) => {
              const tagColor = getTagColor(tag);
              return (
                <Chip
                  key={idx}
                  label={tag}
                  size="small"
                  onDelete={isEditing ? () => onRemoveTag(tag) : undefined}
                  sx={{
                    height: '24px',
                    fontSize: '0.7rem',
                    bgcolor: tagColor,
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    '& .MuiChip-deleteIcon': { color: '#ffffff', opacity: 0.7, '&:hover': { color: '#ffffff', opacity: 1 } }
                  }}
                />
              );
            })}
            {isEditing && (
              <>
                <Tooltip title="Add Tag">
                  <IconButton size="small" onClick={onOpenTagMenu} sx={{ p: '2px', bgcolor: 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }} className="dark:bg-gray-800 dark:hover:bg-gray-700">
                    <LocalOfferIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                  </IconButton>
                </Tooltip>
                <Popover
                  open={Boolean(tagAnchorEl)}
                  anchorEl={tagAnchorEl}
                  onClose={onCloseTagMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: { className: 'p-3 rounded-xl shadow-lg mt-1 dark:bg-gray-800 border dark:border-gray-700' } }}
                >
                  <Box className="flex items-center gap-2">
                    <TextField
                      size="small"
                      placeholder="Tag name"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onAddTag(); }}
                      autoFocus
                      slotProps={{ input: { className: 'dark:text-white' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#d1d5db' }, '&:hover fieldset': { borderColor: '#427c36' }, '&.Mui-focused fieldset': { borderColor: '#427c36' } } }}
                    />
                    <Button variant="contained" onClick={onAddTag} sx={{ bgcolor: '#427c36', '&:hover': { bgcolor: '#326127' }, textTransform: 'none', minWidth: '60px' }}>
                      Add
                    </Button>
                  </Box>
                </Popover>
              </>
            )}
          </Box>
        </Box>

        {/* Right: All action buttons — shrink-0 so they never wrap */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, shrink: 0, flexShrink: 0, pt: '2px' }}>
          {/* A4 Print Layout Toggle (Docs only) */}
          {docType === 'doc' && (
            <Tooltip title={isA4Mode ? 'Exit A4 Layout' : 'A4 Print Layout'}>
              <IconButton onClick={() => setIsA4Mode(!isA4Mode)}
                sx={{ color: isA4Mode ? '#f59e0b' : '#8b5cf6', bgcolor: isA4Mode ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.06)', '&:hover': { bgcolor: isA4Mode ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
                {isA4Mode ? <CloseFullscreenIcon sx={{ fontSize: 18 }} /> : <ArticleIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="History">
            <IconButton onClick={onHistoryOpen}
              sx={{ color: '#9c27b0', bgcolor: 'rgba(156,39,176,0.06)', '&:hover': { bgcolor: 'rgba(156,39,176,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Read Mode */}
          <Tooltip title={docType === 'sheet' ? 'Sheet Read Mode' : docType === 'ppt' ? 'Presentation Read Mode' : 'Read Mode'}>
            <IconButton onClick={onReadModeOpen}
              sx={{ 
                color: docType === 'sheet' ? '#059669' : docType === 'ppt' ? '#ea580c' : '#427c36', 
                bgcolor: docType === 'sheet' ? 'rgba(5,150,105,0.08)' : docType === 'ppt' ? 'rgba(234,88,12,0.08)' : 'rgba(66,124,54,0.06)', 
                '&:hover': { 
                  bgcolor: docType === 'sheet' ? 'rgba(5,150,105,0.15)' : docType === 'ppt' ? 'rgba(234,88,12,0.15)' : 'rgba(66,124,54,0.13)', 
                  transform: 'translateY(-1px)' 
                }, 
                p: '5px', 
                borderRadius: '10px', 
                transition: 'all 0.2s' 
              }}>
              <RemoveRedEyeOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Download Format Menu Button */}
          <Tooltip title={isDownloading ? 'Downloading...' : `Download ${docType === 'sheet' ? 'Spreadsheet' : docType === 'ppt' ? 'Presentation' : 'Document'}`}>
            <span>
              <IconButton 
                onClick={(e) => setDownloadMenuAnchor(e.currentTarget)} 
                disabled={isDownloading}
                sx={{ 
                  color: '#3b82f6', 
                  bgcolor: 'rgba(59,130,246,0.06)', 
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.13)', transform: 'translateY(-1px)' }, 
                  '&.Mui-disabled': { color: '#d1d5db', bgcolor: 'transparent' }, 
                  p: '5px', 
                  borderRadius: '10px', 
                  transition: 'all 0.2s' 
                }}
              >
                {isDownloading ? <CircularProgress size={16} sx={{ color: '#3b82f6' }} /> : <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>

          {/* Download Formats Dropdown Menu */}
          <Menu
            anchorEl={downloadMenuAnchor}
            open={Boolean(downloadMenuAnchor)}
            onClose={() => setDownloadMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '14px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                  minWidth: 240,
                  py: 0.5,
                  border: '1px solid #e2e8f0'
                }
              }
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Download Options
              </Typography>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                {docType === 'sheet' ? 'Spreadsheet Formats' : docType === 'ppt' ? 'Presentation Formats' : 'Document Formats'}
              </Typography>
            </Box>

            {/* Formats for DOC */}
            {docType === 'doc' && (
              <>
                <MenuItem onClick={() => handleSelectDownloadFormat('pdf')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PictureAsPdfIcon fontSize="small" sx={{ color: '#ef4444' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PDF Document (.pdf)" 
                    secondary="Standard print-ready A4 layout" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
                <MenuItem onClick={() => handleSelectDownloadFormat('doc')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <DescriptionIcon fontSize="small" sx={{ color: '#2563eb' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Word Document (.doc)" 
                    secondary="Microsoft Word compatible" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
                <MenuItem onClick={() => handleSelectDownloadFormat('txt')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArticleIcon fontSize="small" sx={{ color: '#64748b' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Plain Text (.txt)" 
                    secondary="Clean unformatted text" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
              </>
            )}

            {/* Formats for SHEET */}
            {docType === 'sheet' && (
              <>
                <MenuItem onClick={() => handleSelectDownloadFormat('xlsx')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TableChartIcon fontSize="small" sx={{ color: '#10b981' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Microsoft Excel (.xlsx)" 
                    secondary="Workbook with sheets & grid" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
                <MenuItem onClick={() => handleSelectDownloadFormat('pdf')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PictureAsPdfIcon fontSize="small" sx={{ color: '#ef4444' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PDF Document (.pdf)" 
                    secondary="Landscape tabular layout" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
                <MenuItem onClick={() => handleSelectDownloadFormat('csv')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TableChartIcon fontSize="small" sx={{ color: '#0ea5e9' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="CSV File (.csv)" 
                    secondary="Comma-separated data sheet" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
              </>
            )}

            {/* Formats for PPT */}
            {docType === 'ppt' && (
              <>
                <MenuItem onClick={() => handleSelectDownloadFormat('pptx')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <SlideshowIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PowerPoint Presentation (.pptx)" 
                    secondary="Full slide deck with layouts" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
                <MenuItem onClick={() => handleSelectDownloadFormat('pdf')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PictureAsPdfIcon fontSize="small" sx={{ color: '#ef4444' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PDF Presentation (.pdf)" 
                    secondary="Landscape slides page-by-page" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
              </>
            )}
          </Menu>

          {/* Divider */}
          <Box sx={{ width: '1px', height: 22, bgcolor: '#e5e7eb', mx: 0.25 }} />

          {/* Edit / Import + Save */}
          {isStorageExceeded ? (
            <Tooltip title="Workspace storage quota full (100%). Documents are locked in Read-Only mode. Click to upgrade subscription.">
              <Button
                size="small"
                variant="contained"
                onClick={onUpgradeClick}
                startIcon={<LockIcon sx={{ fontSize: 15 }} />}
                sx={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important',
                  color: 'white !important',
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  px: 1.2,
                  py: 0.4,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important'
                  }
                }}
              >
                Read-Only (Upgrade)
              </Button>
            </Tooltip>
          ) : !isEditing ? (
            <Tooltip title="Edit Document">
              <Button
                id={`doc-edit-btn-${documentId}`}
                variant="contained"
                size="small"
                onClick={() => setIsEditing(true)}
                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: 'white',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #427c36 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #326127 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 14px rgba(66,124,54,0.4)'
                  },
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.35,
                  boxShadow: '0 2px 8px rgba(66,124,54,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Edit
              </Button>
            </Tooltip>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="AI Assistant (Gemini)">
                <IconButton onClick={onAiOpen}
                  sx={{ color: '#0ea5e9', bgcolor: 'rgba(14,165,233,0.06)', '&:hover': { bgcolor: 'rgba(14,165,233,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Universal Multi-Format Import Button */}
              <Tooltip title={isImporting ? 'Importing File...' : 'Import File (PPT, Sheet, Doc, PDF)'}>
                <span>
                  <IconButton 
                    onClick={(e) => setImportMenuAnchor(e.currentTarget)} 
                    disabled={isImporting}
                    sx={{ 
                      color: '#6366f1', 
                      bgcolor: 'rgba(99,102,241,0.06)', 
                      '&:hover': { bgcolor: 'rgba(99,102,241,0.13)', transform: 'translateY(-1px)' }, 
                      '&.Mui-disabled': { color: '#d1d5db', bgcolor: 'transparent' }, 
                      p: '5px', 
                      borderRadius: '10px', 
                      transition: 'all 0.2s' 
                    }}
                  >
                    {isImporting ? <CircularProgress size={16} sx={{ color: '#6366f1' }} /> : <UploadFileIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Import Options Dropdown Menu */}
              <Menu
                anchorEl={importMenuAnchor}
                open={Boolean(importMenuAnchor)}
                onClose={() => setImportMenuAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: '14px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                      minWidth: 250,
                      py: 0.5,
                      border: '1px solid #e2e8f0'
                    }
                  }
                }}
              >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Import & Convert File
                  </Typography>
                  <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                    Select File Type
                  </Typography>
                </Box>

                <MenuItem onClick={() => handleTriggerImport('.pptx,.ppt')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <SlideshowIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PowerPoint Presentation (.pptx, .ppt)" 
                    secondary="Imports slides into PPT format" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>

                <MenuItem onClick={() => handleTriggerImport('.xlsx,.xls,.csv')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TableChartIcon fontSize="small" sx={{ color: '#10b981' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Excel Spreadsheet (.xlsx, .csv)" 
                    secondary="Imports grid into Sheet format" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>

                <MenuItem onClick={() => handleTriggerImport('.docx,.doc,.pdf,.txt')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <DescriptionIcon fontSize="small" sx={{ color: '#2563eb' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Word / PDF Document (.docx, .pdf)" 
                    secondary="Imports text into Document format" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem onClick={() => handleTriggerImport('.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.json')} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AutoAwesomeIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Auto-Detect Any File" 
                    secondary="PPT, Excel, Word, or PDF" 
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} 
                    secondaryTypographyProps={{ fontSize: '0.68rem' }} 
                  />
                </MenuItem>
              </Menu>

              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                onChange={onFileImport}
                accept={fileAccept} 
              />
              {/* Single Done Button (Saves Document & Exits Edit Mode) */}
              <Tooltip title={isSaving ? 'Saving...' : 'Done (Save Document)'}>
                <span>
                  <Button
                    id={`doc-done-btn-${documentId}`}
                    variant="contained"
                    size="small"
                    onClick={onSave}
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <CheckIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      color: 'white',
                      background: isSaving
                        ? 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)'
                        : 'linear-gradient(135deg, #427c36 0%, #326127 100%)',
                      boxShadow: '0 2px 10px rgba(66,124,54,0.35)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #326127 0%, #1f4d1d 100%)',
                        boxShadow: '0 4px 14px rgba(66,124,54,0.45)',
                        transform: 'translateY(-1px)'
                      },
                      '&.Mui-disabled': { background: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' },
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 0.35,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Done'}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )}

          {/* Close */}
          <Tooltip title="Close Document">
            <IconButton onClick={onCloseDoc}
              sx={{ color: '#ef4444', bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca', transform: 'translateY(-1px)' }, ml: 0.25, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Storage Limit Lock Notice */}
      {isStorageExceeded && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '10px',
          px: 2,
          py: 0.8,
          mb: 1,
          color: '#ef4444',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon fontSize="small" sx={{ color: '#ef4444' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#f87171' }}>
              STORAGE FULL (100% CAPACITY) — Document is locked in READ-ONLY mode. Document editing, removal, and file uploads are restricted.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            onClick={onUpgradeClick}
            sx={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626) !important',
              color: 'white !important',
              textTransform: 'none',
              py: 0.3,
              px: 1.5,
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(239,68,68,0.4)'
            }}
          >
            Upgrade Storage Quota
          </Button>
        </Box>
      )}
    </>
  );
};

export default EditorHeader;
