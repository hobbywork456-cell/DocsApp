import React, { useState } from 'react';
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
import { useSelector, useDispatch } from 'react-redux';
import { 
  createDocument, 
  deleteDocument, 
  setOpenDocument, 
  setSearchQuery 
} from '../../slices/documentSlice';
import { setActiveGroupId } from '../../slices/groupSlice';
import './Sidebar.css';

const Sidebar = ({ onSelectDocument }) => {
  const dispatch = useDispatch();
  const { documents, openDocuments, searchQuery } = useSelector((state) => state.documents);
  const { groups, activeGroupId } = useSelector((state) => state.groups);

  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (doc.title && doc.title.toLowerCase().includes(lowerQuery)) ||
      (doc.content && doc.content.toLowerCase().includes(lowerQuery))
    );
  });

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
      {/* Group Context Badge */}
      <Box className="flex items-center justify-between gap-1 mb-2 px-1">
        <Box className="flex items-center gap-1.5 overflow-hidden">
          <GroupIcon sx={{ fontSize: 16, color: '#ff84ba' }} />
          <Typography variant="caption" className="font-bold text-gray-600 truncate text-xs">
            {activeGroup ? activeGroup.name : 'No Group Selected'}
          </Typography>
        </Box>
        {activeGroup && (
          <Tooltip title="Group ID">
            <Typography variant="caption" className="text-[10px] font-bold text-[#e06b9e] bg-pink-100/80 px-2 py-0.5 rounded-md shrink-0">
              #{activeGroup.groupId}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Group Quick Switcher Chips: visible to easily toggle groups */}
      {groups.length > 1 && (
        <Box className="flex flex-wrap items-center gap-1.5 mb-3 px-0.5" aria-label="Quick Group Switcher">
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
                  fontWeight: isSelected ? 800 : 600,
                  px: 1.25,
                  py: 0.2,
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  bgcolor: isSelected ? '#ff84ba' : 'rgba(255, 255, 255, 0.85)',
                  color: isSelected ? 'white' : '#4b5563',
                  border: isSelected ? '1px solid #ff84ba' : '1px solid #fed7ea',
                  boxShadow: isSelected ? '0 2px 5px rgba(255,132,186,0.3)' : 'none',
                  '&:hover': {
                    bgcolor: isSelected ? '#e06b9e' : '#fff0f6'
                  }
                }}
              >
                {group.name}
              </Button>
            );
          })}
        </Box>
      )}

      {/* Header with Title and "New" button */}
      <Box className="flex justify-between items-center mb-3 sm:mb-4">
        <Typography variant="subtitle1" component="h2" className="font-black text-gray-800 tracking-wider uppercase text-xs sm:text-sm">
          Library
        </Typography>
        <Button 
          id="sidebar-create-new-btn"
          variant="contained" 
          startIcon={<AddIcon />} 
          size="small" 
          onClick={handleCreateNew}
          disabled={!activeGroupId}
          aria-label="Create new document"
          className="rounded-full gradient-bg text-white shadow-md hover:shadow-lg transition-all border-none font-bold capitalize"
          sx={{ boxShadow: '0 4px 10px 0 rgba(255, 132, 186, 0.4)', px: 2 }}
        >
          New
        </Button>
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
          inputProps={{ 'aria-label': 'Search documents', id: 'sidebar-search-field' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </InputAdornment>
            ),
            className: 'rounded-xl bg-white/50 text-sm'
          }}
        />
      </Box>
      
      {/* Document List */}
      <List id="sidebar-doc-list" aria-label="List of documents" className="flex-1 overflow-y-auto px-0 space-y-2 pb-16 sm:pb-20 custom-scrollbar">
        {!activeGroupId ? (
          <Box className="flex flex-col items-center justify-center p-6 text-center bg-white/40 rounded-2xl border border-pink-100 mt-4">
            <GroupIcon sx={{ fontSize: 42, color: '#ff84ba', mb: 1.5, opacity: 0.8 }} />
            <Typography variant="body2" className="font-bold text-gray-700 mb-1">
              No Group Selected
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Join or create a group in the navigation bar to start viewing and writing documents.
            </Typography>
          </Box>
        ) : filteredDocuments.length === 0 ? (
          <Box className="flex flex-col items-center justify-center h-40 opacity-75">
            <DescriptionIcon sx={{ fontSize: 40, color: '#ff84ba', mb: 1 }} />
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
                button 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('documentId', doc._id);
                }}
                onClick={() => {
                  dispatch(setOpenDocument(doc._id));
                  if (onSelectDocument) {
                    onSelectDocument(doc._id);
                  }
                }}
                className={`group cursor-pointer transition-all duration-300 rounded-xl border p-2.5 sm:p-3 ${isSelected ? 'bg-white shadow-md border-l-4 border-l-[#ff84ba] border-white' : 'bg-white/70 border-transparent shadow-sm hover:bg-white hover:shadow'}`}
              >
                <Box className="flex items-center justify-between w-full">
                  <Box className="flex items-center overflow-hidden flex-1 mr-2">
                    <Box className={`p-2 rounded-lg mr-2.5 sm:mr-3 shrink-0 ${isSelected ? 'bg-pink-100 text-[#ff84ba]' : 'bg-gray-100 text-gray-400'}`}>
                      <DescriptionIcon fontSize="small" />
                    </Box>
                    <Box className="overflow-hidden min-w-0">
                      <Typography variant="body2" className={`font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {doc.title || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" className={`block mt-0.5 ${isSelected ? 'text-[#e06b9e] font-medium' : 'text-gray-500'}`}>
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Delete Button */}
                  <IconButton 
                    id={`sidebar-delete-btn-${doc._id}`}
                    aria-label={`Delete document ${doc.title || 'Untitled'}`}
                    size="small" 
                    onClick={(e) => openDeleteDialog(e, doc)}
                    className={`transition-opacity shrink-0 ${isSelected ? 'opacity-100' : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100'}`}
                    sx={{ color: '#ef4444', '&:hover': { backgroundColor: '#fee2e2' }, p: '6px' }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
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
        PaperProps={{ sx: { borderRadius: '16px', m: 2 } }}
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
            inputProps={{ id: 'delete-confirm-field', 'aria-label': "Type confirm to proceed" }}
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
