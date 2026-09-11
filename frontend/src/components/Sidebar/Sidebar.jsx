import React, { useState } from 'react';
import { Box, Typography, Button, TextField, List, ListItem, ListItemText, IconButton, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useSelector, useDispatch } from 'react-redux';
import { createDocument, deleteDocument, setOpenDocument, addOpenDocument, setSearchQuery } from '../../slices/documentSlice';
import './Sidebar.css';

const Sidebar = () => {
  const dispatch = useDispatch();
  const { documents, openDocuments, searchQuery } = useSelector((state) => state.documents);

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

  const handleCreateNew = () => {
    dispatch(createDocument({ title: 'Untitled Document', content: '' }));
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
    if (confirmText === 'confirm' && docToDelete) {
      dispatch(deleteDocument(docToDelete._id));
      closeDeleteDialog();
    }
  };

  return (
    <Box className="p-5 h-full relative flex flex-col bg-white/30 backdrop-blur-sm">
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="subtitle1" className="font-extrabold text-gray-700 tracking-wider uppercase text-sm">
          Library
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          size="small" 
          onClick={handleCreateNew}
          className="rounded-full gradient-bg text-white shadow-md hover:shadow-lg transition-all border-none font-bold capitalize"
          sx={{ boxShadow: '0 4px 10px 0 rgba(255, 132, 186, 0.4)' }}
        >
          New
        </Button>
      </Box>

      <Box className="mb-4">
        <TextField
          placeholder="Search documents..."
          size="small"
          fullWidth
          value={searchQuery || ''}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            className: 'rounded-xl bg-white/50 text-sm'
          }}
        />
      </Box>
      
      <List className="flex-1 overflow-y-auto px-0 space-y-2 pb-20 custom-scrollbar">
        {filteredDocuments.length === 0 ? (
          <Box className="flex flex-col items-center justify-center h-40 opacity-65">
            <DescriptionIcon sx={{ fontSize: 40, color: '#ff84ba', mb: 1 }} />
            <Typography variant="body2" color="textSecondary" align="center" className="italic font-medium">
              No documents found.
            </Typography>
          </Box>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = openDocuments?.includes(doc._id);
            return (
              <ListItem 
                key={doc._id} 
                button 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('documentId', doc._id);
                }}
                onClick={() => dispatch(setOpenDocument(doc._id))}
                className={`group cursor-pointer transition-all duration-300 rounded-xl border ${isSelected ? 'bg-white shadow-md border-l-4 border-l-[#ff84ba] border-white' : 'bg-white/70 border-transparent shadow-sm hover:bg-white hover:shadow'}`}
              >
                <Box className="flex items-center justify-between w-full">
                  <Box className="flex items-center overflow-hidden">
                    <Box className={`p-2 rounded-lg mr-3 ${isSelected ? 'bg-pink-100 text-[#ff84ba]' : 'bg-gray-100 text-gray-400'}`}>
                      <DescriptionIcon fontSize="small" />
                    </Box>
                    <Box className="overflow-hidden">
                      <Typography variant="body2" className={`font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {doc.title || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" className={`block mt-0.5 ${isSelected ? 'text-[#e06b9e] font-medium' : 'text-gray-500'}`}>
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Delete Button - only visible on hover or if selected */}
                  <IconButton 
                    size="small" 
                    onClick={(e) => openDeleteDialog(e, doc)}
                    className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    sx={{ color: '#ef4444', '&:hover': { backgroundColor: '#fee2e2' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            );
          })
        )}
      </List>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle className="font-bold text-gray-800">Delete Document?</DialogTitle>
        <DialogContent>
          <DialogContentText className="mb-4">
            Are you sure you want to delete "{docToDelete?.title}"? This action cannot be undone.
            <br/><br/>
            Please type <strong>confirm</strong> to delete.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Type 'confirm'"
            type="text"
            fullWidth
            variant="outlined"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </DialogContent>
        <DialogActions className="p-4 pt-0">
          <Button onClick={closeDeleteDialog} color="inherit" className="font-bold">
            Cancel
          </Button>
          <Button 
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
