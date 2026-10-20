import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Button, IconButton, Collapse } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { setSubscriptionModalOpen } from '../../slices/subscriptionSlice';
import './StorageWarningBanner.css';

const StorageWarningBanner = ({ groupId }) => {
  const dispatch = useDispatch();
  const { userStats, groupStats } = useSelector((state) => state.subscription);
  const activeGroupId = useSelector((state) => state.groups.activeGroupId);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  const targetGroupId = groupId || activeGroupId;
  const stats = (targetGroupId && groupStats) ? groupStats : userStats;

  if (!stats) return null;

  const usedMB = stats.totalUsedMB || 0;
  const quotaMB = stats.totalQuotaMB || 50;
  const percent = stats.percentUsed || 0;
  const isExceeded = stats.isExceeded || percent >= 100;
  const isWarning = (stats.isWarning || percent >= (stats.warningThreshold || 80)) && !isExceeded;

  // Do not allow dismissing when exceeded (strict lockout enforcement)
  if (isExceeded) {
    return (
      <Box className="storage-banner storage-banner-exceeded">
        <Box className="storage-banner-content">
          <Box className="banner-icon-badge badge-danger">
            <LockIcon fontSize="small" />
          </Box>
          <Box className="storage-banner-text">
            <Typography variant="subtitle2" className="banner-title">
              WORKSPACE STORAGE QUOTA EXCEEDED ({usedMB} / {quotaMB} MB) — READ-ONLY MODE ACTIVE
            </Typography>
            <Typography variant="body2" className="banner-description">
              This organization workspace has reached 100% capacity. Document creation, editing, and file uploads are disabled.
              Existing documents remain fully available to <strong>read and view</strong> for all members.
            </Typography>
          </Box>
        </Box>

        <Box className="storage-banner-actions">
          <Button
            variant="contained"
            className="banner-upgrade-btn-danger"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => dispatch(setSubscriptionModalOpen(true))}
          >
            Upgrade Storage Now
          </Button>
        </Box>
      </Box>
    );
  }

  if (isWarning && !dismissedWarning) {
    return (
      <Box className="storage-banner storage-banner-warning">
        <Box className="storage-banner-content">
          <Box className="banner-icon-badge badge-warning">
            <WarningAmberIcon fontSize="small" />
          </Box>
          <Box className="storage-banner-text">
            <Typography variant="subtitle2" className="banner-title">
              Storage Warning: Workspace is {percent}% Full ({usedMB} / {quotaMB} MB)
            </Typography>
            <Typography variant="body2" className="banner-description">
              You are approaching the free storage limit. Upgrade your subscription to ensure uninterrupted editing and file uploads.
            </Typography>
          </Box>
        </Box>

        <Box className="storage-banner-actions">
          <Button
            variant="contained"
            size="small"
            className="banner-upgrade-btn-warning"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => dispatch(setSubscriptionModalOpen(true))}
          >
            Expand Quota (+50 MB)
          </Button>
          <IconButton 
            size="small" 
            onClick={() => setDismissedWarning(true)}
            sx={{ color: '#f59e0b', ml: 1 }}
            title="Dismiss warning"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return null;
};

export default StorageWarningBanner;
