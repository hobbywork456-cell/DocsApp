import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, InputBase, Button, Paper, IconButton, Dialog, List, ListItem, ListItemText, Divider, Tooltip } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Register custom image blot to support width/height resizing
const BaseImageFormat = Quill.import('formats/image');
class CustomImage extends BaseImageFormat {
  static create(value) {
    const node = super.create(value);
    if (typeof value === 'string') {
      node.setAttribute('src', this.sanitize(value));
    }
    return node;
  }
  static formats(domNode) {
    const formats = {};
    if (domNode.hasAttribute('width')) formats.width = domNode.getAttribute('width');
    if (domNode.style.width) formats.width = domNode.style.width;
    if (domNode.hasAttribute('height')) formats.height = domNode.getAttribute('height');
    if (domNode.style.height) formats.height = domNode.style.height;
    if (domNode.style.float) formats.float = domNode.style.float;
    if (domNode.style.margin) formats.margin = domNode.style.margin;
    if (domNode.style.display) formats.display = domNode.style.display;
    return formats;
  }
  format(name, value) {
    if (name === 'width') {
      if (value) this.domNode.style.width = value;
      else this.domNode.style.width = '';
    } else if (name === 'height') {
      if (value) this.domNode.style.height = value;
      else this.domNode.style.height = '';
    } else if (name === 'float') {
      if (value) this.domNode.style.float = value;
      else this.domNode.style.float = '';
    } else if (name === 'margin') {
      if (value) this.domNode.style.margin = value;
      else this.domNode.style.margin = '';
    } else if (name === 'display') {
      if (value) this.domNode.style.display = value;
      else this.domNode.style.display = '';
    } else {
      super.format(name, value);
    }
  }
}
Quill.register(CustomImage, true);

