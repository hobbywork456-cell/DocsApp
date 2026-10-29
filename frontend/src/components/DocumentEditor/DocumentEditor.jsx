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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AIAssistant from './AIAssistant';
import { toComparableText } from '../../utils/docText';
import { setSubscriptionModalOpen } from '../../slices/subscriptionSlice';
import {
  downloadDocAsPdf,
  downloadDocAsWord,
  downloadDocAsText,
  downloadSheetAsXlsx,
  downloadSheetAsCsv,
  downloadSheetAsPdf,
  downloadPptAsPptx,
  downloadPptAsPdf
} from '../../utils/documentExporter';

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

// Register custom style-based Parchment attributors for full Word/Docs styling support.
// Quill 2 ships Parchment v3, which exports StyleAttributor / ClassAttributor directly
// (the v1 `Parchment.Attributor.Style` path no longer exists).
try {
  const Parchment = Quill.import('parchment');
  const StyleAttributor = Parchment.StyleAttributor || Parchment.Attributor?.Style;
  const ClassAttributor = Parchment.ClassAttributor || Parchment.Attributor?.Class;
  const BLOCK = Parchment.Scope.BLOCK;
  const INLINE = Parchment.Scope.INLINE;

  // Browsers report multi-word families quoted ("Times New Roman"), which would fail the
  // whitelist and silently drop the font when a saved document is reopened.
  class FontFamilyAttributor extends StyleAttributor {
    value(node) {
      const v = (node.style.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
      return this.canAdd(node, v) ? v : '';
    }
  }
  const FontStyle = new FontFamilyAttributor('font', 'font-family', {
    scope: INLINE,
    whitelist: ['Calibri', 'Arial', 'Times New Roman', 'Roboto', 'Georgia', 'Courier New', 'Verdana', 'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Segoe UI']
  });
  const SizeStyle = new StyleAttributor('size', 'font-size', {
    scope: INLINE,
    whitelist: ['8pt', '9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '15pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt']
  });
  // Format names (first argument) must match the names the ribbon passes to quill.format()
  const LineHeightStyle = new StyleAttributor('lineHeight', 'line-height', { scope: BLOCK });
  const BlockBackground = new StyleAttributor('blockBackground', 'background-color', { scope: BLOCK });
  const BlockBorder = new StyleAttributor('blockBorder', 'border', { scope: BLOCK });
  const BlockBorderBottom = new StyleAttributor('blockBorderBottom', 'border-bottom', { scope: BLOCK });
  const UnderlineStyle = new StyleAttributor('underlineStyle', 'text-decoration-style', { scope: INLINE });
  // Bullet / numbering variants: adds ql-list-<style> to the <li>
  const ListStyle = new ClassAttributor('listStyle', 'ql-list', { scope: BLOCK });

  Quill.register({
    'formats/font': FontStyle,
    'formats/size': SizeStyle,
    'formats/lineHeight': LineHeightStyle,
    'formats/blockBackground': BlockBackground,
    'formats/blockBorder': BlockBorder,
    'formats/blockBorderBottom': BlockBorderBottom,
    'formats/underlineStyle': UnderlineStyle,
    'formats/listStyle': ListStyle
  }, true);

  // Horizontal rule and page break blocks (Quill 2 has no built-in divider blot)
  const BlockEmbed = Quill.import('blots/block/embed');
  class DividerBlot extends BlockEmbed {}
  DividerBlot.blotName = 'divider';
  DividerBlot.tagName = 'hr';
  class PageBreakBlot extends BlockEmbed {}
  PageBreakBlot.blotName = 'pagebreak';
  PageBreakBlot.tagName = 'hr';
  PageBreakBlot.className = 'page-break';
  Quill.register({ 'formats/divider': DividerBlot, 'formats/pagebreak': PageBreakBlot }, true);
} catch (e) {
  console.warn('Custom Quill format registration:', e);
}

const icons = Quill.import('ui/icons');
icons['undo'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`;
icons['redo'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>`;
icons['table'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;

import { updateDocument, removeOpenDocument, importDocumentContent, uploadImageFile, uploadAttachment, deleteAttachment, setGlobalReadMode } from '../../slices/documentSlice';
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
import SlideshowIcon from '@mui/icons-material/Slideshow';
import SpreadsheetEditor from './SpreadsheetEditor';
import PresentationEditor from './PresentationEditor';
import EditorHeader from './EditorHeader';
import WordRibbonToolbar from './WordRibbonToolbar';
import './DocumentEditor.css';

export const getTagColor = (tag) => {
  if (!tag) return '#a59a8c';
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
  const { groupStats, userStats } = useSelector((state) => state.subscription);
  const selectedDocument = documents.find(doc => doc._id === documentId);
  const isStorageExceeded = Boolean(groupStats?.isExceeded || userStats?.isExceeded);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [docType, setDocType] = useState('doc');
  const formatDraftsRef = useRef({});
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
  const [aiOpen, setAiOpen] = useState(false);
  // Last non-empty text selection in the editor; kept while focus moves into the AI panel
  const [aiSelection, setAiSelection] = useState({ index: 0, length: 0, text: '' });
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [mediaEditNode, setMediaEditNode] = useState(null);
  const [tableEditNode, setTableEditNode] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [docStats, setDocStats] = useState({ words: 0, chars: 0 });
  const [tableOverlayStyle, setTableOverlayStyle] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showParagraphMarks, setShowParagraphMarks] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const quillRef = useRef(null);
  const editorContainerRef = useRef(null);
  const overlayRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleInsertTableGrid = (rows, cols) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const tableModule = quill.getModule('table');
      if (tableModule) {
        tableModule.insertTable(rows, cols);
      }
    }
  };

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

  // Re-sync from the store when a different document opens, or when the stored copy changes while
  // the user is only viewing. Never while editing: attachment uploads/deletes and saves refresh the
  // store mid-edit, and resetting then would silently discard the user's unsaved changes.
  const syncedDocIdRef = useRef(null);
  useEffect(() => {
    if (!selectedDocument) return;
    const isNewDoc = syncedDocIdRef.current !== selectedDocument._id;
    if (!isNewDoc && isEditingRef.current) return;
    syncedDocIdRef.current = selectedDocument._id;
    if (selectedDocument) {
      setTitle(selectedDocument.title || '');
      setContent(selectedDocument.content || '');
      setTags(selectedDocument.tags || []);
      let detectedType = selectedDocument.docType || 'doc';
      if (!selectedDocument.docType && selectedDocument.content) {
        try {
          const parsed = JSON.parse(selectedDocument.content);
          if (parsed.sheets && Array.isArray(parsed.sheets)) {
            detectedType = 'sheet';
          } else if (parsed.slides && Array.isArray(parsed.slides)) {
            detectedType = 'ppt';
          }
        } catch {
          // Normal HTML
        }
      }
      setDocType(detectedType);
      formatDraftsRef.current[detectedType] = selectedDocument.content || '';
      if (isNewDoc) {
        setIsEditing(false);
        setPendingAttachments([]);
      }
    }
  }, [selectedDocument]);

  // Live word / character count for the status bar (debounced so typing stays smooth)
  useEffect(() => {
    if (docType !== 'doc') return undefined;
    const t = setTimeout(() => {
      const text = (quillRef.current?.getEditor?.().getText() || '').trim();
      setDocStats({ words: text ? text.split(/\s+/).length : 0, chars: text.replace(/\n/g, '').length });
    }, 250);
    return () => clearTimeout(t);
  }, [content, docType]);

  const handleDocTypeChange = (newType) => {
    if (newType === docType) return;
    formatDraftsRef.current[docType] = content;
    setDocType(newType);
    if (formatDraftsRef.current[newType]) {
      setContent(formatDraftsRef.current[newType]);
    }
    setIsEditing(true);
  };

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

  // Track the editor selection so AI actions can work on "just the selected text"
  useEffect(() => {
    if (docType !== 'doc' || !quillRef.current) return undefined;
    const quill = quillRef.current.getEditor();
    const onSelection = (range) => {
      if (!range) return; // focus moved elsewhere (e.g. into the AI panel): keep the last selection
      setAiSelection(range.length > 0
        ? { index: range.index, length: range.length, text: quill.getText(range.index, range.length) }
        : { index: range.index, length: 0, text: '' });
    };
    quill.on('selection-change', onSelection);
    return () => quill.off('selection-change', onSelection);
  }, [docType, selectedDocument?._id]);

  // What the AI reads: selection (docs) plus a plain-text view of the whole document/sheet/deck
  const getAiContext = useCallback(() => {
    const documentText = docType === 'doc'
      ? (quillRef.current?.getEditor?.().getText() || '')
      : toComparableText({ docType, content });
    return { docType, title, selection: docType === 'doc' ? aiSelection.text : '', documentText };
  }, [docType, title, content, aiSelection.text]);

  const handleAiInsert = useCallback((html, { replace } = {}) => {
    if (!quillRef.current) return;
    const insert = () => {
      const quill = quillRef.current.getEditor();
      const sel = aiSelection;
      let index;
      if (replace && sel.length > 0) {
        quill.deleteText(sel.index, sel.length, 'user');
        index = sel.index;
      } else if (sel.length > 0) {
        // "Insert below": start a new paragraph after the selected text
        index = sel.index + sel.length;
        quill.insertText(index, '\n', 'user');
        index += 1;
      } else {
        index = Math.min(sel.index || quill.getLength() - 1, quill.getLength() - 1);
      }
      const before = quill.getLength();
      quill.clipboard.dangerouslyPasteHTML(index, html, 'user');
      const inserted = quill.getLength() - before;
      quill.setSelection(index, Math.max(0, inserted), 'user');
      setAiSelection({ index, length: Math.max(0, inserted), text: quill.getText(index, Math.max(0, inserted)) });
    };
    // Inserting needs edit mode; switch to it first so the change is undoable and saved normally
    if (!isEditing) {
      setIsEditing(true);
      setTimeout(insert, 50);
    } else {
      insert();
    }
  }, [aiSelection, isEditing]);

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

  const getAttachmentIcon = (type, filename, size = 16) => {
    const sx = { fontSize: size };
    if (type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return <PictureAsPdfIcon sx={{ ...sx, color: '#ef4444' }} />;
    if (type.includes('spreadsheet') || type.includes('excel') || filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) return <TableChartIcon sx={{ ...sx, color: 'var(--c-ink2)' }} />;
    return <DescriptionIcon sx={{ ...sx, color: '#6b7f94' }} />;
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsImporting(true);
      try {
        const resultAction = await dispatch(importDocumentContent(file));
        if (importDocumentContent.fulfilled.match(resultAction)) {
          const payload = resultAction.payload;
          const importedType = payload.docType || 'doc';
          const importedContent = payload.content !== undefined ? payload.content : payload.html;

          setDocType(importedType);
          setContent(importedContent);

          let updatedTitle = title;
          if (!title || title.toLowerCase().includes('untitled') || title.trim() === '') {
            updatedTitle = payload.title || title;
            setTitle(updatedTitle);
          }

          if (selectedDocument) {
            await dispatch(updateDocument({
              id: selectedDocument._id,
              title: updatedTitle,
              content: importedContent,
              tags,
              docType: importedType
            }));
          }
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

    const result = await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags, docType }));
    setIsSaving(false);
    if (updateDocument.rejected.match(result)) {
      // Stay in edit mode so nothing is lost; the user can retry or copy their work
      alert(`Your changes were not saved: ${result.payload || 'please try again.'}`);
      return;
    }
    setIsEditing(false);
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S for instant smooth save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (isEditing && !isSaving && !isStorageExceeded) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isSaving, isStorageExceeded, title, content, tags, docType, selectedDocument]);

  
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
        await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags: newTags, docType }));
      }
    }
    handleCloseTagMenu();
  };
  const handleRemoveTag = async (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    if (!isEditing) {
      await dispatch(updateDocument({ id: selectedDocument._id, title, content, tags: newTags, docType }));
    }
  };

  const handleDownloadFormat = async (format) => {
    if (!selectedDocument) return;
    setIsDownloading(true);
    try {
      if (docType === 'sheet') {
        if (format === 'xlsx') {
          downloadSheetAsXlsx(title, content);
        } else if (format === 'csv') {
          downloadSheetAsCsv(title, content);
        } else {
          await downloadSheetAsPdf(title, content);
        }
      } else if (docType === 'ppt') {
        if (format === 'pptx') {
          await downloadPptAsPptx(title, content);
        } else {
          await downloadPptAsPdf(title, content);
        }
      } else {
        // docType === 'doc'
        if (format === 'doc' || format === 'docx') {
          downloadDocAsWord(title, content);
        } else if (format === 'txt') {
          downloadDocAsText(title, content);
        } else {
          await downloadDocAsPdf(title, content);
        }
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = () => handleDownloadFormat('pdf');

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
    toolbar: false
  }), []);

    if (!selectedDocument) return null;



  return (
    <Box 
      component="article" 
      id={`document-editor-article-${documentId}`} 
      aria-label={`Document Editor for ${title || 'Untitled Document'}`}
      className="h-full flex flex-col p-2 sm:p-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm relative"
    >
      {/* Modular Editor Header with Title, Model Switcher, Actions, and Storage Notice */}
      <EditorHeader
        documentId={documentId}
        title={title}
        setTitle={setTitle}
        tags={tags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        tagAnchorEl={tagAnchorEl}
        onOpenTagMenu={handleOpenTagMenu}
        onCloseTagMenu={handleCloseTagMenu}
        newTagInput={newTagInput}
        setNewTagInput={setNewTagInput}
        docType={docType}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isSaving={isSaving}
        onSave={handleSave}
        isA4Mode={isA4Mode}
        setIsA4Mode={setIsA4Mode}
        isDownloading={isDownloading}
        onDownloadPdf={handleDownloadPdf}
        onDownloadFormat={handleDownloadFormat}
        onHistoryOpen={() => setHistoryOpen(true)}
        onAiOpen={() => setAiOpen(true)}
        onImportClick={handleImportClick}
        fileInputRef={fileInputRef}
        onFileImport={handleFileImport}
        isImporting={isImporting}
        onCloseDoc={() => dispatch(removeOpenDocument(documentId))}
        onBackToLibrary={onBackToLibrary}
        isStorageExceeded={isStorageExceeded}
        onUpgradeClick={() => dispatch(setSubscriptionModalOpen(true))}
        onReadModeOpen={async () => {
          if (isEditing) {
            await handleSave();
          }
          dispatch(setGlobalReadMode(documentId));
        }}
      />

      <Box className="flex-1 flex flex-col gap-3 sm:gap-1 min-h-1 relative">
        <Paper 
          ref={editorContainerRef}
          elevation={0} 
          sx={{ backgroundColor: 'transparent' }}
          onClickCapture={handleEditorClick}
          className={`flex-1 rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-900/80 shadow-sm dark:shadow-none flex flex-col relative ${isEditing ? 'border-2 border-[var(--c-accent)]' : 'border border-green-100 dark:border-green-900'} ${!isEditing ? 'editor-readonly' : ''}`}
        >
          {docType === 'sheet' ? (
            <SpreadsheetEditor
              content={content}
              onChange={(newContent) => {
                setContent(newContent);
              }}
              readOnly={!isEditing}
            />
          ) : docType === 'ppt' ? (
            <PresentationEditor
              content={content}
              docTitle={title}
              onChange={(newContent) => {
                setContent(newContent);
              }}
              readOnly={!isEditing}
            />
          ) : (
            <>
              {isEditing && (
                <WordRibbonToolbar
                  quillRef={quillRef}
                  isListening={isListening}
                  toggleListen={toggleListen}
                  content={content}
                  onInsertImage={imageHandler}
                  onInsertTable={handleInsertTableGrid}
                  showParagraphMarks={showParagraphMarks}
                  setShowParagraphMarks={setShowParagraphMarks}
                />
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
                style={{ '--doc-zoom': zoom / 100 }}
                className={`flex-1 flex flex-col min-h-0 custom-quill ${isA4Mode ? 'a4-mode' : ''} ${showParagraphMarks ? 'show-paragraph-marks' : ''}`}
              />
              {/* Word-style status bar */}
              <Box className="doc-status-bar">
                <span>Page {Math.max(1, Math.ceil(docStats.words / 500))} est.</span>
                <span className="doc-status-sep" />
                <span>{docStats.words.toLocaleString()} {docStats.words === 1 ? 'word' : 'words'}</span>
                <span className="doc-status-sep" />
                <span>{docStats.chars.toLocaleString()} characters</span>
                {!isEditing && <span className="doc-status-mode">Read-only · click Edit to make changes</span>}
                <Box className="doc-status-zoom">
                  <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="Zoom out">−</button>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={10}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    aria-label="Zoom"
                  />
                  <button type="button" onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="Zoom in">+</button>
                  <span className="doc-status-zoom-label" onClick={() => setZoom(100)} title="Reset to 100%">{zoom}%</span>
                </Box>
              </Box>
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
                      bgcolor: 'var(--c-card)'
                    }}
                  >
                    <Tooltip title="Align Left">
                      <IconButton size="small" onClick={() => alignMedia('left')} sx={{ color: 'var(--c-muted)', p: 0.5, '&:hover': { bgcolor: 'var(--c-surface2)', color: 'var(--c-ink)' } }}>
                        <FormatAlignLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Align Center">
                      <IconButton size="small" onClick={() => alignMedia('center')} sx={{ color: 'var(--c-muted)', p: 0.5, '&:hover': { bgcolor: 'var(--c-surface2)', color: 'var(--c-ink)' } }}>
                        <FormatAlignCenterIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Align Right">
                      <IconButton size="small" onClick={() => alignMedia('right')} sx={{ color: 'var(--c-muted)', p: 0.5, '&:hover': { bgcolor: 'var(--c-surface2)', color: 'var(--c-ink)' } }}>
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
            </>
          )}
        </Paper>

        {/* Attachments Bar (Below Editor) — Ultra-Compact & Premium */}
        {(isEditing || (selectedDocument.attachments && selectedDocument.attachments.length > 0) || pendingAttachments.length > 0) && (
          <Box className="w-full flex items-center gap-1.5 px-2 py-1 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-800 shadow-2xs shrink-0 overflow-x-auto min-h-[32px]">
            <Box className="flex items-center gap-1 shrink-0 text-gray-500 dark:text-gray-400 mr-0.5">
              <AttachFileIcon sx={{ fontSize: 12, color: 'var(--c-accent)' }} />
              <Typography variant="caption" sx={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Attachments
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5, opacity: 0.5 }} />

            <Box className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5">
              {/* Pending Attachments */}
              {pendingAttachments.map((file, idx) => (
                <Tooltip title={`${file.name} (Click save to upload)`} key={`pending-${idx}`} arrow>
                  <Box className="group flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-2xs text-amber-900 dark:text-amber-200 text-xs shrink-0 transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60">
                    {getAttachmentIcon(file.type, file.name, 14)}
                    <Typography variant="caption" className="font-semibold truncate max-w-[120px] text-[11px]">
                      {file.name}
                    </Typography>
                    <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-200/70 dark:bg-amber-800/80 text-amber-800 dark:text-amber-100">
                      Pending
                    </span>
                    {isEditing && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePendingAttachment(idx); }} 
                        sx={{ p: '1px', ml: 0.2, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' } }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </Box>
                </Tooltip>
              ))}

              {/* Saved Attachments */}
              {selectedDocument.attachments && selectedDocument.attachments.map(att => (
                <Tooltip title={`Download ${att.name}`} key={att._id} arrow>
                  <Box className="group flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs hover:shadow-sm text-gray-800 dark:text-gray-200 text-xs shrink-0 transition-all hover:border-green-300 dark:hover:border-green-700">
                    <a 
                      href={import.meta.env.VITE_API_URL.replace('/api', '') + att.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-1 hover:underline text-gray-700 dark:text-gray-200"
                    >
                      {getAttachmentIcon(att.type, att.name, 14)}
                      <Typography variant="caption" className="font-medium truncate max-w-[130px] text-[11px]">
                        {att.name}
                      </Typography>
                    </a>
                    {isEditing && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAttachment(att._id); }} 
                        sx={{ p: '1px', ml: 0.2, color: '#a59a8c', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' } }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </Box>
                </Tooltip>
              ))}

              {/* Add Attachment Button (Inline Pill Chip) */}
              {isEditing && (
                <>
                  <Tooltip title="Attach a file" arrow>
                    <Button
                      size="small"
                      onClick={handleAttachmentClick}
                      disabled={isUploadingAttachment}
                      startIcon={<AttachFileIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        textTransform: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        py: '2px',
                        px: '8px',
                        minHeight: '22px',
                        borderRadius: '8px',
                        border: '1px dashed #5b7262',
                        color: 'var(--c-accent)',
                        bgcolor: 'rgba(104, 127, 110, 0.04)',
                        '&:hover': {
                          bgcolor: 'rgba(104, 127, 110, 0.1)',
                          borderColor: 'var(--c-ink2)'
                        },
                        shrink: 0
                      }}
                    >
                      {isUploadingAttachment ? 'Uploading...' : 'Attach File'}
                    </Button>
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
            sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'var(--c-card-a)', '&:hover': { bgcolor: 'var(--c-card)' }, zIndex: 10 }}
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
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: '#f2ede6', borderRadius: 1, borderLeft: '3px solid #5b7262' }}>
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
      <AIAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        docType={docType}
        getContext={getAiContext}
        selectionText={docType === 'doc' ? aiSelection.text : ''}
        onInsert={handleAiInsert}
        canInsert={docType === 'doc' && !isStorageExceeded}
      />
    </Box>
  );
};

export default DocumentEditor;
