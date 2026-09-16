import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import DocumentEditor from '../DocumentEditor/DocumentEditor';
import SEO from '../SEO/SEO';
import './Dashboard.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, addOpenDocument, clearOpenDocuments } from '../../slices/documentSlice';
import { fetchMyGroups, setActiveGroupId } from '../../slices/groupSlice';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupIcon from '@mui/icons-material/Group';
import GroupAddIcon from '@mui/icons-material/GroupAdd';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { documents, openDocuments } = useSelector((state) => state.documents);
  const { groups, activeGroupId } = useSelector((state) => state.groups);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' or 'editor'
  const [activeMobileDocId, setActiveMobileDocId] = useState(null);

  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  // Fetch groups on mount
  useEffect(() => {
    dispatch(fetchMyGroups());
  }, [dispatch]);

  // When active group changes, fetch documents for that group and clear previous open docs
  useEffect(() => {
    if (activeGroupId) {
      dispatch(clearOpenDocuments());
      dispatch(fetchDocuments(activeGroupId));
    }
  }, [dispatch, activeGroupId]);

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
  const activeDoc = documents.find((d) => d._id === (activeMobileDocId || openDocuments[0]));
  const pageTitle = activeDoc?.title 
    ? `${activeDoc.title} - ${activeGroup?.name || 'DocsApp'}` 
    : `${activeGroup?.name || 'Workspace'} - DocsApp`;
  const pageDesc = activeDoc?.title
    ? `Edit and manage "${activeDoc.title}" in group ${activeGroup?.name || ''} on DocsApp.`
    : 'DocsApp group workspace. Only group members can view and collaborate on documentation.';

  return (
    <Box component="main" id="dashboard-workspace" className="min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden">
      <SEO title={pageTitle} description={pageDesc} />

      {/* Accessible single h1 heading for screen readers & search engines */}
      <Typography variant="h1" className="sr-only">
        DocsApp Group Workspace
      </Typography>

      <Navbar 
        mobileView={mobileView}
        onToggleMobileView={setMobileView}
        hasOpenDocuments={openDocuments.length > 0}
      />
      
      {/* Main Container: responsive padding and gap */}
      <Box className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 relative animate-fade-in">
        {/* Sidebar Panel */}
        <Box 
          id="dashboard-sidebar-container"
          className={`
            rounded-2xl overflow-hidden bg-white/90 backdrop-blur-md shadow-sm flex flex-col border border-pink-100/50
            ${mobileView === 'sidebar' || openDocuments.length === 0 ? 'flex w-full' : 'hidden'}
            md:flex md:w-1/3 md:shrink-0 md:max-w-[400px]
          `}
        >
          <Sidebar onSelectDocument={handleSelectDocument} />
        </Box>
        
        {/* Document Editor Area */}
        <Box 
          component="section"
          id="dashboard-editor-container"
          aria-label="Document Workspace Area"
          className={`
            flex-1 overflow-hidden
            ${mobileView === 'editor' && openDocuments.length > 0 ? 'flex flex-col w-full' : 'hidden'}
            md:flex md:flex-row md:gap-4
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {openDocuments.length === 0 ? (
            /* Desktop Empty State */
            <Box id="empty-state-welcome" className="hidden md:flex flex-1 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-sm border border-pink-100/50 flex-col items-center justify-center p-6 text-center">
              <EditNoteIcon sx={{ fontSize: 80, color: '#ffb6d8', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" component="h2" className="font-extrabold text-gray-800 mb-2">
                {activeGroup ? `Welcome to ${activeGroup.name}` : 'Ready to Collaborate?'}
              </Typography>
              <Typography variant="body1" className="text-gray-500 max-w-md mx-auto mb-4">
                {activeGroup 
                  ? `Select a document from the library or click 'New' to start writing documentation for ${activeGroup.name}.`
                  : 'Join or create a group in the navigation bar above to view and collaborate on documentation.'}
              </Typography>

              {activeGroup && (
                <Box className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-50 border border-pink-100">
                  <GroupIcon sx={{ color: '#ff84ba', fontSize: 18 }} />
                  <Typography variant="caption" className="font-bold text-gray-700">
                    Group ID: <span className="text-[#e06b9e] font-mono">{activeGroup.groupId}</span>
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <>
              {/* Mobile View: Document Tabs when multiple docs are open */}
              {openDocuments.length > 1 && (
                <Box id="mobile-doc-tabs" role="tablist" aria-label="Open documents" className="flex md:hidden items-center gap-1.5 p-1 mb-2 bg-white/80 backdrop-blur-md rounded-xl border border-pink-100 overflow-x-auto shrink-0">
                  {openDocuments.map((id) => {
                    const doc = documents.find((d) => d._id === id);
                    const isActive = currentMobileDocId === id;
                    return (
                      <Button
                        key={id}
                        id={`mobile-tab-${id}`}
                        role="tab"
                        aria-selected={isActive}
                        size="small"
                        onClick={() => setActiveMobileDocId(id)}
                        className={`text-xs font-bold rounded-lg px-3 py-1 truncate max-w-[140px] transition-all ${
                          isActive
                            ? 'bg-[#ff84ba] text-white shadow-sm'
                            : 'text-gray-600 bg-transparent hover:bg-pink-50 hover:text-[#e06b9e]'
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
              <Box className="flex md:hidden flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-pink-100 flex-col min-h-0">
                {currentMobileDocId && (
                  <DocumentEditor 
                    documentId={currentMobileDocId} 
                    onBackToLibrary={() => setMobileView('sidebar')}
                  />
                )}
              </Box>

              {/* Desktop: Render all open documents side-by-side */}
              {openDocuments.map((docId) => (
                <Box key={docId} className="hidden md:flex flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-pink-100 flex-col min-h-0">
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
