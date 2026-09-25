import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, InputBase, Button, Paper, IconButton, Dialog, List, ListItem, ListItemText, Divider, Tooltip, Popover, TextField, Chip, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
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
icons['table'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;

import { updateDocument, removeOpenDocument, importDocumentContent, uploadImageFile, uploadAttachment, deleteAttachment, setGlobalReadMode } from '../../slices/documentSlice';
import html2pdf from 'html2pdf.js';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import GridOnIcon from '@mui/icons-material/GridOn';
import LockIcon from '@mui/icons-material/Lock';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArticleIcon from '@mui/icons-material/Article';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import './DocumentEditor.css';

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


const DocumentEditor = ({ documentId, onBackToLibrary }) => {
  const dispatch = useDispatch();
  const { documents } = useSelector((state) => state.documents);
  const selectedDocument = documents.find(doc => doc._id === documentId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isA4Mode, setIsA4Mode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagAnchorEl, setTagAnchorEl] = useState(null);
  const [newTagInput, setNewTagInput] = useState('');

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [mediaEditNode, setMediaEditNode] = useState(null);
    const [tableEditNode, setTableEditNode] = useState(null);
  const [tablePopoverAnchor, setTablePopoverAnchor] = useState(null);
  const [hoveredGrid, setHoveredGrid] = useState({ rows: 0, cols: 0 });
  const [tableInsertIndex, setTableInsertIndex] = useState(0);
  const openTableDialogRef = useRef(null);

  openTableDialogRef.current = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      setTableInsertIndex(range ? range.index : quill.getLength());
    }
    const btn = document.querySelector('.ql-table');
    if (btn) {
      setTablePopoverAnchor(btn);
    } else {
      setTablePopoverAnchor(document.body);
    }
  };
  const [tableOverlayStyle, setTableOverlayStyle] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
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
      setTags(selectedDocument.tags || []);
      setIsEditing(false);
      setPendingAttachments([]);
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

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0];
    if (file && selectedDocument) {
      setPendingAttachments([...pendingAttachments, file]);
    }
    e.target.value = null;
  };

  const handleRemovePendingAttachment = (index) => {
    setPendingAttachments(pendingAttachments.filter((_, i) => i !== index));
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
    if (type.includes('spreadsheet') || type.includes('excel') || filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) return <TableChartIcon sx={{ color: '#326127' }} />;
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
    
    // Upload pending attachments first
    if (pendingAttachments.length > 0) {
      for (const file of pendingAttachments) {
        try {
          await dispatch(uploadAttachment({ id: selectedDocument._id, file })).unwrap();
        } catch (err) {
          console.error("Failed to upload pending attachment:", file.name, err);
        }
      }
      setPendingAttachments([]); // Clear after upload
    }

    await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags }));
    setIsSaving(false);
    setIsEditing(false);
  };

  
  const handleOpenTagMenu = (event) => setTagAnchorEl(event.currentTarget);
  const handleCloseTagMenu = () => {
    setTagAnchorEl(null);
    setNewTagInput('');
  };
  const handleAddTag = async () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      if (!isEditing) {
        await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags: newTags }));
      }
    }
    handleCloseTagMenu();
  };
  const handleRemoveTag = async (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    if (!isEditing) {
      await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags: newTags }));
    }
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
        <h1 style="font-size: 2.2rem; font-weight: 900; color: #4a4a4a; margin-bottom: 20px; border-bottom: 2px solid #427c36; padding-bottom: 10px;">${title || 'Untitled Document'}</h1>
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




  // Use a ref to track isEditing so the native event listener always reads the latest value
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Native click listener on the Quill ql-editor root — this is where images actually live.
  // Attached after the document changes so quillRef is populated.
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor?.();
    if (!editor) return;
    const editorRoot = editor.root; // this is the .ql-editor <div>

    const nativeHandler = (e) => {
      const target = e.target;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        if (!isEditingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          const src = target.src || target.currentSrc || target.getAttribute('src') || '';
          setSelectedMedia({ type: target.tagName.toLowerCase(), src });
        }
      }
    };

    editorRoot.addEventListener('click', nativeHandler, true);
    return () => editorRoot.removeEventListener('click', nativeHandler, true);
  }, [selectedDocument]); // re-attach when document changes (new editor content)

  const handleEditorClick = (e) => {
    if (overlayRef.current && overlayRef.current.contains(e.target)) return;

    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      if (!isEditing) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedMedia({ type: e.target.tagName.toLowerCase(), src: e.target.src || e.target.currentSrc });
      } else {
        setMediaEditNode(e.target);
        setTableEditNode(null);
        setTableOverlayStyle(null);
      }
    } else if (isEditing) {
      const table = e.target.closest('table');
      if (table) {
        setTableEditNode(table);
        setMediaEditNode(null);
        setOverlayStyle(null);
        
        // Calculate position for table floating menu
        if (editorContainerRef.current) {
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          const tableRect = table.getBoundingClientRect();
          setTableOverlayStyle({
            top: tableRect.top - containerRect.top - 45, // 45px above table
            left: tableRect.left - containerRect.left + (tableRect.width / 2) - 150 // centered
          });
        }
      } else {
        // Clicked somewhere else in the editor
        setMediaEditNode(null);
        setOverlayStyle(null);
        setTableEditNode(null);
        setTableOverlayStyle(null);
      }
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

  const deleteMedia = useCallback(() => {
    if (mediaEditNode && quillRef.current) {
      const node = mediaEditNode;
      const quill = quillRef.current.getEditor();
      try {
        const blot = Quill.find(node);
        if (blot) {
          const index = blot.offset(quill.scroll);
          quill.deleteText(index, 1, 'user');
        }
      } catch (err) {
        console.error("Error deleting blot:", err);
      }
      if (node && node.parentNode) {
        node.remove();
      }
      setContent(quill.root.innerHTML);
      setMediaEditNode(null);
      setOverlayStyle(null);
    }
  }, [mediaEditNode]);

  useEffect(() => {
    if (!mediaEditNode) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteMedia();
      } else if (e.key === 'Escape') {
        setMediaEditNode(null);
        setOverlayStyle(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaEditNode, deleteMedia]);

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
    clipboard: { matchVisual: false }, // Prevent Quill from stripping HTML styling
    table: true,
    toolbar: {
      container: [
          [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'direction': 'rtl' }, { 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video', 'table'],
          ['undo', 'redo', 'clean']
        ],
      handlers: {
        image: imageHandler,
        table: function() { if (openTableDialogRef.current) openTableDialogRef.current(); },
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
      className="h-full flex flex-col p-2 sm:p-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm relative"
    >
      {/* ── 2-Row Header ──────────────────────────────────── */}
      <Box className="flex flex-col gap-0. mb-1.5 sm:mb-2">

        {/* Row 1: Back button (mobile) + full-width title */}
        <Box className="flex items-center gap-1 min-w-0">
          {onBackToLibrary && (
            <Tooltip title="Back to Library">
              <IconButton 
                id={`doc-back-library-btn-${documentId}`}
                aria-label="Back to Library"
                onClick={onBackToLibrary} 
                size="small"
                className="md:hidden shrink-0" 
                sx={{ color: '#427c36', bgcolor: 'rgba(255,255,255,0.85)', p: '6px', borderRadius: '10px', '&:hover': { bgcolor: '#f0fdf4' } }}
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
              fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }, 
              fontWeight: '900', 
              color: '#1f2937', 
              letterSpacing: '-0.02em',
              opacity: isEditing ? 1 : 0.9,
              lineHeight: 1.1,
              flex: 1,
            }}
            fullWidth
          />
        </Box>

          <Box className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
            {tags && tags.map((tag, idx) => {
              const tagColor = getTagColor(tag);
              return (
                <Chip 
                  key={idx} 
                  label={tag} 
                  size="small" 
                  onDelete={isEditing ? () => handleRemoveTag(tag) : undefined}
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
                  <IconButton size="small" onClick={handleOpenTagMenu} sx={{ p: '2px', bgcolor: 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }} className="dark:bg-gray-800 dark:hover:bg-gray-700">
                    <LocalOfferIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                  </IconButton>
                </Tooltip>
                <Popover
                  open={Boolean(tagAnchorEl)}
                  anchorEl={tagAnchorEl}
                  onClose={handleCloseTagMenu}
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
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                      autoFocus
                      slotProps={{ input: { className: 'dark:text-white' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#d1d5db' }, '&:hover fieldset': { borderColor: '#427c36' }, '&.Mui-focused fieldset': { borderColor: '#427c36' } } }}
                    />
                    <Button variant="contained" onClick={handleAddTag} sx={{ bgcolor: '#427c36', '&:hover': { bgcolor: '#326127' }, textTransform: 'none', minWidth: '60px' }}>
                      Add
                    </Button>
                  </Box>
                </Popover>
              </>
            )}
          </Box>

          {/* Row 2: Action icon buttons (no borders, larger) + close */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end', mt: -.99}}>

          {/* History */}
          {/* A4 Print Layout Toggle */}
            <Tooltip title={isA4Mode ? 'Exit A4 Layout' : 'A4 Print Layout'}>
              <IconButton onClick={() => setIsA4Mode(!isA4Mode)}
                sx={{ color: isA4Mode ? '#f59e0b' : '#8b5cf6', bgcolor: isA4Mode ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.06)', '&:hover': { bgcolor: isA4Mode ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s', mr: 0.75 }}>
                {isA4Mode ? <CloseFullscreenIcon sx={{ fontSize: 18 }} /> : <ArticleIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="History">
            <IconButton onClick={() => setHistoryOpen(true)}
              sx={{ color: '#9c27b0', bgcolor: 'rgba(156,39,176,0.06)', '&:hover': { bgcolor: 'rgba(156,39,176,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Read Mode */}
          <Tooltip title="Read Mode">
            <IconButton onClick={() => dispatch(setGlobalReadMode(true))}
              sx={{ color: '#427c36', bgcolor: 'rgba(66,124,54,0.06)', '&:hover': { bgcolor: 'rgba(66,124,54,0.13)', transform: 'translateY(-1px)' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
              <RemoveRedEyeOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Download PDF */}
          <Tooltip title={isDownloading ? 'Downloading...' : 'Download PDF'}>
            <span>
              <IconButton onClick={handleDownloadPdf} disabled={isDownloading}
                sx={{ color: '#3b82f6', bgcolor: 'rgba(59,130,246,0.06)', '&:hover': { bgcolor: 'rgba(59,130,246,0.13)', transform: 'translateY(-1px)' }, '&.Mui-disabled': { color: '#d1d5db', bgcolor: 'transparent' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
                <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Divider */}
          <Box sx={{ width: '1px', height: 24, bgcolor: '#e5e7eb', mx: 0.5 }} />

          {/* Edit / Import + Save */}
          {!isEditing ? (
            <Tooltip title="Edit Document">
              <IconButton onClick={() => setIsEditing(true)}
                sx={{ 
                  color: 'white',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #3b82f6 0%, #326127 100%)', transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(66,124,54,0.4)' },
                  p: '5px', borderRadius: '10px', boxShadow: '0 3px 10px rgba(66,124,54,0.3)', transition: 'all 0.2s'
                }}>
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Tooltip title={isImporting ? 'Importing...' : 'Import File'}>
                <span>
                  <IconButton onClick={handleImportClick} disabled={isImporting}
                    sx={{ color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)', '&:hover': { bgcolor: 'rgba(99,102,241,0.13)', transform: 'translateY(-1px)' }, '&.Mui-disabled': { color: '#d1d5db', bgcolor: 'transparent' }, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
                    <UploadFileIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <input type="file" ref={fileInputRef} hidden onChange={handleFileImport}
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
              {/* Save — highlighted prominently */}
              <Tooltip title={isSaving ? 'Saving...' : 'Save Document'}>
                <span>
                  <IconButton onClick={handleSave} disabled={isSaving}
                    sx={{ 
                      color: 'white',
                      background: isSaving
                        ? 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)'
                        : 'linear-gradient(135deg, #427c36 0%, #326127 100%)',
                      boxShadow: '0 3px 12px rgba(66,124,54,0.45)',
                      '&:hover': { 
                        background: 'linear-gradient(135deg, #326127 0%, #1f4d1d 100%)',
                        boxShadow: '0 6px 18px rgba(66,124,54,0.55)',
                        transform: 'translateY(-2px)'
                      },
                      '&.Mui-disabled': { background: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' },
                      p: '5px', borderRadius: '10px', transition: 'all 0.2s'
                    }}>
                    <CloudDoneOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}

          {/* Close */}
          <Tooltip title="Close Document">
            <IconButton onClick={() => dispatch(removeOpenDocument(documentId))}
              sx={{ color: '#ef4444', bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca', transform: 'translateY(-1px)' }, ml: 0.5, p: '5px', borderRadius: '10px', transition: 'all 0.2s' }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box className="flex-1 flex flex-col gap-3 sm:gap-1 min-h-1 relative">
        <Paper 
          ref={editorContainerRef}
          elevation={0} 
          sx={{ backgroundColor: 'transparent' }}
          onClickCapture={handleEditorClick}
          className={`flex-1 rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-900/80 shadow-sm dark:shadow-none flex flex-col relative ${isEditing ? 'border-2 border-[#427c36]' : 'border border-green-100 dark:border-green-900'} ${!isEditing ? 'editor-readonly' : ''}`}
        >
        {isEditing && (
          <Tooltip title={isListening ? "Stop Dictation" : "Dictate"}>
            <IconButton
              onClick={toggleListen}
              sx={{
                position: 'absolute',
                top: 3,
                right: 10,
                zIndex: 10,
                color: isListening ? 'white' : '#326127',
                bgcolor: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.9)',
                border: isListening ? 'none' : '1px solid #326127',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: isListening ? '#dc2626' : '#f0fdf4',
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
          className={`flex-1 flex flex-col min-h-0 custom-quill ${isA4Mode ? 'a4-mode' : ''}`}
        />
          {/* Interactive Table Edit Overlay */}
          {isEditing && tableOverlayStyle && tableEditNode && (
            <Box sx={{ position: 'absolute', top: tableOverlayStyle.top, left: tableOverlayStyle.left, zIndex: 60 }}>
              <Paper elevation={4} className="flex items-center gap-1 p-1 rounded-lg bg-white/90 backdrop-blur-md border border-green-200">
                <Tooltip title="Insert Row Above"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').insertRowAbove(); }}><TableRowsIcon fontSize="small" color="primary" sx={{ transform: 'rotate(180deg)' }}/></IconButton></Tooltip>
                <Tooltip title="Insert Row Below"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').insertRowBelow(); }}><TableRowsIcon fontSize="small" color="primary" /></IconButton></Tooltip>
                <Box sx={{ width: '1px', height: '24px', bgcolor: 'divider', mx: 0.5 }} />
                <Tooltip title="Insert Column Left"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').insertColumnLeft(); }}><ViewColumnIcon fontSize="small" color="secondary" sx={{ transform: 'rotate(180deg)' }}/></IconButton></Tooltip>
                <Tooltip title="Insert Column Right"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').insertColumnRight(); }}><ViewColumnIcon fontSize="small" color="secondary" /></IconButton></Tooltip>
                <Box sx={{ width: '1px', height: '24px', bgcolor: 'divider', mx: 0.5 }} />
                <Tooltip title="Delete Row"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').deleteRow(); }}><DeleteOutlineIcon fontSize="small" color="error" /></IconButton></Tooltip>
                <Tooltip title="Delete Column"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').deleteColumn(); }}><DeleteOutlineIcon fontSize="small" color="error" /></IconButton></Tooltip>
                <Tooltip title="Delete Table"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => { if(quillRef.current) quillRef.current.getEditor().getModule('table').deleteTable(); setTableEditNode(null); }}><GridOnIcon fontSize="small" color="error" /></IconButton></Tooltip>
              </Paper>
            </Box>
          )}

        
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
        {(isEditing || (selectedDocument.attachments && selectedDocument.attachments.length > 0) || pendingAttachments.length > 0) && (
          <Box className="w-full flex items-center gap-2 p-1 bg-white/60 rounded-lg overflow-x-auto shrink-0 border border-green-100 dark:border-green-900">
            {selectedDocument.attachments && selectedDocument.attachments.length > 0 && (
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 'bold', fontSize: '10px', mr: 0.5, textTransform: 'uppercase' }}>Attachments:</Typography>
            )}
            
            {pendingAttachments.map((file, idx) => (
              <Tooltip title={`${file.name} (Pending Save)`} key={`pending-${idx}`} arrow>
                <Box className="relative group flex items-center justify-center p-1.5 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 shadow-sm opacity-80 hover:opacity-100 transition-all">
                  {getAttachmentIcon(file.type, file.name)}
                  {isEditing && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePendingAttachment(idx); }} 
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
            {selectedDocument.attachments && selectedDocument.attachments.map(att => (
              <Tooltip title={att.name} key={att._id} arrow>
                <Box className="relative group flex items-center justify-center p-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-none hover:shadow hover:bg-gray-50 dark:bg-gray-800 transition-all">
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
                      border: '1px dashed #427c36', color: '#427c36', borderRadius: '8px',
                      p: '6px', '&:hover': { bgcolor: '#f0fdf4' }
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
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden'
            }
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
          {selectedMedia?.type === 'img' && (
            <img src={selectedMedia.src} alt="Detail view" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
          )}
          {selectedMedia?.type === 'video' && (
            <video src={selectedMedia.src} controls style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px' }} />
          )}
        </Box>
      </Dialog>
      
      
      
        {/* Table Dimension Grid Popover */}
        <Popover
          open={Boolean(tablePopoverAnchor)}
          anchorEl={tablePopoverAnchor}
          onClose={() => setTablePopoverAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { className: 'p-4 rounded-xl shadow-2xl dark:bg-gray-800 border dark:border-gray-700' } }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: 'text.secondary', textAlign: 'center' }}>
            {hoveredGrid.cols > 0 && hoveredGrid.rows > 0 ? `${hoveredGrid.cols}x${hoveredGrid.rows} Table` : 'Insert Table'}
          </Typography>
          <Box className="flex flex-col gap-1" onMouseLeave={() => setHoveredGrid({rows: 0, cols: 0})}>
            {[...Array(10)].map((_, rowIndex) => (
              <Box key={rowIndex} className="flex gap-1">
                {[...Array(10)].map((_, colIndex) => {
                  const isHovered = rowIndex < hoveredGrid.rows && colIndex < hoveredGrid.cols;
                  return (
                    <Box 
                      key={colIndex} 
                      onMouseEnter={() => setHoveredGrid({rows: rowIndex + 1, cols: colIndex + 1})}
                      onClick={() => {
                        if (quillRef.current) {
                          const quill = quillRef.current.getEditor();
                          quill.focus();
                          quill.setSelection(tableInsertIndex, 0);
                          const tableModule = quill.getModule('table');
                          if (tableModule) {
                            tableModule.insertTable(rowIndex + 1, colIndex + 1);
                          }
                        }
                        setTablePopoverAnchor(null);
                      }}
                      className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${isHovered ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/60 dark:border-blue-500' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                    />
                  )
                })}
              </Box>
            ))}
          </Box>
        </Popover>

<Dialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 2 } } }}
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
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: '#f3f4f6', borderRadius: 1, borderLeft: '3px solid #427c36' }}>
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
