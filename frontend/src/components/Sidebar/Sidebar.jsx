import React, { useState, useCallback } from 'react';
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
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useSelector, useDispatch } from 'react-redux';
import { 
  createDocument, 
  deleteDocument, 
  setOpenDocument, 
  setSearchQuery 
} from '../../slices/documentSlice';
import { setActiveGroupId } from '../../slices/groupSlice';
import './Sidebar.css';

const Sidebar = ({ onSelectDocument, onToggle, isSidebarOpen }) => {
  const dispatch = useDispatch();
  const { documents, openDocuments, searchQuery } = useSelector((state) => state.documents);
  const { groups, activeGroupId } = useSelector((state) => state.groups);

  const activeGroup = groups.find((g) => g.groupId === activeGroupId);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

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
    const baseOrder = docOrder.length > 0 ? docOrder : filteredDocuments.map(d => d._id);
    const fromIdx = baseOrder.indexOf(sourceId);
    const toIdx = baseOrder.indexOf(targetId);
    const newOrder = [...baseOrder];
    if (fromIdx < 0 || toIdx < 0) { setDragOverId(null); setDraggingId(null); return; }
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, sourceId);
    setDocOrder(newOrder);
    localStorage.setItem(orderKey, JSON.stringify(newOrder));
    setDragOverId(null);
    setDraggingId(null);
  };

  const handleListDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
  };

  const rawFiltered = documents.filter((doc) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (doc.title && doc.title.toLowerCase().includes(lowerQuery)) ||
      (doc.content && doc.content.toLowerCase().includes(lowerQuery))
    );
  });

  // Apply custom order, then put pinned docs first
  const orderedDocs = docOrder.length > 0
    ? [...rawFiltered].sort((a, b) => {
        const ai = docOrder.indexOf(a._id);
        const bi = docOrder.indexOf(b._id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : rawFiltered;

  const filteredDocuments = [
    ...orderedDocs.filter(d => pinnedDocs.includes(d._id)),
    ...orderedDocs.filter(d => !pinnedDocs.includes(d._id)),
  ];

  const handleCreateNew = async () => {
    if (!activeGroupId) {
      alert('Please join or create a group first before creating a document.');
      return;
    }
    const action = await dispatch(createDocument({ 
      title: 'Untitled Document', 
      content: '', 
      groupId: activeGroupId 
    }));
    if (onSelectDocument && action.payload?._id) {
      onSelectDocument(action.payload._id);
    }
  };

  const openDeleteDialog = (e, doc) => {
    e.stopPropagation();
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
          className="hidden md:flex absolute cursor-pointer items-center justify-center bg-[#427c36] text-white hover:bg-[#60a5fa] transition-colors"
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
              bgcolor: '#427c36', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <GroupIcon sx={{ fontSize: 15, color: 'white' }} />
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

          <Tooltip title={activeGroupId ? 'New Document' : 'Select a group first'}>
            <span>
              <Button
                id="sidebar-create-new-btn"
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                size="small"
                onClick={handleCreateNew}
                disabled={!activeGroupId}
                aria-label="Create new document"
                sx={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  px: 1.5,
                  py: 0.6,
                  boxShadow: '0 2px 8px rgba(66,124,54,0.35)',
                  flexShrink: 0,
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #326127 100%)',
                    boxShadow: '0 4px 14px rgba(66,124,54,0.45)',
                    transform: 'translateY(-1px)'
                  },
                  '&.Mui-disabled': { background: '#d1d5db', color: '#9ca3af', boxShadow: 'none' }
                }}
              >
                New
              </Button>
            </span>
          </Tooltip>
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
                    bgcolor: isSelected ? '#427c36' : 'rgba(255,255,255,0.8)',
                    color: isSelected ? 'white' : '#4b5563',
                    border: '1px solid',
                    borderColor: isSelected ? '#427c36' : '#e5e7eb',
                    boxShadow: isSelected ? '0 1px 4px rgba(66,124,54,0.25)' : 'none',
                    '&:hover': { bgcolor: isSelected ? '#326127' : '#f0fdf4', borderColor: '#427c36' }
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
          placeholder="Search group documents..."
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
              className: 'rounded-xl bg-white/50 text-sm'
            }
          }}
        />
      </Box>
      
      {/* Document List */}
      <List id="sidebar-doc-list" aria-label="List of documents" className="flex-1 overflow-y-auto px-0 space-y-2 pb-16 sm:pb-20 custom-scrollbar">
        {!activeGroupId ? (
          <Box className="flex flex-col items-center justify-center p-6 text-center bg-white/40 rounded-2xl border border-green-100 mt-4">
            <GroupIcon sx={{ fontSize: 42, color: '#427c36', mb: 1.5, opacity: 0.8 }} />
            <Typography variant="body2" className="font-bold text-gray-700 mb-1">
              No Group Selected
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Join or create a group in the navigation bar to start viewing and writing documents.
            </Typography>
          </Box>
        ) : filteredDocuments.length === 0 ? (
          <Box className="flex flex-col items-center justify-center h-40 opacity-75">
            <DescriptionIcon sx={{ fontSize: 40, color: '#427c36', mb: 1 }} />
            <Typography variant="body2" color="textSecondary" align="center" className="italic font-medium">
              No documents found in this group.
            </Typography>
            <Typography variant="caption" color="textSecondary" align="center" className="mt-1">
              Click '+ New' above to create one.
            </Typography>
          </Box>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = openDocuments?.includes(doc._id);
            return (
              <ListItem 
                key={doc._id} 
                id={`sidebar-doc-${doc._id}`}
                draggable={!isTouchDevice}
                onDragStart={(e) => handleListDragStart(e, doc._id)}
                onDragOver={(e) => handleListDragOver(e, doc._id)}
                onDrop={(e) => handleListDrop(e, doc._id)}
                onDragEnd={handleListDragEnd}
                onClick={() => {
                  dispatch(setOpenDocument(doc._id));
                  if (onSelectDocument) {
                    onSelectDocument(doc._id);
                  }
                }}
                className={`group cursor-pointer transition-all duration-300 rounded-xl border p-2.5 sm:p-3 ${isSelected ? 'bg-white shadow-md border-l-4 border-l-[#427c36] border-white' : 'bg-white/70 border-transparent shadow-sm hover:bg-white hover:shadow'}`}
                sx={{
                  opacity: draggingId === doc._id ? 0.4 : 1,
                  outline: dragOverId === doc._id ? '2px dashed #427c36' : 'none',
                  outlineOffset: '2px',
                  transition: 'opacity 0.15s, outline 0.1s',
                }}
              >
                <Box className="flex items-center justify-between w-full">
                  {/* Drag Handle */}
                  {!isTouchDevice && (
                    <DragIndicatorIcon 
                      sx={{ fontSize: 16, color: '#d1d5db', mr: 0.5, cursor: 'grab', flexShrink: 0 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}

                  <Box className="flex items-center overflow-hidden flex-1 mr-1">
                    <Box className={`p-2 rounded-lg mr-2.5 sm:mr-3 shrink-0 relative ${isSelected ? 'bg-green-100 text-[#427c36]' : 'bg-gray-100 text-gray-400'}`}>
                      <DescriptionIcon fontSize="small" />
                      {/* Pin dot indicator */}
                      {pinnedDocs.includes(doc._id) && (
                        <Box sx={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', bgcolor: '#427c36' }} />
                      )}
                    </Box>
                    <Box className="overflow-hidden min-w-0">
                      <Typography variant="body2" className={`font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {pinnedDocs.includes(doc._id) && (
                          <PushPinIcon sx={{ fontSize: 11, color: '#427c36', mr: 0.4, verticalAlign: 'middle', transform: 'rotate(45deg)' }} />
                        )}
                        {doc.title || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" className={`block mt-0.5 ${isSelected ? 'text-[#326127] font-medium' : 'text-gray-500'}`}>
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Pin + Delete Buttons */}
                  <Box className="flex items-center gap-0.5 shrink-0">
                    <Tooltip title={pinnedDocs.includes(doc._id) ? 'Unpin' : 'Pin to top'}>
                      <IconButton
                        size="small"
                        onClick={(e) => togglePin(e, doc._id)}
                        className={`transition-opacity ${pinnedDocs.includes(doc._id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        sx={{ color: pinnedDocs.includes(doc._id) ? '#427c36' : '#9ca3af', '&:hover': { bgcolor: '#f0fdf4', color: '#427c36' }, p: '4px' }}
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

      {/* Delete Confirmation Dialog */}
      <Dialog 
        id="delete-doc-dialog"
        open={deleteDialogOpen} 
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', m: 2 } } }}
      >
        <DialogTitle className="font-bold text-gray-800">Delete Document?</DialogTitle>
        <DialogContent>
          <DialogContentText className="mb-4">
            Are you sure you want to delete "{docToDelete?.title}" from group <strong>{activeGroup?.name}</strong>? This action cannot be undone.
            <br/><br/>
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
