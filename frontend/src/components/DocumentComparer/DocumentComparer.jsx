import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { diffWords } from 'diff';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const DocumentComparer = ({ doc1, doc2, onClose }) => {
  const [diffs, setDiffs] = useState([]);
  const [isDiffing, setIsDiffing] = useState(true);

  useEffect(() => {
    setIsDiffing(true);
    // Allow UI to render loading state before heavy diffing computation blocks the thread
    const timer = setTimeout(() => {
      if (doc1 && doc2) {
        const text1 = stripHtml(doc1.content);
        const text2 = stripHtml(doc2.content);
        const result = diffWords(text1, text2);
        setDiffs(result);
      }
      setIsDiffing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [doc1, doc2]);

  return (
    <Box className="flex-1 flex flex-col h-full bg-gray-100 dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden w-full max-w-[1600px] mx-auto mt-2">
      {/* Header */}
      <Box className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 shadow-sm z-10">
        <Box className="flex items-center gap-3">
          <Box className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl text-green-700 dark:text-green-500">
            <CompareArrowsIcon />
          </Box>
          <Box>
            <Typography variant="h6" className="font-extrabold text-gray-800 dark:text-gray-200 leading-tight">
              Document Analyser
            </Typography>
            <Typography variant="caption" className="text-gray-500 dark:text-gray-400 font-medium">
              A4 Compact Comparison View
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Close Comparison">
          <IconButton onClick={onClose} sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' } }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isDiffing ? (
        <Box className="flex-1 flex flex-col items-center justify-center p-10 bg-white/50 dark:bg-gray-900/50">
          <CircularProgress size={56} thickness={4} sx={{ color: '#427c36', mb: 3 }} />
          <Typography variant="h6" className="text-gray-700 dark:text-gray-300 font-bold">
            Analyzing Documents...
          </Typography>
          <Typography variant="body2" className="text-gray-500 dark:text-gray-400 mt-1">
            Calculating differences between "{doc1?.title}" and "{doc2?.title}"
          </Typography>
        </Box>
      ) : (
        <Box className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-200/50 dark:bg-gray-900/80">
          <Box className="flex flex-col xl:flex-row justify-center gap-6 xl:gap-10 max-w-[1800px] mx-auto items-stretch min-h-full">
            
            {/* Left Pane: Document 1 (A4 Paper Style) */}
            <Box className="flex-1 bg-white dark:bg-gray-900 shadow-md dark:shadow-xl rounded-md border border-gray-300 dark:border-gray-700 flex flex-col max-w-[850px] w-full mx-auto shrink-0 relative overflow-hidden">
              <Box className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/30 text-center shrink-0">
                <Typography variant="subtitle2" className="font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">
                  Original: {doc1?.title || 'Untitled'}
                </Typography>
              </Box>
              {/* Paper Content Area */}
              <Box 
                className="flex-1 p-8 md:p-12 lg:p-16 whitespace-pre-wrap break-words font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-[14px] sm:text-[15px]" 
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word', tabSize: 4 }}
              >
                {diffs.map((part, index) => {
                  if (part.added) return null; // Hide additions in the "Original" view
                  
                  const isRemoved = part.removed;
                  return (
                    <span 
                      key={`left-${index}`} 
                      style={{ 
                        color: isRemoved ? '#991b1b' : 'inherit', 
                        textDecoration: isRemoved ? 'line-through' : 'none', 
                        backgroundColor: isRemoved ? '#fee2e2' : 'transparent', 
                        padding: isRemoved ? '2px 4px' : '0', 
                        borderRadius: '4px',
                        margin: isRemoved ? '0 1px' : '0',
                        display: 'inline', // Ensure inline wrapping
                      }}
                      className={isRemoved ? 'dark:bg-red-900/40 dark:text-red-400' : ''}
                    >
                      {part.value}
                    </span>
                  );
                })}
              </Box>
            </Box>

            {/* Right Pane: Document 2 (A4 Paper Style) */}
            <Box className="flex-1 bg-white dark:bg-gray-900 shadow-md dark:shadow-xl rounded-md border border-gray-300 dark:border-gray-700 flex flex-col max-w-[850px] w-full mx-auto shrink-0 relative overflow-hidden">
              <Box className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-900/30 text-center shrink-0">
                <Typography variant="subtitle2" className="font-bold text-green-800 dark:text-green-400 uppercase tracking-wider">
                  Modified: {doc2?.title || 'Untitled'}
                </Typography>
              </Box>
              {/* Paper Content Area */}
              <Box 
                className="flex-1 p-8 md:p-12 lg:p-16 whitespace-pre-wrap break-words font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-[14px] sm:text-[15px]" 
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word', tabSize: 4 }}
              >
                {diffs.map((part, index) => {
                  if (part.removed) return null; // Hide deletions in the "Modified" view
                  
                  const isAdded = part.added;
                  return (
                    <span 
                      key={`right-${index}`} 
                      style={{ 
                        color: isAdded ? '#166534' : 'inherit', 
                        backgroundColor: isAdded ? '#dcfce7' : 'transparent', 
                        padding: isAdded ? '2px 4px' : '0', 
                        borderRadius: '4px',
                        margin: isAdded ? '0 1px' : '0',
                        display: 'inline', // Ensure inline wrapping
                      }}
                      className={isAdded ? 'dark:bg-green-900/40 dark:text-green-400' : ''}
                    >
                      {part.value}
                    </span>
                  );
                })}
              </Box>
            </Box>

          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DocumentComparer;
