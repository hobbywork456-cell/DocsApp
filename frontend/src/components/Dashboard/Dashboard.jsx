import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, Button, Dialog, IconButton } from '@mui/material';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import DocumentEditor from '../DocumentEditor/DocumentEditor';
import SEO from '../SEO/SEO';
import './Dashboard.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, addOpenDocument, clearOpenDocuments, setGlobalReadMode } from '../../slices/documentSlice';
import { fetchMyGroups, setActiveGroupId } from '../../slices/groupSlice';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Tooltip } from '@mui/material';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { documents, openDocuments, globalReadMode } = useSelector((state) => state.documents);
  const { groups, activeGroupId } = useSelector((state) => state.groups);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState('sidebar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 'sidebar' or 'editor'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleReadModeMediaClick = (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedMedia({ type: e.target.tagName.toLowerCase(), src: e.target.src || e.target.currentSrc });
    }
  };
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('documentid') || e.dataTransfer.types.includes('sidebarreorder')) {
      setDragCounter(prev => prev + 1);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('documentid') || e.dataTransfer.types.includes('sidebarreorder')) {
      setDragCounter(prev => Math.max(0, prev - 1));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // Required to allow drop
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragCounter(0);
    
    // Support either drag payload since we set both in Sidebar
    const docId = e.dataTransfer.getData('documentId') || e.dataTransfer.getData('sidebarreorder');
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


  // Render Global Read Mode Portal
  if (globalReadMode && openDocuments.length > 0) {
    // Minimal sx: preserve all original formatting, but restore list markers
    // because ql-editor hides native bullets and uses CSS counters/::before pseudo-elements
    // that only work inside a .ql-snow wrapper (not in our portal).
    const readModeContentSx = {
      fontFamily: '"Times New Roman", Times, serif',
      '& img, & video': { maxWidth: '100%', height: 'auto' },
      // Restore bullet & number list markers that ql-editor hides
      '& ul': { listStyleType: 'disc !important', paddingLeft: '1.5em !important' },
      '& ul ul': { listStyleType: 'circle !important' },
      '& ul ul ul': { listStyleType: 'square !important' },
      '& ol': { listStyleType: 'decimal !important', paddingLeft: '1.5em !important' },
      '& ol ol': { listStyleType: 'lower-alpha !important' },
      '& ol ol ol': { listStyleType: 'lower-roman !important' },
      '& li': { listStyleType: 'inherit !important', display: 'list-item !important' },
      '& li::before': { display: 'none !important' }, // remove Quill's fake bullets
    };

    // A4 dimensions: 210mm × 297mm ≈ 794px × 1122px at 96dpi
    const A4_WIDTH = 794;

    const renderA4Doc = (doc) => (
      <Box
        key={doc._id}
        sx={{
          width: { xs: '100%', md: `${A4_WIDTH}px` },
          minHeight: { xs: 'calc(100vh - 60px)', md: '1122px' },
          bgcolor: 'white',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          borderRadius: { xs: 0, md: '2px' },
          p: { xs: '60px 20px 40px 20px', md: '72px 80px 72px 80px' },
          mb: { xs: 0, md: 4 },
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="h2" sx={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '22pt',
          fontWeight: 'bold',
          color: '#111827',
          mb: '0.6em',
          lineHeight: 1.3,
          borderBottom: '2px solid #e5e7eb',
          pb: '0.4em',
        }}>
          {doc.title || 'Untitled Document'}
        </Typography>
        <Box
          className="ql-editor"
          dangerouslySetInnerHTML={{ __html: doc.content || '' }}
          sx={{ ...readModeContentSx, p: '0 !important' }}
            onClickCapture={handleReadModeMediaClick}
        />
      </Box>
    );

    const renderFullscreenDoc = (doc) => (
      <Box
        key={doc._id}
        sx={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          px: { xs: 2, md: 6, lg: 10 },
          py: { xs: 6, md: 4 },
          borderRight: openDocuments.length > 1 ? '1px solid #e5e7eb' : 'none',
        }}
      >
        <Typography variant="h2" sx={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: { xs: '1.6rem', md: '2.2rem' },
          fontWeight: 'bold',
          color: '#111827',
          mb: 3,
          mt: { xs: 5, md: 0 },
          lineHeight: 1.3,
        }}>
          {doc.title || 'Untitled Document'}
        </Typography>
        <Box
          className="ql-editor"
          dangerouslySetInnerHTML={{ __html: doc.content || '' }}
          sx={{ ...readModeContentSx, p: '0 !important' }}
            onClickCapture={handleReadModeMediaClick}
        />
      </Box>
    );

    return createPortal(
      <Box sx={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999,
        backgroundColor: isFullscreen ? 'white' : '#d1d5db',
        display: 'flex',
        flexDirection: isFullscreen ? { xs: 'column', md: 'row' } : 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Toolbar */}
        <Box sx={{
          position: 'fixed',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 1,
          zIndex: 9999999,
        }}>
          <Tooltip title={isFullscreen ? 'A4 View' : 'Full Screen'}>
            <IconButton
              onClick={() => setIsFullscreen(prev => !prev)}
              sx={{ bgcolor: '#f0fdf4', color: '#427c36', boxShadow: '0 2px 8px rgba(66, 124, 54, 0.3)', '&:hover': { bgcolor: '#dcfce7' } }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Exit Read Mode">
            <IconButton
              onClick={() => { dispatch(setGlobalReadMode(false)); setIsFullscreen(false); }}
              sx={{ bgcolor: '#f0fdf4', color: '#427c36', boxShadow: '0 2px 8px rgba(66, 124, 54, 0.3)', '&:hover': { bgcolor: '#dcfce7' } }}
            >
              <LockIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {isFullscreen ? (
          /* Full Screen mode — normal reading layout */
          openDocuments.map(docId => {
            const doc = documents.find(d => d._id === docId);
            if (!doc) return null;
            return renderFullscreenDoc(doc);
          })
        ) : (
          /* A4 Paper mode */
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: openDocuments.length > 1 ? 'row' : 'column' },
            alignItems: { xs: 'flex-start', md: openDocuments.length > 1 ? 'flex-start' : 'center' },
            justifyContent: { xs: 'flex-start', md: 'center' },
            gap: { xs: 0, md: 5 },
            py: { xs: 0, md: 5 },
            px: { xs: 0, md: 3 },
            minHeight: '100%',
            width: '100%',
          }}>
            {openDocuments.map(docId => {
              const doc = documents.find(d => d._id === docId);
              if (!doc) return null;
              return (
                <Box key={docId} sx={{
                  overflowY: 'auto',
                  width: { xs: '100%', md: 'auto' },
                  height: { xs: '100%', md: 'auto' },
                }}>
                  {renderA4Doc(doc)}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>,
      document.body
    );
  }

  return (
    <>
    <Box component="main" id="dashboard-workspace" className="min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden pb-[60px] md:pb-0">
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
      <Box className={`flex flex-1 overflow-hidden p-2 sm:p-4 relative animate-fade-in transition-all duration-300 ease-in-out ${isSidebarOpen ? 'gap-2 sm:gap-4' : 'gap-0'}`}>
        {/* Edge Tab Toggle (Visible when closed) */}
        {!isSidebarOpen && (
          <Box 
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute cursor-pointer items-center justify-center bg-[#2a433a] text-white hover:bg-[#427c36] transition-colors"
            style={{ zIndex: 9999 }}
            sx={{
              top: '60px',
              left: '0px',
              width: '24px',
              height: '48px',
              borderTopRightRadius: '6px',
              borderBottomRightRadius: '6px',
              boxShadow: '2px 0 5px rgba(0,0,0,0.2)'
            }}
            title="Open Sidebar"
          >
            <ChevronRightIcon sx={{ fontSize: 20 }} />
          </Box>
        )}

        {/* Sidebar Panel */}
        <Box 
          id="dashboard-sidebar-container"
          className={`
            rounded-2xl overflow-hidden bg-white/90 backdrop-blur-md shadow-sm flex flex-col border border-green-100/50
            transition-all duration-300 ease-in-out
            ${mobileView === 'sidebar' || openDocuments.length === 0 ? 'flex w-full' : 'hidden'}
            md:flex ${isSidebarOpen ? 'md:w-1/3 md:shrink-0 md:max-w-[400px] flex-shrink-0' : 'md:w-0 md:max-w-0 md:min-w-0 flex-shrink-0 md:border-none md:opacity-0 pointer-events-none'}
          `}
        >
          <Sidebar onSelectDocument={handleSelectDocument} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
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
          
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag Overlay to intercept drop events smoothly above Quill editor */}
          {dragCounter > 0 && (
            <Box 
              sx={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
                zIndex: 9999, borderRadius: '1rem', border: '3px dashed #427c36',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 40px rgba(66,124,54,0.15)'
              }}
            >
              <Box sx={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <EditNoteIcon sx={{ fontSize: 64, color: '#427c36', mb: 2, opacity: 0.8 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#326127' }}>
                  Drop to Open Document
                </Typography>
                {openDocuments.length >= 2 && (
                  <Typography variant="caption" sx={{ mt: 1, color: '#ef4444', fontWeight: 'bold' }}>
                    (Will replace the oldest open document)
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          {openDocuments.length === 0 ? (
            /* Desktop Empty State */
            <Box id="empty-state-welcome" className="hidden md:flex flex-1 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-sm border border-green-100/50 flex-col items-center justify-center p-6 text-center">
              <EditNoteIcon sx={{ fontSize: 80, color: '#86efac', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" component="h2" className="font-extrabold text-gray-800 mb-2">
                {activeGroup ? `Welcome to ${activeGroup.name}` : 'Ready to Collaborate?'}
              </Typography>
              <Typography variant="body1" className="text-gray-500 max-w-md mx-auto mb-4">
                {activeGroup 
                  ? `Select a document from the library or click 'New' to start writing documentation for ${activeGroup.name}.`
                  : 'Join or create a group in the navigation bar above to view and collaborate on documentation.'}
              </Typography>

              {activeGroup && (
                <Box className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-100">
                  <GroupIcon sx={{ color: '#427c36', fontSize: 18 }} />
                  <Typography variant="caption" className="font-bold text-gray-700">
                    Group ID: <span className="text-[#326127] font-mono">{activeGroup.groupId}</span>
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <>
              {/* Mobile View: Document Tabs when multiple docs are open */}
              {openDocuments.length > 1 && (
                <Box id="mobile-doc-tabs" role="tablist" aria-label="Open documents" className="flex md:hidden items-center gap-1.5 p-1 mb-2 bg-white/80 backdrop-blur-md rounded-xl border border-green-100 overflow-x-auto shrink-0">
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
                            ? 'bg-[#427c36] text-white shadow-sm'
                            : 'text-gray-600 bg-transparent hover:bg-green-50 hover:text-[#326127]'
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
              <Box className="flex md:hidden flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-green-100 flex-col min-h-0">
                {currentMobileDocId && (
                  <DocumentEditor 
                    documentId={currentMobileDocId} 
                    onBackToLibrary={() => setMobileView('sidebar')}
                  />
                )}
              </Box>

              {/* Desktop: Render all open documents side-by-side */}
              {openDocuments.map((docId) => (
                <Box key={docId} className="hidden md:flex flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-green-100 flex-col min-h-0">
                  <DocumentEditor documentId={docId} />
                </Box>
              ))}
            </>
          )}
        </Box>
      </Box>
    </Box></>
  );
}

export default Dashboard
