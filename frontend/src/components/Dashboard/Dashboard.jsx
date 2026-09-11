import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import DocumentEditor from '../DocumentEditor/DocumentEditor';
import './Dashboard.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, addOpenDocument } from '../../slices/documentSlice';
import EditNoteIcon from '@mui/icons-material/EditNote';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { openDocuments } = useSelector((state) => state.documents);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData('documentId');
    if (docId) {
      dispatch(addOpenDocument(docId));
    }
  };

  return (
    <Box className="h-screen flex flex-col">
      <Navbar />
      <Box className="flex flex-1 overflow-hidden p-4 gap-4">
        <Box className="w-1/3 rounded-2xl overflow-hidden glass-effect shadow-sm flex flex-col border border-white/60 shrink-0 max-w-[400px]">
          <Sidebar />
        </Box>
        
        <Box 
          className="flex-1 flex gap-4 overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {openDocuments.length === 0 ? (
            <Box className="flex-1 rounded-2xl overflow-hidden glass-effect shadow-sm border border-white/60 flex flex-col items-center justify-center bg-white/40">
              <EditNoteIcon sx={{ fontSize: 80, color: '#ffb6d8', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" className="font-bold text-gray-700 mb-2">
                Ready to Write?
              </Typography>
              <Typography variant="body1" className="text-gray-500 max-w-md mx-auto">
                Select a document from the sidebar or drag it here to start editing. Drag a second document to view them side-by-side!
              </Typography>
            </Box>
          ) : (
            openDocuments.map((docId) => (
              <Box key={docId} className="flex-1 rounded-2xl overflow-hidden glass-effect shadow-sm border border-white/60 flex flex-col">
                <DocumentEditor documentId={docId} />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