const icons = Quill.import('ui/icons');
icons['undo'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`;
icons['redo'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>`;

import { updateDocument, removeOpenDocument, importDocumentContent, uploadImageFile, uploadAttachment, deleteAttachment } from '../../slices/documentSlice';
import html2pdf from 'html2pdf.js';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [mediaEditNode, setMediaEditNode] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const quillRef = useRef(null);
  const editorContainerRef = useRef(null);
  const overlayRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          const selection = quill.getSelection(true) || { index: quill.getLength() };
          const index = selection.index || 0;
          
          // Insert the transcript text
          const textToInsert = transcript + ' ';
          quill.insertText(index, textToInsert);
          quill.setSelection(index + textToInsert.length);
          setContent(quill.root.innerHTML);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // Automatically restart if we were intentionally listening (continuous mode often stops after silence)
        // For simplicity, we just set it to false and let user click again, 
        // or we can auto-restart if isListening is still true in state.
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support Speech Recognition. Try Google Chrome.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Could not start speech recognition:", err);
        // It might be already started
      }
    }
  };

  useEffect(() => {
    if (selectedDocument) {
      setTitle(selectedDocument.title || '');
      setContent(selectedDocument.content || '');
      setIsEditing(false);
    }
  }, [selectedDocument]);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUndo = () => {
    if (quillRef.current) quillRef.current.getEditor().history.undo();
  };

  const handleRedo = () => {
    if (quillRef.current) quillRef.current.getEditor().history.redo();
  };

  const handleAttachmentClick = () => {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.click();
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (file && selectedDocument) {
      setIsUploadingAttachment(true);
      try {
        await dispatch(uploadAttachment({ id: selectedDocument._id, file })).unwrap();
      } catch (err) {
        console.error("Attachment upload failed", err);
        alert("Attachment upload failed: " + (err.message || err));
      }
      setIsUploadingAttachment(false);
    }
    e.target.value = null;
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (selectedDocument) {
      try {
        await dispatch(deleteAttachment({ id: selectedDocument._id, attachmentId }));
      } catch (err) {
        console.error("Failed to delete attachment", err);
      }
    }
  };

  const getAttachmentIcon = (type, filename) => {
    if (type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return <PictureAsPdfIcon sx={{ color: '#ef4444' }} />;
    if (type.includes('spreadsheet') || type.includes('excel') || filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) return <TableChartIcon sx={{ color: '#10b981' }} />;
    return <DescriptionIcon sx={{ color: '#3b82f6' }} />;
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsImporting(true);
      try {
        const resultAction = await dispatch(importDocumentContent(file));
        if (importDocumentContent.fulfilled.match(resultAction)) {
          // Append the imported HTML to existing content or replace it if empty
          setContent(prev => prev ? prev + '<br/>' + resultAction.payload.html : resultAction.payload.html);
        }
      } catch (err) {
        console.error("Import failed", err);
      }
      setIsImporting(false);
    }
    e.target.value = null; // Reset input
  };

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

  const updateOverlayPosition = useCallback(() => {
    if (!mediaEditNode || !editorContainerRef.current) return;
    const containerRect = editorContainerRef.current.getBoundingClientRect();
    const nodeRect = mediaEditNode.getBoundingClientRect();
    
    // Check if the node is visible in the container
    if (nodeRect.bottom < containerRect.top || nodeRect.top > containerRect.bottom) {
      setOverlayStyle(null);
      return;
    }

    setOverlayStyle({
      top: nodeRect.top - containerRect.top,
      left: nodeRect.left - containerRect.left,
      width: nodeRect.width,
      height: nodeRect.height
    });
  }, [mediaEditNode]);

  useEffect(() => {
    if (mediaEditNode) {
      updateOverlayPosition();
      
      const handleScrollOrResize = () => updateOverlayPosition();
      
      const quillEditor = document.querySelector('.ql-editor');
      if (quillEditor) quillEditor.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        if (quillEditor) quillEditor.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [mediaEditNode, updateOverlayPosition]);

  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      if (!isEditing) {
        setSelectedMedia({ type: e.target.tagName.toLowerCase(), src: e.target.src });
      } else {
        setMediaEditNode(e.target);
      }
    } else if (isEditing) {
      // Clicked somewhere else in the editor
      setMediaEditNode(null);
      setOverlayStyle(null);
    }
  };

  const handleDragStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!mediaEditNode) return;
    
    const startX = e.clientX;
    const startWidth = mediaEditNode.getBoundingClientRect().width;
    
    const handleDrag = (moveEvent) => {
      const diffX = moveEvent.clientX - startX;
      let newWidth = startWidth;
      
      if (direction.includes('e')) newWidth += diffX;
      if (direction.includes('w')) newWidth -= diffX;
      
      // Ensure minimum width
      if (newWidth > 30) {
        const widthStr = `${newWidth}px`;
        mediaEditNode.style.width = widthStr;
        mediaEditNode.setAttribute('width', widthStr);
        mediaEditNode.style.height = 'auto'; // Maintain aspect ratio
        
        // Mutate overlay directly for 60fps drag without React re-renders
        if (overlayRef.current && editorContainerRef.current) {
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          const nodeRect = mediaEditNode.getBoundingClientRect();
          overlayRef.current.style.top = `${nodeRect.top - containerRect.top}px`;
          overlayRef.current.style.left = `${nodeRect.left - containerRect.left}px`;
          overlayRef.current.style.width = `${nodeRect.width}px`;
          overlayRef.current.style.height = `${nodeRect.height}px`;
        }
      }
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      
      // We must get the Quill instance and format the blot directly or trigger a text-change
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const blot = Quill.find(mediaEditNode);
        if (blot) {
          const widthStr = mediaEditNode.style.width;
          blot.format('width', widthStr);
          blot.format('height', 'auto');
        }
        setContent(quill.root.innerHTML);
      }
    };
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const deleteMedia = () => {
    if (mediaEditNode && quillRef.current) {
      mediaEditNode.remove();
      setContent(quillRef.current.getEditor().root.innerHTML);
      setMediaEditNode(null);
      setOverlayStyle(null);
    }
  };

  const alignMedia = (alignment) => {
    if (!mediaEditNode || !quillRef.current) return;
    
    if (alignment === 'left') {
      mediaEditNode.style.float = 'left';
      mediaEditNode.style.margin = '0 1rem 1rem 0';
      mediaEditNode.style.display = 'inline-block';
    } else if (alignment === 'center') {
      mediaEditNode.style.float = 'none';
      mediaEditNode.style.margin = '0 auto';
      mediaEditNode.style.display = 'block';
    } else if (alignment === 'right') {
      mediaEditNode.style.float = 'right';
      mediaEditNode.style.margin = '0 0 1rem 1rem';
      mediaEditNode.style.display = 'inline-block';
    }
    
    const quill = quillRef.current.getEditor();
    const blot = Quill.find(mediaEditNode);
    if (blot) {
      blot.format('float', mediaEditNode.style.float);
      blot.format('margin', mediaEditNode.style.margin);
      blot.format('display', mediaEditNode.style.display);
    }
    setContent(quill.root.innerHTML);
    updateOverlayPosition();
  };

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file && /^image\//.test(file.type)) {
        try {
          const resultAction = await dispatch(uploadImageFile(file));
          if (uploadImageFile.fulfilled.match(resultAction)) {
            const url = import.meta.env.VITE_API_URL.replace('/api', '') + resultAction.payload.url;
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1);
          }
        } catch (error) {
          console.error('Image upload failed', error);
        }
      }
    };
  }, [dispatch]);

  const modules = useMemo(() => ({
    history: { delay: 500, maxStack: 100, userOnly: true },
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image', 'undo', 'redo'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        undo: function() { this.quill.history.undo(); },
        redo: function() { this.quill.history.redo(); }
      }
    }
  }), [imageHandler]);

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
            <Box className="flex items-center gap-1.5">
              <Button
                id={`doc-import-btn-${documentId}`}
                variant="outlined"
                aria-label="Import File"
                onClick={handleImportClick}
                disabled={isImporting}
                className="shrink-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1"
                sx={{ 
                  textTransform: 'none', 
                  color: '#6366f1',
                  borderColor: '#6366f1',
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  minWidth: { xs: '36px', sm: 'auto' },
                  '&:hover': { bgcolor: '#eef2ff', borderColor: '#4f46e5' },
                  '&.Mui-disabled': { borderColor: '#e5e7eb', color: '#9ca3af' }
                }}
              >
                <UploadFileIcon sx={{ fontSize: { xs: 18, sm: 20 }, mr: { xs: 0, sm: 0.8 } }} />
                <span className="hidden sm:inline">{isImporting ? '...' : 'Import'}</span>
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                onChange={handleFileImport}
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />
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
            </Box>
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
      
      <Box className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 relative">
        <Paper 
          ref={editorContainerRef}
          elevation={0} 
          onClick={handleEditorClick}
          className={`flex-1 rounded-2xl overflow-hidden bg-white/80 shadow-sm flex flex-col relative ${isEditing ? 'border-2 border-[#ff84ba]' : 'border border-pink-100'} ${!isEditing ? 'editor-readonly' : ''}`}
        >
        {isEditing && (
          <Tooltip title={isListening ? "Stop Dictation" : "Dictate"}>
            <IconButton
              onClick={toggleListen}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 10,
                color: isListening ? 'white' : '#10b981',
                bgcolor: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.9)',
                border: isListening ? 'none' : '1px solid #10b981',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: isListening ? '#dc2626' : '#ecfdf5',
                },
                width: 30,
                height: 30,
              }}
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </Tooltip>
        )}
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={(val) => {
            setContent(val);
            if (mediaEditNode) updateOverlayPosition();
          }}
          readOnly={!isEditing}
          modules={modules}
          className="flex-1 flex flex-col min-h-0 custom-quill"
        />
        
        {/* Interactive Image Resizing Overlay */}
        {isEditing && overlayStyle && mediaEditNode && (
          <Box 
            ref={overlayRef}
            sx={{
              position: 'absolute',
              top: overlayStyle.top,
              left: overlayStyle.left,
              width: overlayStyle.width,
              height: overlayStyle.height,
              border: '2px solid #3b82f6',
              pointerEvents: 'none',
              zIndex: 50
            }}
          >
            {/* Action Bar */}
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                top: -45,
                right: 0,
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: 'white'
              }}
            >
              <Tooltip title="Align Left">
                <IconButton size="small" onClick={() => alignMedia('left')} sx={{ color: '#64748b', p: 0.5, '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}>
                  <FormatAlignLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Align Center">
                <IconButton size="small" onClick={() => alignMedia('center')} sx={{ color: '#64748b', p: 0.5, '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}>
                  <FormatAlignCenterIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Align Right">
                <IconButton size="small" onClick={() => alignMedia('right')} sx={{ color: '#64748b', p: 0.5, '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}>
                  <FormatAlignRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
              <Tooltip title="Delete">
                <IconButton size="small" onClick={deleteMedia} sx={{ color: '#ef4444', p: 0.5, '&:hover': { bgcolor: '#fee2e2' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>

            {/* Resize Handles */}
            {['nw', 'ne', 'sw', 'se'].map(pos => (
              <Box
                key={pos}
                onMouseDown={(e) => handleDragStart(e, pos)}
                sx={{
                  position: 'absolute',
                  width: 12,
                  height: 12,
                  bgcolor: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '50%',
                  pointerEvents: 'auto',
                  cursor: `${pos}-resize`,
                  top: pos.includes('n') ? -6 : 'auto',
                  bottom: pos.includes('s') ? -6 : 'auto',
                  left: pos.includes('w') ? -6 : 'auto',
                  right: pos.includes('e') ? -6 : 'auto',
                }}
              />
            ))}
          </Box>
        )}
        </Paper>

        {/* Attachments Bar (Below Editor) */}
        {(isEditing || (selectedDocument.attachments && selectedDocument.attachments.length > 0)) && (
          <Box className="w-full flex items-center gap-3 p-3 bg-white/60 rounded-xl overflow-x-auto shrink-0 border border-pink-100">
            {selectedDocument.attachments && selectedDocument.attachments.length > 0 && (
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 'bold', mr: 1, textTransform: 'uppercase' }}>Attachments:</Typography>
            )}
            
            {selectedDocument.attachments && selectedDocument.attachments.map(att => (
              <Tooltip title={att.name} key={att._id} arrow>
                <Box className="relative group flex items-center justify-center p-2 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow hover:bg-gray-50 transition-all">
                  <a href={import.meta.env.VITE_API_URL.replace('/api', '') + att.url} target="_blank" rel="noreferrer" className="flex items-center justify-center">
                    {getAttachmentIcon(att.type, att.name)}
                  </a>
                  {isEditing && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAttachment(att._id); }} 
                      sx={{ 
                        position: 'absolute', top: -8, right: -8, bgcolor: 'white', 
                        border: '1px solid #fee2e2', color: '#ef4444', p: '2px', 
                        opacity: 0, transition: 'opacity 0.2s',
                        '.group:hover &': { opacity: 1 }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              </Tooltip>
            ))}

            {isEditing && (
              <>
                <Tooltip title="Add Attachment" arrow>
                  <IconButton 
                    onClick={handleAttachmentClick} 
                    disabled={isUploadingAttachment} 
                    sx={{ 
                      border: '1px dashed #ff84ba', color: '#ff84ba', borderRadius: '8px',
                      p: '6px', '&:hover': { bgcolor: '#fff0f6' }
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                </Tooltip>
                <input
                  type="file"
                  ref={attachmentInputRef}
                  hidden
                  onChange={handleAttachmentUpload}
                />
              </>
            )}
          </Box>
        )}
      </Box>
      
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
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(entry.editedAt).toLocaleString()}
                        </Typography>
                        {entry.changesSummary && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: '#f3f4f6', borderRadius: 1, borderLeft: '3px solid #ff84ba' }}>
                            {entry.changesSummary}
                          </Typography>
                        )}
                      </Box>
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
