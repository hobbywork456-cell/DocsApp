import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Chip,
  List,
  ListItem,
  Avatar,
  Divider
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LogoutIcon from '@mui/icons-material/Logout';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupIcon from '@mui/icons-material/Group';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../slices/authSlice';
import { 
  createGroup, 
  joinGroup, 
  setActiveGroupId, 
  fetchGroupMembers,
  removeGroupMember,
  deleteGroup,
  acceptJoinRequest,
  rejectJoinRequest,
  fetchInviteToken
} from '../../slices/groupSlice';
import './Navbar.css';

const Navbar = ({ mobileView, onToggleMobileView, hasOpenDocuments }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { 
    groups, 
    activeGroupId, 
    actionLoading, 
    currentGroupMembers, 
    currentJoinRequests,
    isCurrentUserAdmin, 
    membersLoading 
  } = useSelector((state) => state.groups);

  // Group Switcher Menu
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const isMenuOpen = Boolean(menuAnchorEl);

  // Add Group Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [addDialogError, setAddDialogError] = useState('');

  // Join Group Dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinInputId, setJoinInputId] = useState('');
  const [joinDialogError, setJoinDialogError] = useState('');

  // Manage Group Members Dialog
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  // Delete Group Confirmation Dialog
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Toast message
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState('success');

  const currentGroup = groups.find((g) => g.groupId === activeGroupId) || null;

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleOpenGroupMenu = (e) => {
    setMenuAnchorEl(e.currentTarget);
  };

  const handleCloseGroupMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleSelectGroup = (groupId) => {
    dispatch(setActiveGroupId(groupId));
    handleCloseGroupMenu();
  };

  // Auto-generate a clean readable group ID
  const handleGenerateId = () => {
    const randomHex = Math.random().toString(36).substring(2, 7);
    if (newGroupName && newGroupName.trim()) {
      const slug = newGroupName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 15);
      setNewGroupId(`${slug}-${randomHex}`);
    } else {
      setNewGroupId(`group-${randomHex}`);
    }
  };

  const handleOpenAddDialog = () => {
    setNewGroupName('');
    setNewGroupId('');
    setAddDialogError('');
    setAddDialogOpen(true);
    handleCloseGroupMenu();
  };

  const handleCloseAddDialog = () => {
    if (actionLoading) return;
    setAddDialogOpen(false);
    setAddDialogError('');
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setAddDialogError('Please enter a group name');
      return;
    }

    setAddDialogError('');
    const resultAction = await dispatch(
      createGroup({ 
        name: newGroupName.trim(), 
        groupId: newGroupId.trim() || undefined 
      })
    );

    if (createGroup.fulfilled.match(resultAction)) {
      setAddDialogOpen(false);
      setToastMessage(`Group "${resultAction.payload.name}" created!`);
      setToastSeverity('success');
    } else {
      setAddDialogError(resultAction.payload || 'Failed to create group');
    }
  };

  const handleOpenJoinDialog = () => {
    setJoinInputId('');
    setJoinDialogError('');
    setJoinDialogOpen(true);
    handleCloseGroupMenu();
  };

  const handleCloseJoinDialog = () => {
    if (actionLoading) return;
    setJoinDialogOpen(false);
    setJoinDialogError('');
  };

  const handleJoinGroupSubmit = async (e) => {
    e.preventDefault();
    if (!joinInputId.trim()) {
      setJoinDialogError('Please enter a Group ID');
      return;
    }

    setJoinDialogError('');
    const resultAction = await dispatch(joinGroup({ groupId: joinInputId.trim() }));

    if (joinGroup.fulfilled.match(resultAction)) {
      setJoinDialogOpen(false);
      setToastMessage(`Joined "${resultAction.payload.name}" successfully!`);
      setToastSeverity('success');
    } else {
      setJoinDialogError(resultAction.payload || 'Failed to join group');
    }
  };

  // Group Members & Admin Dialog Handlers
  const handleOpenMembersDialog = () => {
    if (!activeGroupId) return;
    dispatch(fetchGroupMembers(activeGroupId));
    setMembersDialogOpen(true);
    handleCloseGroupMenu();
  };

  const handleCloseMembersDialog = () => {
    setMembersDialogOpen(false);
  };

  const handleRemoveMember = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from this group?`)) {
      return;
    }
    const resultAction = await dispatch(removeGroupMember({ groupId: activeGroupId, userId }));
    if (removeGroupMember.fulfilled.match(resultAction)) {
      setToastMessage(`Removed ${userEmail} from group`);
      setToastSeverity('info');
    } else {
      setToastMessage(resultAction.payload || 'Failed to remove member');
      setToastSeverity('error');
    }
  };

  const handleAcceptRequest = async (userId) => {
    await dispatch(acceptJoinRequest({ groupId: activeGroupId, userId }));
  };

  const handleRejectRequest = async (userId) => {
    await dispatch(rejectJoinRequest({ groupId: activeGroupId, userId }));
  };

  const handleCopyInviteLink = async () => {
    const resultAction = await dispatch(fetchInviteToken({ groupId: activeGroupId }));
    if (fetchInviteToken.fulfilled.match(resultAction)) {
      const inviteToken = resultAction.payload.inviteToken;
      const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
      navigator.clipboard.writeText(inviteUrl);
      setToastMessage('Invite link copied to clipboard!');
      setToastSeverity('success');
    } else {
      setToastMessage('Failed to generate invite link');
      setToastSeverity('error');
    }
  };

  // Delete Group Handlers
  const handleOpenDeleteGroupDialog = () => {
    setDeleteConfirmText('');
    setDeleteGroupDialogOpen(true);
  };

  const handleCloseDeleteGroupDialog = () => {
    if (actionLoading) return;
    setDeleteGroupDialogOpen(false);
    setDeleteConfirmText('');
  };

  const handleDeleteGroupSubmit = async () => {
    if (deleteConfirmText.trim() !== 'delete group') return;

    const groupNameToDelete = currentGroup?.name || 'Group';
    const resultAction = await dispatch(deleteGroup({ groupId: activeGroupId }));

    if (deleteGroup.fulfilled.match(resultAction)) {
      setDeleteGroupDialogOpen(false);
      setMembersDialogOpen(false);
      setToastMessage(`Group "${groupNameToDelete}" and all documents were deleted.`);
      setToastSeverity('warning');
    } else {
      setToastMessage(resultAction.payload || 'Failed to delete group');
      setToastSeverity('error');
    }
  };

  return (
    <>
    <AppBar 
      component="header" 
      id="app-header" 
      position="static" 
      color="transparent" 
      elevation={0} 
      className="bg-white border-b border-gray-200 pt-0.5 sm:pt-1 pb-0.5 sm:pb-1"
    >
      <Toolbar component="nav" id="app-navigation" aria-label="Main Navigation" className="px-2 sm:px-6 min-h-[56px] sm:min-h-[64px] flex items-center justify-between gap-1 sm:gap-4">
        {/* Left Side: Brand Logo, Group Switcher & Members Button */}
        <Box className="flex items-center gap-1.5 sm:gap-3 overflow-hidden">
          <Box className="flex items-center shrink-0 mr-1 sm:mr-2">
            <MenuBookIcon sx={{ color: '#ff84ba', mr: 0.75, fontSize: { xs: 24, sm: 30 } }} />
            <Typography 
              variant="h6" 
              noWrap 
              component="span" 
              className="font-black gradient-text tracking-wide text-lg sm:text-2xl select-none"
              sx={{ display: 'inline-block', fontWeight: 900 }}
            >
              DocsApp
            </Typography>
          </Box>

          {/* Group Switcher Button */}
          <Tooltip title="Switch Active Group">
            <Button
              id="navbar-group-selector-btn"
              aria-label="Active Group Selector"
              aria-controls={isMenuOpen ? 'group-switcher-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={isMenuOpen ? 'true' : undefined}
              onClick={handleOpenGroupMenu}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                px: { xs: 1.2, sm: 2 },
                py: { xs: 0.4, sm: 0.6 },
                textTransform: 'none',
                maxWidth: { xs: '140px', sm: '220px' },
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#f9fafb',
                  borderColor: '#d1d5db'
                }
              }}
            >
              <Box className="flex items-center gap-1 sm:gap-1.5 truncate text-left">
                <GroupIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#ff84ba', shrink: 0 }} />
                <Typography 
                  variant="body2" 
                  className="font-bold text-gray-800 truncate text-xs sm:text-sm"
                >
                  {currentGroup ? currentGroup.name : 'Select Group'}
                </Typography>
              </Box>
            </Button>
          </Tooltip>

          {/* Quick Group Members & Admin Settings Button */}
          {currentGroup && (
            <Tooltip title="Group Members & Admin Settings">
              <IconButton
                id="navbar-group-members-btn"
                aria-label="View Group Members and Settings"
                size="small"
                onClick={handleOpenMembersDialog}
                sx={{
                  color: '#4b5563',
                  bgcolor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  p: { xs: '5px', sm: '7px' },
                  '&:hover': { bgcolor: '#fff0f6', borderColor: '#ff84ba' }
                }}
              >
                <PeopleIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Group Selector Dropdown Menu */}
          <Menu
            id="group-switcher-menu"
            anchorEl={menuAnchorEl}
            open={isMenuOpen}
            onClose={handleCloseGroupMenu}
            PaperProps={{
              sx: {
                borderRadius: '6px',
                mt: 1,
                minWidth: '240px',
                maxWidth: '320px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                p: 0.5
              }
            }}
          >
            <Typography variant="caption" className="px-3 py-1 font-bold text-gray-400 uppercase tracking-wider block text-[11px]">
              My Groups ({groups.length})
            </Typography>

            {groups.map((group) => {
              const isSelected = group.groupId === activeGroupId;
              return (
                <MenuItem 
                  key={group._id || group.groupId}
                  onClick={() => handleSelectGroup(group.groupId)}
                  className={`rounded-xl my-0.5 transition-all ${isSelected ? 'bg-pink-50 font-bold' : ''}`}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isSelected ? <CheckIcon sx={{ color: '#000', fontSize: 18 }} /> : <GroupIcon sx={{ color: '#9ca3af', fontSize: 18 }} />}
                  </ListItemIcon>
                  <Box className="flex flex-col">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.85rem', 
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#e06b9e' : '#374151'
                      }}
                    >
                      {group.name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      ID: {group.groupId}
                    </Typography>
                  </Box>
                </MenuItem>
              );
            })}

            {groups.length === 0 && (
              <Box className="px-3 py-2 text-center text-gray-400 text-xs italic">
                No groups joined yet
              </Box>
            )}

            <Box className="border-t border-gray-200 my-1 pt-1">
              {currentGroup && (
                <MenuItem onClick={handleOpenMembersDialog} className="rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50">
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <PeopleIcon sx={{ color: '#4b5563', fontSize: 18 }} />
                  </ListItemIcon>
                  Manage Group Members
                </MenuItem>
              )}
              <MenuItem onClick={handleOpenAddDialog} className="rounded-md text-xs font-bold text-gray-900 hover:bg-gray-50">
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <GroupAddIcon sx={{ color: '#4b5563', fontSize: 18 }} />
                </ListItemIcon>
                Create New Group
              </MenuItem>
              <MenuItem onClick={handleOpenJoinDialog} className="rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50">
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <GroupIcon sx={{ color: '#6b7280', fontSize: 18 }} />
                </ListItemIcon>
                Join Existing Group
              </MenuItem>
            </Box>
          </Menu>

        </Box>

        {/* Right Side Actions: Add Group, Join Group, User Avatar & Logout */}
        <Box className="hidden md:flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Add Group Button */}
          <Button
            id="navbar-add-group-btn"
            variant="contained"
            size="small"
            startIcon={<GroupAddIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
            onClick={handleOpenAddDialog}
            aria-label="Create a new group"
            sx={{
              background: 'linear-gradient(135deg, #ff9ecc 0%, #ff84ba 100%)',
              color: 'white',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1.2, sm: 2 },
              py: { xs: 0.4, sm: 0.6 },
              boxShadow: 'none',
              '&:hover': {
                background: '#333',
                boxShadow: 'none',
              }
            }}
          >
            <span className="hidden sm:inline">Add Group</span>
            <span className="sm:hidden">Add</span>
          </Button>

          {/* Join Group Button */}
          <Button
            id="navbar-join-group-btn"
            variant="outlined"
            size="small"
            startIcon={<GroupIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
            onClick={handleOpenJoinDialog}
            aria-label="Join an existing group"
            sx={{
              borderColor: '#ff84ba',
              color: '#ff84ba',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1.2, sm: 2 },
              py: { xs: 0.4, sm: 0.6 },
              '&:hover': {
                borderColor: '#e06b9e',
                bgcolor: '#fff0f6',
                color: '#e06b9e'
              }
            }}
          >
            <span className="hidden sm:inline">Join Group</span>
            <span className="sm:hidden">Join</span>
          </Button>

          {/* User Email Pill (Desktop) / Initial Circle (Mobile) */}
          <Box className="hidden lg:block px-3 py-1 rounded-xl bg-white/90 border border-pink-100 shadow-sm">
            <Typography variant="caption" className="font-semibold text-gray-700">
              {user?.email}
            </Typography>
          </Box>
          <Tooltip title={user?.email || 'User'}>
            <Box aria-label="User Avatar" className="lg:hidden w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff84ba] to-[#ff9ecc] text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Box>
          </Tooltip>

          {/* Logout Button */}
          <IconButton 
            id="navbar-logout-btn"
            aria-label="Log out"
            size="small"
            onClick={handleLogout}
            sx={{ 
              color: '#e06b9e', 
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 132, 186, 0.3)',
              borderRadius: '8px',
              p: { xs: '5px', sm: '7px' },
              '&:hover': { backgroundColor: '#fff0f6', borderColor: '#ff84ba' }, 
            }}
          >
            <LogoutIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
          </IconButton>
        </Box>
      </Toolbar>

      <Dialog
        id="add-group-dialog"
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid #ffe4ef'
          }
        }}
      >
        <Box component="form" onSubmit={handleCreateGroupSubmit}>
          <DialogTitle className="flex justify-between items-center pb-2">
            <Box className="flex items-center gap-2">
              <Box className="p-2 rounded-xl bg-pink-50 text-[#ff84ba] border border-pink-100">
                <GroupAddIcon fontSize="small" />
              </Box>
              <Typography variant="h6" className="font-extrabold text-gray-800">
                Create New Group
              </Typography>
            </Box>
            <IconButton onClick={handleCloseAddDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent className="pt-2 pb-2">
            <Typography variant="body2" className="text-gray-500 mb-4 text-xs sm:text-sm">
              Create a group workspace. Only members of this group will be able to read and write documentation inside it.
            </Typography>

            {addDialogError && (
              <Alert severity="error" className="mb-4 text-xs rounded-xl" onClose={() => setAddDialogError('')}>
                {addDialogError}
              </Alert>
            )}

            <Box className="space-y-4">
              <TextField
                id="create-group-name-input"
                label="Group Name"
                placeholder="e.g. IT Support, DevOps, Operations"
                fullWidth
                size="small"
                required
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setAddDialogError('');
                }}
                InputProps={{
                  className: 'rounded-xl bg-white/70'
                }}
              />

              <Box>
                <TextField
                  id="create-group-id-input"
                  label="Group ID (Unique)"
                  placeholder="e.g. nkoor-devops (or click Generate)"
                  fullWidth
                  size="small"
                  value={newGroupId}
                  onChange={(e) => {
                    setNewGroupId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    setAddDialogError('');
                  }}
                  helperText="Use your own ID or click 'Generate ID'"
                  InputProps={{
                    className: 'rounded-xl bg-white/70',
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          id="create-group-generate-btn"
                          size="small"
                          type="button"
                          onClick={handleGenerateId}
                          startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ff84ba',
                            bgcolor: 'rgba(255, 132, 186, 0.1)',
                            borderRadius: '8px',
                            px: 1,
                            py: 0.25,
                            '&:hover': { bgcolor: 'rgba(255, 132, 186, 0.2)' }
                          }}
                        >
                          Generate
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Box>
          </DialogContent>

          <DialogActions className="p-4 pt-2 gap-2">
            <Button 
              id="create-group-cancel-btn"
              onClick={handleCloseAddDialog} 
              color="inherit" 
              className="font-bold text-gray-500 rounded-xl capitalize"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              id="create-group-submit-btn"
              type="submit"
              variant="contained"
              disabled={actionLoading || !newGroupName.trim()}
              className="rounded-xl font-bold capitalize bg-gradient-to-r from-[#ff9ecc] to-[#ff84ba] text-white shadow-md hover:shadow-lg"
              sx={{ px: 3, textTransform: 'none' }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Create Group'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* JOIN GROUP DIALOG */}
      <Dialog
        id="join-group-dialog"
        open={joinDialogOpen}
        onClose={handleCloseJoinDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid #ffe4ef'
          }
        }}
      >
        <Box component="form" onSubmit={handleJoinGroupSubmit}>
          <DialogTitle className="flex justify-between items-center pb-2">
            <Box className="flex items-center gap-2">
              <Box className="p-2 rounded-xl bg-pink-50 text-[#ff84ba] border border-pink-100">
                <GroupIcon fontSize="small" />
              </Box>
              <Typography variant="h6" className="font-extrabold text-gray-800">
                Join a Group
              </Typography>
            </Box>
            <IconButton onClick={handleCloseJoinDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent className="pt-2 pb-2">
            <Typography variant="body2" className="text-gray-500 mb-4 text-xs sm:text-sm">
              Enter the unique Group ID (for example: <strong className="text-pink-600">nkoor-it</strong>). This will send a request to the admin. Once approved, you can read and write documents inside this group.
            </Typography>

            {joinDialogError && (
              <Alert severity="error" className="mb-4 text-xs rounded-xl" onClose={() => setJoinDialogError('')}>
                {joinDialogError}
              </Alert>
            )}

            <TextField
              id="join-group-id-input"
              label="Group ID"
              placeholder="e.g. nkoor-it"
              fullWidth
              autoFocus
              size="small"
              required
              value={joinInputId}
              onChange={(e) => {
                setJoinInputId(e.target.value);
                setJoinDialogError('');
              }}
              helperText="Joining is a one-time process."
              InputProps={{
                className: 'rounded-xl bg-white/70'
              }}
            />
          </DialogContent>

          <DialogActions className="p-4 pt-2 gap-2">
            <Button 
              id="join-group-cancel-btn"
              onClick={handleCloseJoinDialog} 
              color="inherit" 
              className="font-bold text-gray-500 rounded-xl capitalize"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              id="join-group-submit-btn"
              type="submit"
              variant="contained"
              disabled={actionLoading || !joinInputId.trim()}
              className="rounded-xl font-bold capitalize bg-gradient-to-r from-[#ff9ecc] to-[#ff84ba] text-white shadow-md hover:shadow-lg"
              sx={{ px: 3, textTransform: 'none' }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Join Group'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* MANAGE GROUP MEMBERS & SETTINGS DIALOG */}
      <Dialog
        id="group-members-dialog"
        open={membersDialogOpen}
        onClose={handleCloseMembersDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid #ffe4ef'
          }
        }}
      >
        <DialogTitle className="flex justify-between items-center pb-2">
          <Box className="flex items-center gap-2">
            <Box className="p-2 rounded-xl bg-pink-50 text-[#ff84ba] border border-pink-100">
              <PeopleIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" className="font-extrabold text-gray-800 leading-tight">
                {currentGroup?.name || 'Group Members'}
              </Typography>
              <Typography variant="caption" className="text-gray-500 font-mono">
                ID: {currentGroup?.groupId}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleCloseMembersDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="pt-2 pb-2">
          {/* Group Info Banner */}
          <Box className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-pink-50 to-white border border-pink-100 mb-4 shadow-sm">
            <Box>
              <Typography variant="body2" className="font-bold text-gray-700">
                Total Members: <span className="text-[#e06b9e]">{currentGroupMembers.length}</span>
              </Typography>
              <Typography variant="caption" className="text-gray-500">
                {isCurrentUserAdmin ? 'You are the Group Admin.' : 'You are a Member of this group.'}
              </Typography>
            </Box>
            {isCurrentUserAdmin && (
              <Chip 
                icon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />} 
                label="Group Admin" 
                size="small"
                className="bg-gradient-to-r from-pink-400 to-[#ff84ba] text-white font-bold text-xs shadow-sm" 
              />
            )}
          </Box>

          {/* Members List */}
          <Typography variant="subtitle2" className="font-bold text-gray-700 mb-2 uppercase text-[11px] tracking-wider">
            Group Members
          </Typography>

          {membersLoading ? (
            <Box className="flex justify-center py-6">
              <CircularProgress size={32} sx={{ color: '#ff84ba' }} />
            </Box>
          ) : (
            <List className="p-0 space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
              {currentGroupMembers.map((member) => (
                <ListItem 
                  key={member._id}
                  disablePadding
                  className="p-2.5 rounded-xl bg-white border border-pink-50 flex items-center justify-between shadow-sm"
                >
                  <Box className="flex items-center gap-3 overflow-hidden flex-1">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: member.isAdmin ? '#ff84ba' : '#e0e7ff', color: member.isAdmin ? 'white' : '#4338ca', fontSize: 13, fontWeight: 'bold' }}>
                      {member.email?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box className="overflow-hidden">
                      <Typography variant="body2" className="font-bold text-gray-800 truncate text-xs sm:text-sm">
                        {member.email}
                      </Typography>
                      <Typography variant="caption" className="text-gray-400 block text-[10px]">
                        {member.isAdmin ? 'Admin (Creator)' : 'Member'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="flex items-center justify-end gap-2 shrink-0 ml-auto pl-2">
                    {member.isAdmin ? (
                      <Chip 
                        label="Admin" 
                        size="small" 
                        className="bg-pink-100 text-[#e06b9e] font-bold text-[10px] h-5" 
                      />
                    ) : (
                      isCurrentUserAdmin && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<PersonRemoveIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleRemoveMember(member._id, member.email)}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            px: 1,
                            py: 0.2,
                            borderColor: '#fca5a5',
                            '&:hover': { bgcolor: '#fee2e2', borderColor: '#ef4444' }
                          }}
                        >
                          Remove
                        </Button>
                      )
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}

          {/* JOIN REQUESTS (ADMIN ONLY) */}
          {isCurrentUserAdmin && currentJoinRequests && currentJoinRequests.length > 0 && (
            <Box className="mt-4 pt-4 border-t border-pink-100">
              <Typography variant="subtitle2" className="font-bold text-gray-700 mb-2 uppercase text-[11px] tracking-wider">
                Pending Join Requests ({currentJoinRequests.length})
              </Typography>
              <List className="p-0 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {currentJoinRequests.map((req) => (
                  <ListItem key={req._id} disablePadding className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between shadow-sm">
                    <Box className="flex items-center gap-2 overflow-hidden flex-1">
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#f97316', fontSize: 12, fontWeight: 'bold' }}>
                        {req.email?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" className="font-bold text-gray-800 truncate text-xs">
                        {req.email}
                      </Typography>
                    </Box>
                    <Box className="flex items-center justify-end gap-1 shrink-0 ml-auto pl-2">
                      <IconButton size="small" onClick={() => handleAcceptRequest(req._id)} sx={{ color: '#10b981', bgcolor: '#ecfdf5', '&:hover': { bgcolor: '#d1fae5' } }}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRejectRequest(req._id)} sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* INVITE LINK (ADMIN ONLY) */}
          {isCurrentUserAdmin && (
            <Box className="mt-4 pt-4 border-t border-pink-100">
              <Box className="p-3.5 rounded-xl bg-gradient-to-r from-pink-50 to-white border border-pink-100 flex flex-col items-start gap-2 shadow-sm">
                <Typography variant="subtitle2" className="font-extrabold text-[#e06b9e] flex items-center gap-1">
                  <LinkIcon fontSize="small" /> Share Invite Link
                </Typography>
                <Typography variant="caption" className="text-gray-600 leading-relaxed">
                  Users who click the invite link will automatically join without needing approval.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyInviteLink}
                  sx={{ mt: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 'bold', borderColor: '#ffb6d8', color: '#e06b9e', '&:hover': { borderColor: '#ff84ba', bgcolor: '#fff0f6' } }}
                >
                  Copy Link
                </Button>
              </Box>
            </Box>
          )}

          {/* DANGER ZONE (ADMIN ONLY) */}
          {isCurrentUserAdmin && (
            <Box className="mt-6 pt-4 border-t border-red-100">
              <Box className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 shadow-sm">
                <Box className="flex items-center gap-2 mb-1.5">
                  <WarningAmberIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" className="font-extrabold text-red-700">
                    Danger Zone: Delete Group
                  </Typography>
                </Box>
                <Typography variant="caption" className="text-gray-600 block mb-3 leading-relaxed">
                  Deleting this group will <strong>permanently delete all documents</strong> belonging to this group. This action cannot be reversed.
                </Typography>
                <Button
                  id="open-delete-group-modal-btn"
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteForeverIcon />}
                  onClick={handleOpenDeleteGroupDialog}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', bgcolor: '#dc2626' }
                  }}
                >
                  Delete Group & Documents
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions className="p-3 pt-1">
          <Button onClick={handleCloseMembersDialog} className="font-bold text-gray-500 capitalize">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM DELETE GROUP DIALOG */}
      <Dialog
        id="delete-group-confirm-dialog"
        open={deleteGroupDialogOpen}
        onClose={handleCloseDeleteGroupDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            border: '2px solid #fca5a5'
          }
        }}
      >
        <DialogTitle className="flex items-center gap-2 pb-2 text-red-600 font-extrabold">
          <DeleteForeverIcon />
          Delete Group Permanently?
        </DialogTitle>

        <DialogContent className="pt-2 pb-2">
          <Typography variant="body2" className="text-gray-700 mb-3">
            You are about to permanently delete <strong>{currentGroup?.name}</strong> (ID: <code className="text-pink-600">{currentGroup?.groupId}</code>).
          </Typography>
          
          <Alert severity="error" className="mb-4 text-xs rounded-xl font-medium">
            <strong>Warning:</strong> All documentation created inside this group will be permanently deleted as well!
          </Alert>

          <Typography variant="body2" className="text-gray-600 mb-2 text-xs">
            Please type <strong className="text-red-600 font-mono">delete group</strong> to confirm:
          </Typography>

          <TextField
            id="delete-group-confirm-input"
            fullWidth
            size="small"
            autoFocus
            placeholder="delete group"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            InputProps={{
              className: 'rounded-xl bg-white/70 font-mono'
            }}
          />
        </DialogContent>

        <DialogActions className="p-4 pt-2 gap-2">
          <Button 
            onClick={handleCloseDeleteGroupDialog} 
            color="inherit" 
            className="font-bold text-gray-500 rounded-xl capitalize"
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-group-submit-btn"
            variant="contained"
            color="error"
            disabled={deleteConfirmText.trim() !== 'delete group' || actionLoading}
            onClick={handleDeleteGroupSubmit}
            className="rounded-xl font-bold capitalize shadow-md hover:shadow-lg"
            sx={{ px: 3, textTransform: 'none' }}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TOAST SNACKBAR */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToastMessage('')} 
          severity={toastSeverity} 
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </AppBar>

    {/* TELEGRAM-STYLE BOTTOM NAVBAR FOR MOBILE */}
    <Box className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-gray-100 flex items-center justify-around z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe transition-all">
      <Button 
        onClick={() => onToggleMobileView && onToggleMobileView('sidebar')}
        sx={{ 
          display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5,
          color: mobileView === 'sidebar' ? '#ff84ba' : '#9ca3af',
          '&:hover': { bgcolor: 'transparent' }
        }}
      >
        <LibraryBooksIcon sx={{ fontSize: 24, mb: 0.3 }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: mobileView === 'sidebar' ? 800 : 500, textTransform: 'none', letterSpacing: '0.02em' }}>Library</Typography>
      </Button>
      
      <Button 
        onClick={() => {
          if (hasOpenDocuments) onToggleMobileView && onToggleMobileView('editor');
        }}
        sx={{ 
          display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5,
          color: hasOpenDocuments ? (mobileView === 'editor' ? '#ff84ba' : '#9ca3af') : '#e5e7eb',
          '&:hover': { bgcolor: 'transparent' }
        }}
      >
        <DescriptionIcon sx={{ fontSize: 24, mb: 0.3 }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: mobileView === 'editor' ? 800 : 500, textTransform: 'none', letterSpacing: '0.02em' }}>Editor</Typography>
      </Button>

      <Button 
        onClick={handleOpenJoinDialog}
        sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#9ca3af', '&:hover': { bgcolor: 'transparent', color: '#ff84ba' } }}
      >
        <GroupIcon sx={{ fontSize: 24, mb: 0.3 }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.02em' }}>Join</Typography>
      </Button>

      <Button 
        onClick={handleOpenAddDialog}
        sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#9ca3af', '&:hover': { bgcolor: 'transparent', color: '#ff84ba' } }}
      >
        <GroupAddIcon sx={{ fontSize: 24, mb: 0.3 }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.02em' }}>Create</Typography>
      </Button>

      <Button 
        onClick={handleLogout}
        sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#f87171', '&:hover': { bgcolor: 'transparent', color: '#ef4444' } }}
      >
        <LogoutIcon sx={{ fontSize: 24, mb: 0.3 }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.02em' }}>Logout</Typography>
      </Button>
    </Box>
    </>
  );
};

export default Navbar;
