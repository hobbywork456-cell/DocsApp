import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import DocumentEditor from '../DocumentEditor/DocumentEditor';
import './Dashboard.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, addOpenDocument } from '../../slices/documentSlice';
import EditNoteIcon from '@mui/icons-material/EditNote';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { documents, openDocuments } = useSelector((state) => state.documents);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' or 'editor'
  const [activeMobileDocId, setActiveMobileDocId] = useState(null);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  // Synchronize activeMobileDocId with openDocuments
  useEffect(() => {
    if (openDocuments.length > 0) {
      if (!activeMobileDocId || !openDocuments.includes(activeMobileDocId)) {
        setActiveMobileDocId(openDocuments[openDocuments.length - 1]);
      }
    } else {
      setActiveMobileDocId(null);
      setMobileView('sidebar');
    }
  }, [openDocuments, activeMobileDocId]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData('documentId');
    if (docId) {
      dispatch(addOpenDocument(docId));
      setActiveMobileDocId(docId);
      setMobileView('editor');
    }
  };

  const handleSelectDocument = (docId) => {
    setActiveMobileDocId(docId);
    setMobileView('editor');
  };

  const currentMobileDocId = activeMobileDocId || (openDocuments.length > 0 ? openDocuments[0] : null);

  return (
    <Box className="min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden">
      <Navbar 
        mobileView={mobileView}
        onToggleMobileView={setMobileView}
        hasOpenDocuments={openDocuments.length > 0}
      />
      
      {/* Main Container: responsive padding and gap */}
      <Box className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 relative">
        {/* Sidebar Panel */}
        {/* Desktop: always visible on the left */}
        {/* Mobile: visible when mobileView is 'sidebar' or no documents are open */}
        <Box 
          className={`
            rounded-2xl overflow-hidden glass-effect shadow-sm flex flex-col border border-white/60
            ${mobileView === 'sidebar' || openDocuments.length === 0 ? 'flex w-full' : 'hidden'}
            md:flex md:w-1/3 md:shrink-0 md:max-w-[400px]
          `}
        >
          <Sidebar onSelectDocument={handleSelectDocument} />
        </Box>
        
        {/* Document Editor Area */}
        {/* Desktop: always visible, shows empty state or open documents side-by-side */}
        {/* Mobile: visible when mobileView is 'editor' and openDocuments.length > 0 */}
        <Box 
          className={`
            flex-1 overflow-hidden
            ${mobileView === 'editor' && openDocuments.length > 0 ? 'flex flex-col w-full' : 'hidden'}
            md:flex md:flex-row md:gap-4
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {openDocuments.length === 0 ? (
            /* Desktop Empty State (mobile defaults to viewing Library when 0 docs) */
            <Box className="hidden md:flex flex-1 rounded-2xl overflow-hidden glass-effect shadow-sm border border-white/60 flex-col items-center justify-center bg-white/40 p-6 text-center">
              <EditNoteIcon sx={{ fontSize: 80, color: '#ffb6d8', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" className="font-bold text-gray-700 mb-2">
                Ready to Write?
              </Typography>
              <Typography variant="body1" className="text-gray-500 max-w-md mx-auto">
                Select a document from the sidebar or drag it here to start editing. Drag a second document to view them side-by-side!
              </Typography>
            </Box>
          ) : (
            <>
              {/* Mobile View: Document Tabs when multiple docs are open */}
              {openDocuments.length > 1 && (
                <Box className="flex md:hidden items-center gap-1.5 p-1 mb-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/60 overflow-x-auto shrink-0">
                  {openDocuments.map((id) => {
                    const doc = documents.find((d) => d._id === id);
                    const isActive = currentMobileDocId === id;
                    return (
                      <Button
                        key={id}
                        size="small"
                        onClick={() => setActiveMobileDocId(id)}
                        className={`text-xs font-bold rounded-lg px-3 py-1 truncate max-w-[140px] transition-all ${
                          isActive
                            ? 'bg-[#ff84ba] text-white shadow-sm'
                            : 'text-gray-600 bg-white/40 hover:bg-white/70'
                        }`}
                        sx={{ textTransform: 'none' }}
                      >
                        {doc?.title || 'Untitled'}
                      </Button>
                    );
                  })}
                </Box>
              )}

              {/* Mobile: Render single active document in full view */}
              <Box className="flex md:hidden flex-1 rounded-2xl overflow-hidden glass-effect shadow-sm border border-white/60 flex-col min-h-0">
                {currentMobileDocId && (
                  <DocumentEditor 
                    documentId={currentMobileDocId} 
                    onBackToLibrary={() => setMobileView('sidebar')}
                  />
                )}
              </Box>

              {/* Desktop: Render all open documents side-by-side */}
              {openDocuments.map((docId) => (
                <Box key={docId} className="hidden md:flex flex-1 rounded-2xl overflow-hidden glass-effect shadow-sm border border-white/60 flex-col min-h-0">
                  <DocumentEditor documentId={docId} />
                </Box>
              ))}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
