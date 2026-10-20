import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Button, 
  Skeleton
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { 
  fetchStorageUsage, 
  fetchGroupStorageUsage,
  fetchTariff, 
  setSubscriptionModalOpen 
} from '../../slices/subscriptionSlice';
import './StorageIndicator.css';

const StorageIndicator = ({ groupId }) => {
  const dispatch = useDispatch();
  const { userStats, groupStats, tariff } = useSelector((state) => state.subscription);
  const activeGroupId = useSelector((state) => state.groups.activeGroupId);

  const targetGroupId = groupId || activeGroupId;

  useEffect(() => {
    dispatch(fetchTariff());
    if (!userStats) {
      dispatch(fetchStorageUsage());
    }
  }, [dispatch, userStats]);

  useEffect(() => {
    if (targetGroupId && (!groupStats || groupStats.currentGroupId !== targetGroupId)) {
      dispatch(fetchGroupStorageUsage(targetGroupId));
    }
  }, [dispatch, targetGroupId, groupStats]);

  // Use the group's storage stats (which reflects the group owner's quota) if available, otherwise personal stats
  const stats = (targetGroupId && groupStats && groupStats.currentGroupId === targetGroupId) 
    ? groupStats 
    : userStats;

  if (!stats) {
    return (
      <Box className="storage-indicator-container storage-bar-normal" sx={{ opacity: 0.7 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width={70} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Skeleton variant="text" width={35} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Box>
        <Skeleton variant="rounded" height={4} sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 0.25 }} />
      </Box>
    );
  }

  const usedMB = stats.totalUsedMB || 0;
  const quotaMB = stats.totalQuotaMB || (tariff?.freeStorageMB || 50);
  const percent = Math.min(100, Math.round(stats.percentUsed || (quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0)));
  const isExceeded = stats.isExceeded || percent >= 100;
  const isWarning = stats.isWarning || (percent >= (stats.warningThreshold || 80));

  let statusColor = '#10b981'; // Emerald
  let barClass = 'storage-bar-normal';
  if (isExceeded) {
    statusColor = '#ef4444'; // Red
    barClass = 'storage-bar-exceeded';
  } else if (isWarning) {
    statusColor = '#f59e0b'; // Amber
    barClass = 'storage-bar-warning';
  }

  return (
    <Box 
      className={`storage-indicator-container ${barClass}`}
      onClick={() => dispatch(setSubscriptionModalOpen(true))}
      title="Click to view storage details & upgrade subscription via Razorpay"
    >
      <Box className="storage-indicator-header">
        <Box className="storage-icon-title">
          {isExceeded ? (
            <LockIcon className="indicator-icon pulse-red" sx={{ fontSize: '0.85rem' }} />
          ) : isWarning ? (
            <WarningAmberIcon className="indicator-icon pulse-amber" sx={{ fontSize: '0.85rem' }} />
          ) : (
            <CloudQueueIcon className="indicator-icon" sx={{ fontSize: '0.85rem' }} />
          )}
          <Typography variant="caption" className="storage-text-label">
            {isExceeded ? 'Storage Full' : isWarning ? 'Storage Warning' : 'Workspace Storage'}
          </Typography>
        </Box>

        <Typography variant="caption" className="storage-fraction">
          <strong>{usedMB}</strong> / {quotaMB} MB
        </Typography>
      </Box>

      <Box className="storage-progress-wrapper">
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 3.5,
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            '.dark &': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
            '& .MuiLinearProgress-bar': {
              backgroundColor: statusColor,
              borderRadius: 2,
              transition: 'transform 0.4s ease-in-out'
            }
          }}
        />
      </Box>

      <Box className="storage-indicator-footer">
        <Typography variant="caption" sx={{ color: statusColor, fontWeight: 700, fontSize: '0.64rem', lineHeight: 1 }}>
          {percent}% Used
        </Typography>

        <Button
          size="small"
          variant="contained"
          className={`storage-upgrade-btn ${isExceeded ? 'btn-danger' : isWarning ? 'btn-warning' : 'btn-primary'}`}
          sx={!isExceeded && !isWarning ? {
            background: 'linear-gradient(135deg, #3b82f6 0%, #326127 100%) !important',
            color: 'white !important',
            boxShadow: '0 1px 5px rgba(59, 130, 246, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #2563eb 0%, #1f4d1d 100%) !important',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.45)',
              transform: 'translateY(-0.5px)'
            }
          } : undefined}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: '0.68rem !important' }} />}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setSubscriptionModalOpen(true));
          }}
        >
          {isExceeded ? 'Unlock' : 'Upgrade'}
        </Button>
      </Box>
    </Box>
  );
};

export default StorageIndicator;
