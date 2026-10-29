import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Skeleton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import GroupIcon from '@mui/icons-material/Group';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import LockIcon from '@mui/icons-material/Lock';
import { useSelector, useDispatch } from 'react-redux';
import {
  createDocument,
  deleteDocument,
  setOpenDocument,
  addOpenDocument,
  setSearchQuery,
  importDocumentContent
} from '../../slices/documentSlice';
import { setActiveGroupId } from '../../slices/groupSlice';
import { setSubscriptionModalOpen } from '../../slices/subscriptionSlice';
import StorageIndicator from '../Subscription/StorageIndicator';
import './Sidebar.css';

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


const Sidebar = ({ onSelectDocument, onToggle, isSidebarOpen }) => {
  const dispatch = useDispatch();
  const { documents, allUserDocuments, openDocuments, searchQuery, status: docStatus } = useSelector((state) => state.documents);
  const { groups, activeGroupId } = useSelector((state) => state.groups);
  const groupNameMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.groupId, g.name])), [groups]);
  const { groupStats, userStats } = useSelector((state) => state.subscription);
  const isStorageExceeded = Boolean(groupStats?.isExceeded || userStats?.isExceeded);

  // Extract all unique tags across accessible documents for quick tag filtering
  const availableTags = useMemo(() => {
    const tagCountMap = {};
    const pool = (allUserDocuments && allUserDocuments.length > 0) ? allUserDocuments : documents;
    pool.forEach(doc => {
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach(t => {
          if (t && typeof t === 'string') {
            const clean = t.trim();
            if (clean) tagCountMap[clean] = (tagCountMap[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(tagCountMap).map(([tag, count]) => ({ tag, count }));
  }, [allUserDocuments, documents]);

  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // Pinned docs (stored in localStorage per group)
  const storageKey = `pinnedDocs_${activeGroupId}`;
  const orderKey = `docOrder_${activeGroupId}`;
  const [pinnedDocs, setPinnedDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [docOrder, setDocOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(orderKey) || '[]'); } catch { return []; }
  });
  const [dragOverId, setDragOverId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const togglePin = (e, docId) => {
    e.stopPropagation();
    const next = pinnedDocs.includes(docId)
      ? pinnedDocs.filter(id => id !== docId)
      : [...pinnedDocs, docId];
    setPinnedDocs(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const handleListDragStart = (e, docId) => {
    setDraggingId(docId);
    e.dataTransfer.setData('sidebarReorder', docId);
    // Also keep original editor drag
    e.dataTransfer.setData('documentId', docId);
  };

  const handleListDragOver = (e, docId) => {
    e.preventDefault();
    if (docId !== draggingId) setDragOverId(docId);
  };

  const handleListDrop = (e, targetId) => {
    const sourceId = e.dataTransfer.getData('sidebarReorder');
    if (!sourceId || sourceId === targetId) { setDragOverId(null); setDraggingId(null); return; }

    // Rely on current visual order so cross-boundary drags work predictably
    const currentVisualOrder = filteredDocuments.map(d => d._id);
    const fromIdx = currentVisualOrder.indexOf(sourceId);
    const toIdx = currentVisualOrder.indexOf(targetId);

    if (fromIdx < 0 || toIdx < 0) { setDragOverId(null); setDraggingId(null); return; }

    const isTargetPinned = pinnedDocs.includes(targetId);
    const isSourcePinned = pinnedDocs.includes(sourceId);
    let nextPinned = [...pinnedDocs];

    // Automatically Pin or Unpin if dragged across boundaries
    if (isTargetPinned && !isSourcePinned) {
      nextPinned.push(sourceId);
    } else if (!isTargetPinned && isSourcePinned) {
      nextPinned = nextPinned.filter(id => id !== sourceId);
    }

    setPinnedDocs(nextPinned);
    localStorage.setItem(storageKey, JSON.stringify(nextPinned));

    const newOrder = [...currentVisualOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, sourceId);

    setDocOrder(newOrder);
    localStorage.setItem(orderKey, JSON.stringify(newOrder));

    setDragOverId(null);
    setDraggingId(null);
  };

  const handleDuplicate = async (e, doc) => {
    e.stopPropagation();
    if (isStorageExceeded) {
      dispatch(setSubscriptionModalOpen(true));
      return;
    }
    const actionResult = await dispatch(createDocument({
      title: `Copy of ${doc.title || 'Untitled'}`,
      content: doc.content,
      tags: doc.tags || [],
      groupId: activeGroupId,
      docType: doc.docType || 'doc'
    }));

    if (createDocument.fulfilled.match(actionResult)) {
      const newDocId = actionResult.payload._id;
      // Ensure the original doc is the first one opened
      dispatch(setOpenDocument(doc._id));
      // Add the new duplicate as the second open document
      dispatch(addOpenDocument(newDocId));
    }
  };

  const handleListDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
  };

  const isSearching = Boolean(searchQuery && searchQuery.trim());

  // Search across all accessible user documents if available, otherwise current group documents
  const searchPool = (isSearching && allUserDocuments && allUserDocuments.length > 0)
    ? allUserDocuments
    : documents;

  const rawFiltered = searchPool.filter((doc) => {
    if (!isSearching) return true;
    const trimmedQuery = searchQuery.trim().toLowerCase();

    // Support searching with "#" or "tag:" prefix, or plain keyword
    const isTagPrefixed = trimmedQuery.startsWith('#') || trimmedQuery.startsWith('tag:') || trimmedQuery.startsWith('tags:');
    const cleanTagQuery = trimmedQuery
      .replace(/^#+/, '')
      .replace(/^tags?:\s*/, '')
      .trim();

    // Check if any tag on the document matches
    const matchesTag = Array.isArray(doc.tags) && doc.tags.some((tag) => {
      if (!tag) return false;
      const lowerTag = String(tag).trim().toLowerCase();
      return (
        lowerTag === trimmedQuery ||
        lowerTag === cleanTagQuery ||
        lowerTag.includes(trimmedQuery) ||
        (cleanTagQuery && lowerTag.includes(cleanTagQuery))
      );
    });

    if (isTagPrefixed) {
      if (!cleanTagQuery) {
        return Array.isArray(doc.tags) && doc.tags.length > 0;
      }
      return matchesTag;
    }

    const matchesTitle = doc.title && doc.title.toLowerCase().includes(trimmedQuery);
    const matchesContent = doc.content && doc.content.toLowerCase().includes(trimmedQuery);

    return Boolean(matchesTag || matchesTitle || matchesContent);
  });

  // When searching, sort documents that match by tag first, then by recency
  // If multiple documents have the same tag, ALL of them are retained and listed one by one
  const sortedSearchResults = isSearching
    ? [...rawFiltered].sort((a, b) => {
        const q = searchQuery.trim().toLowerCase().replace(/^#+/, '').replace(/^tags?:\s*/, '');
        const aHasTag = Array.isArray(a.tags) && a.tags.some(t => String(t).toLowerCase().includes(q));
        const bHasTag = Array.isArray(b.tags) && b.tags.some(t => String(t).toLowerCase().includes(q));
        if (aHasTag && !bHasTag) return -1;
        if (!aHasTag && bHasTag) return 1;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      })
    : null;

  // Apply custom order, then put pinned docs first (for non-search view)
  const orderedDocs = (!isSearching && docOrder.length > 0)
    ? [...rawFiltered].sort((a, b) => {
      const ai = docOrder.indexOf(a._id);
      const bi = docOrder.indexOf(b._id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    : rawFiltered;

  const filteredDocuments = isSearching
    ? sortedSearchResults
    : [
        ...orderedDocs.filter(d => pinnedDocs.includes(d._id)),
        ...orderedDocs.filter(d => !pinnedDocs.includes(d._id)),
      ];

  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const sidebarFileInputRef = useRef(null);

  const handleSidebarImport = async (e) => {
    const file = e.target.files[0];
    if (file && activeGroupId) {
      if (isStorageExceeded) {
        dispatch(setSubscriptionModalOpen(true));
        return;
      }
      try {
        const resultAction = await dispatch(importDocumentContent(file));
        if (importDocumentContent.fulfilled.match(resultAction)) {
          const payload = resultAction.payload;
          const importedType = payload.docType || 'doc';
          const importedContent = payload.content !== undefined ? payload.content : payload.html;
          const importedTitle = payload.title || file.name;

          const action = await dispatch(createDocument({
            title: importedTitle,
            content: importedContent,
            groupId: activeGroupId,
            docType: importedType
          }));

          if (onSelectDocument && action.payload?._id) {
            onSelectDocument(action.payload._id);
          }
        }
      } catch (err) {
        console.error('Sidebar file import error:', err);
      }
    }
    e.target.value = null;
  };

  const handleCreateNew = async (type = 'doc') => {
    setCreateMenuAnchor(null);
    if (isStorageExceeded) {
      dispatch(setSubscriptionModalOpen(true));
      return;
    }
    if (!activeGroupId) {
      alert('Please join or create a group first before creating a document.');
      return;
    }
    let defaultTitle = 'Untitled Document';
    if (type === 'sheet') defaultTitle = 'Untitled Spreadsheet';
    if (type === 'ppt') defaultTitle = 'Untitled Presentation';

    const action = await dispatch(createDocument({
      title: defaultTitle,
      content: '',
      groupId: activeGroupId,
      docType: type
    }));
    if (onSelectDocument && action.payload?._id) {
      onSelectDocument(action.payload._id);
    }
  };

  const openDeleteDialog = (e, doc) => {
    e.stopPropagation();
    if (isStorageExceeded) {
      alert('Workspace storage limit reached (100% capacity). The workspace is in Read-Only mode. Document removal is disabled.');
      return;
    }
    setDocToDelete(doc);
    setConfirmText('');
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDocToDelete(null);
    setConfirmText('');
  };

  const handleDeleteConfirm = () => {
    if (docToDelete && confirmText.trim().toLowerCase() === 'confirm') {
      dispatch(deleteDocument(docToDelete._id));
      closeDeleteDialog();
    }
  };


  return (
    <Box component="aside" id="sidebar-panel" aria-label="Document Library" className="p-3.5 sm:p-5 h-full relative flex flex-col bg-white/30 backdrop-blur-sm">
      {/* Edge Tab Toggle (Close) */}
      {onToggle && (
        <Box
          onClick={onToggle}
          className="hidden md:flex absolute cursor-pointer items-center justify-center bg-[#a8e6c3] text-[#0b1410] hover:bg-[#8fdab2] transition-colors"
          sx={{
            top: '40px',
            right: 0,
            width: '14px',
            height: '38px',
            borderTopLeftRadius: '6px',
            borderBottomLeftRadius: '6px',
            boxShadow: '-2px 0 5px rgba(20, 173, 238, 0.1)',
            zIndex: 50
          }}
          title="Collapse Sidebar"
        >
          <ChevronLeftIcon sx={{ fontSize: 20 }} />
        </Box>
      )}


      {/* ── Sidebar Header ─────────────────────────────── */}
      <Box className="mb-3">

        {/* Row 1: Active group name + New button */}
        <Box className="flex items-center justify-between gap-2 mb-2">
          <Box className="flex items-center gap-1.5 min-w-0">
            <Box sx={{
              width: 28, height: 28, borderRadius: '8px',
              bgcolor: '#a8e6c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <GroupIcon sx={{ fontSize: 15, color: '#0b1410' }} />
            </Box>
            <Box className="min-w-0">
              <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#1f2937', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeGroup ? activeGroup.name : 'No Group'}
              </Typography>
              {activeGroup && (
                <Typography sx={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: 500 }}>
                  ID: {activeGroup.groupId}
                </Typography>
              )}
            </Box>
          </Box>

          <Tooltip title={isStorageExceeded ? 'Workspace Storage Full (Read-Only Mode) — Click to upgrade' : (activeGroupId ? 'Create Document, Spreadsheet, or Presentation' : 'Select a group first')}>
            <span>
              <Button
                id="sidebar-create-new-btn"
                variant="contained"
                startIcon={isStorageExceeded ? <LockIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
                endIcon={!isStorageExceeded && <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.5 }} />}
                size="small"
                onClick={(e) => {
                  if (isStorageExceeded) {
                    dispatch(setSubscriptionModalOpen(true));
                  } else {
                    setCreateMenuAnchor(e.currentTarget);
                  }
                }}
                disabled={!activeGroupId}
                aria-label="Create new document"
                sx={{
                  background: isStorageExceeded
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important'
                    : 'linear-gradient(135deg, #c8f1da 0%, #93ddb6 100%)',
                  color: isStorageExceeded ? 'white' : '#0b1410',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  px: 1.2,
                  py: 0.6,
                  boxShadow: isStorageExceeded
                    ? '0 2px 8px rgba(239,68,68,0.45)'
                    : '0 2px 8px rgba(31, 138, 91, 0.35)',
                  flexShrink: 0,
                  '&:hover': {
                    background: isStorageExceeded
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important'
                      : 'linear-gradient(135deg, #b4ebcc 0%, #7fd4a6 100%)',
                    boxShadow: isStorageExceeded
                      ? '0 4px 14px rgba(239,68,68,0.55)'
                      : '0 4px 14px rgba(31, 138, 91, 0.45)',
                    transform: 'translateY(-1px)'
                  },
                  '&.Mui-disabled': { background: '#d1d5db', color: '#9ca3af', boxShadow: 'none' }
                }}
              >
                {isStorageExceeded ? 'Locked' : 'New'}
              </Button>
            </span>
          </Tooltip>

          {/* Create Document / Sheet / PPT Dropdown Menu */}
          <Menu
            anchorEl={createMenuAnchor}
            open={Boolean(createMenuAnchor)}
            onClose={() => setCreateMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  minWidth: 190,
                  border: '1px solid #e2e8f0',
                  py: 0.5
                }
              }
            }}
          >
            <MenuItem onClick={() => handleCreateNew('doc')} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <DescriptionIcon fontSize="small" sx={{ color: '#3b82f6' }} />
              </ListItemIcon>
              <ListItemText
                primary="New Document"
                secondary="Rich text & formatting"
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
            <MenuItem onClick={() => handleCreateNew('sheet')} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <TableChartIcon fontSize="small" sx={{ color: '#10b981' }} />
              </ListItemIcon>
              <ListItemText
                primary="New Spreadsheet"
                secondary="Grid, cells & formulas"
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
            <MenuItem onClick={() => handleCreateNew('ppt')} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SlideshowIcon fontSize="small" sx={{ color: '#f59e0b' }} />
              </ListItemIcon>
              <ListItemText
                primary="New Presentation"
                secondary="Slide deck & slideshow"
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                sidebarFileInputRef.current?.click();
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <UploadFileIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
              </ListItemIcon>
              <ListItemText
                primary="Import File..."
                secondary="Upload PPT, Sheet, Doc, or PDF"
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
          </Menu>

          <input
            type="file"
            ref={sidebarFileInputRef}
            hidden
            onChange={handleSidebarImport}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.json"
          />
        </Box>

        {/* Row 2: Group switcher chips (only if multiple groups) */}
        {groups.length > 1 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }} aria-label="Quick Group Switcher">
            {groups.map((group) => {
              const isSelected = group.groupId === activeGroupId;
              return (
                <Button
                  key={group._id || group.groupId}
                  id={`sidebar-group-chip-${group.groupId}`}
                  size="small"
                  onClick={() => dispatch(setActiveGroupId(group.groupId))}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.68rem',
                    fontWeight: isSelected ? 700 : 500,
                    px: 1.2,
                    py: 0.3,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    bgcolor: isSelected ? '#a8e6c3' : 'rgba(255,255,255,0.8)',
                    color: isSelected ? '#0b1410' : '#4b5563',
                    border: '1px solid',
                    borderColor: isSelected ? '#1f8a5b' : '#e5e7eb',
                    boxShadow: isSelected ? '0 1px 4px rgba(31, 138, 91, 0.25)' : 'none',
                    '&:hover': { bgcolor: isSelected ? '#8fdab2' : '#f0fdf4', borderColor: '#1f8a5b' }
                  }}
                >
                  {group.name}
                </Button>
              );
            })}
          </Box>
        )}

        {/* Row 3: "Library" label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: '#e5e7eb' }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Library
          </Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: '#e5e7eb' }} />
        </Box>
      </Box>

      {/* Search Input */}
      <Box className="mb-3 sm:mb-4">
        <TextField
          id="sidebar-search-input"
          placeholder="Search documents or tag name..."
          size="small"
          fullWidth
          value={searchQuery || ''}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          slotProps={{
            htmlInput: { 'aria-label': 'Search documents', id: 'sidebar-search-field' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => dispatch(setSearchQuery(''))}
                    aria-label="Clear search"
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              className: 'rounded-xl bg-white/50 text-sm'
            }
          }}
        />

        {/* Quick Tag Filter Chips: clicking any tag filters and lists all documents with that tag one by one */}
        {availableTags.length > 0 && (
          <Box className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 shrink-0 uppercase tracking-wider">Tags:</span>
            {availableTags.map(({ tag, count }) => {
              const cleanQ = (searchQuery || '').trim().toLowerCase().replace(/^#+/, '').replace(/^tags?:\s*/, '');
              const isActive = cleanQ === tag.toLowerCase();
              const tagColor = getTagColor(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      dispatch(setSearchQuery(''));
                    } else {
                      dispatch(setSearchQuery(tag));
                    }
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? 'text-white shadow-xs scale-105'
                      : 'bg-white/80 hover:bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}
                  style={isActive ? { backgroundColor: tagColor, borderColor: tagColor } : {}}
                  title={`Click to show all ${count} document(s) tagged #${tag}`}
                >
                  <span style={{ color: isActive ? '#fff' : tagColor, fontWeight: 900 }}>#</span>
                  <span>{tag}</span>
                  <span className="opacity-75 text-[9px]">({count})</span>
                </button>
              );
            })}
          </Box>
        )}

        {/* When searching, show concise results counter */}
        {isSearching && (
          <Box className="flex items-center justify-between px-1 pt-2 pb-0.5">
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1f8a5b' }}>
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'} found
              {searchQuery && (
                <span className="text-gray-500 font-normal ml-1">for "{searchQuery}"</span>
              )}
            </Typography>
            <Button
              size="small"
              onClick={() => dispatch(setSearchQuery(''))}
              sx={{ fontSize: '0.65rem', textTransform: 'none', color: '#6b7280', p: 0, minWidth: 'auto', '&:hover': { color: '#ef4444' } }}
            >
              Clear
            </Button>
          </Box>
        )}
      </Box>

      {/* Document List */}
      <List id="sidebar-doc-list" aria-label="List of documents" className="flex-1 overflow-y-auto px-0 space-y-2 pb-16 sm:pb-20 custom-scrollbar">
        {!activeGroupId ? (
          <Box className="flex flex-col items-center justify-center p-6 text-center bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-green-100 dark:border-green-900 mt-4">
            <GroupIcon sx={{ fontSize: 42, color: '#1f8a5b', mb: 1.5, opacity: 0.8 }} />
            <Typography variant="body2" className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              No Group Selected
            </Typography>
            <Typography variant="caption" className="text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Join or create a group in the navigation bar to start viewing and writing documents.
            </Typography>
          </Box>
        ) : docStatus === 'loading' ? (
          <Box className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} className="rounded-xl border p-2.5 sm:p-3 bg-white/50 dark:bg-gray-800/50 shadow-sm border-transparent flex gap-3">
                <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: 1 }} />
                <Box className="flex-1">
                  <Skeleton variant="text" sx={{ fontSize: '1rem', width: '80%' }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '40%' }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : filteredDocuments.length === 0 ? (
          <Box className="flex flex-col items-center justify-center h-40 opacity-75">
            <DescriptionIcon sx={{ fontSize: 40, color: '#1f8a5b', mb: 1 }} />
            <Typography variant="body2" color="textSecondary" align="center" className="italic font-medium">
              {searchQuery ? `No documents matching "${searchQuery}"` : 'No documents found in this group.'}
            </Typography>
            <Typography variant="caption" color="textSecondary" align="center" className="mt-1">
              {searchQuery ? 'Try searching by title, content, or tag name.' : "Click '+ New' above to create one."}
            </Typography>
          </Box>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = openDocuments?.includes(doc._id);
            return (
              <ListItem
                key={doc._id}
                id={`sidebar-doc-${doc._id}`}
                draggable={true}
                onDragStart={(e) => handleListDragStart(e, doc._id)}
                onDragOver={(e) => handleListDragOver(e, doc._id)}
                onDrop={(e) => handleListDrop(e, doc._id)}
                onDragEnd={handleListDragEnd}
                onClick={() => {
                  if (doc.groupId && doc.groupId !== activeGroupId) {
                    dispatch(setActiveGroupId(doc.groupId));
                  }
                  dispatch(setOpenDocument(doc._id));
                  if (onSelectDocument) {
                    onSelectDocument(doc._id);
                  }
                }}
                className={`group cursor-pointer relative overflow-hidden transition-all duration-300 rounded-xl border p-2.5 sm:p-3 ${isSelected ? 'bg-white dark:bg-gray-900 shadow-md border-l-4 border-l-[#1f8a5b] border-white' : 'bg-white/70 dark:bg-gray-800/70 border-transparent shadow-sm dark:shadow-none hover:bg-white dark:bg-gray-900 hover:shadow'}`}
                sx={{
                  opacity: draggingId === doc._id ? 0.4 : 1,
                  outline: dragOverId === doc._id ? '2px dashed #1f8a5b' : 'none',
                  outlineOffset: '2px',
                  transition: 'opacity 0.15s, outline 0.1s',
                }}
              >
                {doc.tags && doc.tags.length > 0 && (
                  <Box
                    className="absolute z-20 pointer-events-none"
                    style={{ top: '2px', left: '2px', pointerEvents: 'none' }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '16px',
                        width: '60px',
                        padding: '0 6px 0 10px',
                        backgroundColor: getTagColor(doc.tags[0]),
                        color: '#fff',
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        clipPath: 'polygon(6px 0%, 100% 0%, 100% 100%, 6px 100%, 0% 50%)',
                        transform: 'rotate(-12deg)',
                        transformOrigin: 'left center',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))'
                      }}
                    >
                      <Box sx={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', width: '2.5px', height: '2.5px', backgroundColor: '#fff', borderRadius: '50%' }} />
                      {doc.tags[0]}
                    </Box>
                  </Box>
                )}
                <Box className="flex items-center justify-between w-full">
                  {/* Drag Handle */}
                  <DragIndicatorIcon
                    sx={{ fontSize: 16, color: '#d1d5db', mr: 0.5, cursor: 'grab', flexShrink: 0 }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />

                  <Box className="flex items-center overflow-hidden flex-1 mr-1">
                    <Box className={`p-2 rounded-lg mr-2.5 sm:mr-3 shrink-0 relative ${isSelected
                        ? doc.docType === 'sheet'
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-[#0f2e1f]'
                          : doc.docType === 'ppt'
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-[#ea580c]'
                            : 'bg-green-100 dark:bg-green-900/60 text-[#1f8a5b]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                      }`}>
                      {doc.docType === 'sheet' ? (
                        <TableChartIcon fontSize="small" sx={{ color: isSelected ? '#0f2e1f' : '#10b981' }} />
                      ) : doc.docType === 'ppt' ? (
                        <SlideshowIcon fontSize="small" sx={{ color: isSelected ? '#ea580c' : '#f59e0b' }} />
                      ) : (
                        <DescriptionIcon fontSize="small" sx={{ color: isSelected ? '#1f8a5b' : '#3b82f6' }} />
                      )}
                      {/* Pin dot indicator */}
                      {pinnedDocs.includes(doc._id) && (
                        <Box sx={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', bgcolor: '#a8e6c3' }} />
                      )}
                    </Box>
                    <Box className="overflow-hidden min-w-0">
                      <Typography variant="body2" className={`font-bold truncate ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {pinnedDocs.includes(doc._id) && (
                          <PushPinIcon sx={{ fontSize: 11, color: '#1f8a5b', mr: 0.4, verticalAlign: 'middle', transform: 'rotate(45deg)' }} />
                        )}
                        {doc.title || 'Untitled'}
                      </Typography>

                      <Box className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${doc.docType === 'sheet'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : doc.docType === 'ppt'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                          {doc.docType ? doc.docType.toUpperCase() : 'DOC'}
                        </span>
                        {/* Show group name badge if searching across groups */}
                        {isSearching && doc.groupId && doc.groupId !== activeGroupId && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            {groupNameMap[doc.groupId] || doc.groupId}
                          </span>
                        )}

                        <Typography variant="caption" className={`block ${isSelected ? 'text-[#0f2e1f] font-medium' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                          {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      </Box>

                      {/* Document Tag Badges */}
                      {doc.tags && doc.tags.length > 0 && (
                        <Box className="flex items-center gap-1 mt-1 flex-wrap">
                          {doc.tags.map((tag, idx) => {
                            const cleanQ = (searchQuery || '').trim().toLowerCase().replace(/^#+/, '').replace(/^tags?:\s*/, '');
                            const isMatched = cleanQ && String(tag).toLowerCase().includes(cleanQ);
                            const tagColor = getTagColor(tag);
                            return (
                              <Box
                                key={idx}
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dispatch(setSearchQuery(`#${tag}`));
                                }}
                                title={`Click to filter by tag: #${tag}`}
                                sx={{
                                  fontSize: '0.62rem',
                                  fontWeight: isMatched ? 800 : 600,
                                  lineHeight: 1,
                                  px: '5px',
                                  py: '2px',
                                  borderRadius: '4px',
                                  bgcolor: isMatched ? tagColor : 'rgba(0, 0, 0, 0.05)',
                                  color: isMatched ? '#ffffff' : 'text.secondary',
                                  border: isMatched ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  transition: 'all 0.15s ease-in-out',
                                  '&:hover': {
                                    bgcolor: tagColor,
                                    color: '#ffffff',
                                    transform: 'scale(1.04)'
                                  }
                                }}
                                className="dark:bg-gray-800/80"
                              >
                                <span>#</span>
                                <span className="truncate max-w-[90px]">{tag}</span>
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                    </Box>
                  </Box>

                  {/* Pin + Delete Buttons */}
                  <Box className="flex items-center gap-0.5 shrink-0">
                    <Tooltip title="Duplicate Document">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDuplicate(e, doc)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        sx={{ color: '#9ca3af', '&:hover': { bgcolor: '#eff6ff', color: '#3b82f6' }, p: '4px', mr: 0.5 }}
                      >
                        <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={pinnedDocs.includes(doc._id) ? 'Unpin' : 'Pin to top'}>
                      <IconButton
                        size="small"
                        onClick={(e) => togglePin(e, doc._id)}
                        className={`transition-opacity ${pinnedDocs.includes(doc._id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        sx={{ color: pinnedDocs.includes(doc._id) ? '#1f8a5b' : '#9ca3af', '&:hover': { bgcolor: '#f0fdf4', color: '#1f8a5b' }, p: '4px' }}
                      >
                        {pinnedDocs.includes(doc._id)
                          ? <PushPinIcon sx={{ fontSize: 14, transform: 'rotate(45deg)' }} />
                          : <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                        }
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      id={`sidebar-delete-btn-${doc._id}`}
                      aria-label={`Delete document ${doc.title || 'Untitled'}`}
                      size="small"
                      onClick={(e) => openDeleteDialog(e, doc)}
                      className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      sx={{ color: '#ef4444', '&:hover': { backgroundColor: '#fee2e2' }, p: '4px' }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
              </ListItem>
            );
          })
        )}
      </List>

      {/* Storage Quota & Razorpay Upgrade Indicator */}
      <Box className="px-2.5 py-1.5 border-t border-gray-100 dark:border-gray-800 bg-transparent">
        <StorageIndicator groupId={activeGroupId} />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        id="delete-doc-dialog"
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', m: 2 } } }}
      >
        <DialogTitle className="font-bold text-gray-800 dark:text-gray-200">Delete Document?</DialogTitle>
        <DialogContent>
          <DialogContentText className="mb-4">
            Are you sure you want to delete "{docToDelete?.title}" from group <strong>{activeGroup?.name}</strong>? This action cannot be undone.
            <br /><br />
            Please type <strong>confirm</strong> to delete.
          </DialogContentText>
          <TextField
            id="delete-confirm-input"
            autoFocus
            margin="dense"
            label="Type 'confirm'"
            type="text"
            fullWidth
            variant="outlined"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            slotProps={{ htmlInput: { id: 'delete-confirm-field', 'aria-label': "Type confirm to proceed" } }}
          />
        </DialogContent>
        <DialogActions className="p-4 pt-0">
          <Button id="delete-cancel-btn" onClick={closeDeleteDialog} color="inherit" className="font-bold">
            Cancel
          </Button>
          <Button
            id="delete-submit-btn"
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={confirmText !== 'confirm'}
            className="font-bold shadow-none"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sidebar;
