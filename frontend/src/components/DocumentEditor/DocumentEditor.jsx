import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, InputBase, Button, Paper, IconButton, Dialog, List, ListItem, ListItemText, Divider, Tooltip } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { updateDocument, removeOpenDocument } from '../../slices/documentSlice';
import html2pdf from 'html2pdf.js';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import './DocumentEditor.css';

const DocumentEditor = ({ documentId, onBackToLibrary }) => {
  const dispatch = useDispatch();
  const { documents } = useSelector((state) => state.documents);
  const selectedDocument = documents.find(doc => doc._id === documentId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (selectedDocument) {
      setTitle(selectedDocument.title || '');
      setContent(selectedDocument.content || '');
      setIsEditing(false);
    }
  }, [selectedDocument]);

  const handleSave = async () => {
    if (!selectedDocument) return;
    setIsSaving(true);
    await dispatch(updateDocument({ id: selectedDocument._id, title, content }));
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleDownloadPdf = () => {
    if (!selectedDocument) return;
    setIsDownloading(true);
    
    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        .pdf-container {
          font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
          width: 100%;
          max-width: 210mm; /* A4 width */
        }
        .pdf-container img, .pdf-container video {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
        .pdf-container p, .pdf-container h1, .pdf-container h2, .pdf-container h3, .pdf-container h4, .pdf-container h5, .pdf-container h6, .pdf-container table, .pdf-container tr, .pdf-container div.ql-code-block {
          page-break-inside: avoid;
        }
      </style>
      <div class="pdf-container">
        <h1 style="font-size: 2.2rem; font-weight: 900; color: #4a4a4a; margin-bottom: 20px; border-bottom: 2px solid #ff84ba; padding-bottom: 10px;">${title || 'Untitled Document'}</h1>
        <div style="font-size: 1.05rem; color: #374151; line-height: 1.6;">
          ${content}
        </div>
      </div>
    `;
    
    const opt = {
      margin:       [20, 15, 20, 15], // [top, left, bottom, right] for header and footer margins
      filename:     `${title || 'document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
    }).catch((err) => {
      console.error('PDF generation error:', err);
      setIsDownloading(false);
    });
  };

  const handleEditorClick = (e) => {
    if (!isEditing) {
      if (e.target.tagName === 'IMG') {
        setSelectedMedia({ type: 'image', src: e.target.src });
      } else if (e.target.tagName === 'VIDEO') {
        setSelectedMedia({ type: 'video', src: e.target.src });
      }
    } else {
      if (e.target.tagName === 'IMG') {
        setSelectedMedia({ type: 'image', src: e.target.src });
      } else if (e.target.tagName === 'VIDEO') {
        setSelectedMedia({ type: 'video', src: e.target.src });
      }
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (!selectedDocument) return null;

  return (
    <Box 
      component="article" 
      id={`document-editor-article-${documentId}`} 
      aria-label={`Document Editor for ${title || 'Untitled Document'}`}
      className="h-full flex flex-col p-3 sm:p-6 bg-white/40 backdrop-blur-sm relative"
    >
      <Box className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
        {/* Title area with optional mobile back-to-library button */}
        <Box className="flex items-center flex-1 min-w-0 mr-1 sm:mr-4">
          {onBackToLibrary && (
            <Tooltip title="Back to Library">
              <IconButton 
                id={`doc-back-library-btn-${documentId}`}
                aria-label="Back to Library"
                onClick={onBackToLibrary} 
                size="small"
                className="md:hidden mr-1.5 shrink-0" 
                sx={{ 
                  color: '#ff84ba', 
                  bgcolor: 'rgba(255, 255, 255, 0.85)', 
                  border: '1px solid rgba(255, 132, 186, 0.3)',
                  p: '6px',
                  borderRadius: '10px',
                  '&:hover': { bgcolor: '#fff0f6' }
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <InputBase
            id={`doc-title-input-${documentId}`}
            inputProps={{
              'aria-label': 'Document Title',
              id: `doc-title-field-${documentId}`
            }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
            readOnly={!isEditing}
            sx={{ 
              fontSize: { xs: '1.35rem', sm: '2rem', md: '2.5rem' }, 
              fontWeight: '900', 
              color: '#4a4a4a', 
              letterSpacing: '-0.02em',
              opacity: isEditing ? 1 : 0.85,
              lineHeight: 1.2
            }}
            fullWidth
          />
        </Box>

        {/* Action Buttons */}
        <Box className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Tooltip title="Document History">
            <Button
              id={`doc-history-btn-${documentId}`}
              variant="contained"
              aria-label="View Document History"
              onClick={() => setHistoryOpen(true)}
              className="shrink-0 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1"
              sx={{ 
                textTransform: 'none', 
                bgcolor: 'rgba(255, 255, 255, 0.7)', 
                color: '#9c27b0',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 15px rgba(156, 39, 176, 0.1)',
                border: '1px solid rgba(156, 39, 176, 0.2)',
                minWidth: { xs: '36px', sm: 'auto' },
                '&:hover': { bgcolor: '#fff0ff', boxShadow: '0 6px 20px rgba(156, 39, 176, 0.2)', borderColor: 'rgba(156, 39, 176, 0.4)' }
              }}
            >
              <HistoryIcon sx={{ fontSize: { xs: 18, sm: 20 }, mr: { xs: 0, sm: 0.8 } }} />
              <span className="hidden sm:inline">History</span>
            </Button>
          </Tooltip>

          <Tooltip title="Download PDF">
            <Button
              id={`doc-pdf-download-btn-${documentId}`}
              variant="contained"
              aria-label="Download Document as PDF"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="shrink-0 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1"
              sx={{ 
                textTransform: 'none', 
                bgcolor: 'rgba(255, 255, 255, 0.7)', 
                color: '#3b82f6',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                minWidth: { xs: '36px', sm: 'auto' },
                '&:hover': { bgcolor: '#eff6ff', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.4)' },
                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.4)', color: '#9ca3af', borderColor: 'transparent' }
              }}
            >
              <FileDownloadOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, mr: { xs: 0, sm: 0.8 } }} />
              <span className="hidden sm:inline">{isDownloading ? '...' : 'PDF'}</span>
            </Button>
          </Tooltip>

          {!isEditing ? (
            <Button
              id={`doc-edit-btn-${documentId}`}
              variant="contained"
              aria-label="Edit Document"
              onClick={() => setIsEditing(true)}
              className="shrink-0 px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-black transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1"
              sx={{ 
                textTransform: 'none', 
                background: 'linear-gradient(135deg, #ff9ecc 0%, #ff84ba 100%)',
                color: 'white',
                boxShadow: '0 6px 16px rgba(255, 132, 186, 0.4)',
                minWidth: { xs: '36px', sm: 'auto' },
                '&:hover': { background: 'linear-gradient(135deg, #ff84ba 0%, #ff6da7 100%)', boxShadow: '0 10px 25px rgba(255, 132, 186, 0.6)' }
              }}
            >
              <EditIcon sx={{ fontSize: { xs: 18, sm: 20 }, mr: { xs: 0, sm: 0.8 } }} />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : (
            <Button
              id={`doc-save-btn-${documentId}`}
              variant="contained"
              aria-label="Save Document"
              onClick={handleSave}
              disabled={isSaving}
              className="shrink-0 px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-black transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1"
              sx={{ 
                textTransform: 'none', 
                bgcolor: 'white',
                color: '#ff84ba',
                border: '2px solid #ff84ba',
                boxShadow: '0 6px 16px rgba(255, 132, 186, 0.2)',
                minWidth: { xs: '36px', sm: 'auto' },
                '&:hover': { bgcolor: '#fff0f6', boxShadow: '0 10px 25px rgba(255, 132, 186, 0.3)' },
                '&.Mui-disabled': { borderColor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' }
              }}
            >
              <CloudDoneOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, mr: { xs: 0, sm: 0.8 } }} />
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
          
          <Tooltip title="Close Document">
            <IconButton 
              id={`doc-close-btn-${documentId}`}
              aria-label="Close Document"
              onClick={() => dispatch(removeOpenDocument(documentId))} 
              size="small"
              sx={{ 
                color: '#ef4444', 
                bgcolor: '#fee2e2', 
                '&:hover': { bgcolor: '#fecaca' }, 
                ml: { xs: 0.5, sm: 1 }, 
                borderRadius: { xs: '10px', sm: '12px' },
                p: { xs: '6px', sm: '8px' }
              }}
            >
              <CloseIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Paper 
        elevation={0} 
        onClick={handleEditorClick}
        className={`flex-1 rounded-2xl overflow-hidden bg-white/80 shadow-sm flex flex-col ${isEditing ? 'border-2 border-[#ff84ba]' : 'border border-pink-100'} ${!isEditing ? 'editor-readonly' : ''}`}
      >
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          readOnly={!isEditing}
          modules={modules}
          className="flex-1 flex flex-col min-h-0 custom-quill"
        />
      </Paper>
      
      <Dialog 
        open={!!selectedMedia} 
        onClose={() => setSelectedMedia(null)} 
        maxWidth="lg"
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden'
          }
        }}
      >
        <Box className="relative flex flex-col items-center justify-center">
          <IconButton 
            onClick={() => setSelectedMedia(null)} 
            sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' }, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {selectedMedia?.type === 'image' && (
            <img src={selectedMedia.src} alt="Detail view" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
          )}
          {selectedMedia?.type === 'video' && (
            <video src={selectedMedia.src} controls style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px' }} />
          )}
        </Box>
      </Dialog>
      
      <Dialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}
      >
        <Box className="flex justify-between items-center mb-4 px-2">
          <Typography variant="h6" fontWeight="bold">Document History</Typography>
          <IconButton onClick={() => setHistoryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ maxHeight: 400, overflow: 'auto', p: 2 }}>
          {!selectedDocument?.history || selectedDocument.history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No edit history found.
            </Typography>
          ) : (
            selectedDocument.history.slice().reverse().map((entry, index) => (
              <Box key={index}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemText 
                    primary={
                      <Typography variant="body1" fontWeight="bold">
                        Edited by {entry.editedBy?.email || 'Unknown User'}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {new Date(entry.editedAt).toLocaleString()}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < selectedDocument.history.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </List>
      </Dialog>
    </Box>
  );
};

export default DocumentEditor;
