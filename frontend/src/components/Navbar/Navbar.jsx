import { useState } from 'react';
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
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Chip,
  List,
  ListItem,
  Avatar,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
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
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../../slices/themeSlice';
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
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
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
      className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 pt-0.5 sm:pt-1 pb-0.5 sm:pb-1"
    >
      <Toolbar component="nav" id="app-navigation" aria-label="Main Navigation" className="px-2 sm:px-6 min-h-[56px] sm:min-h-[64px] flex items-center justify-between gap-1 sm:gap-4">
        {/* Left Side: Brand Logo, Group Switcher */}
        <Box className="flex items-center overflow-hidden">
          <Box className="flex items-center shrink-0">
            <MenuBookIcon sx={{ color: '#427c36', mr: 0.75, fontSize: { xs: 26, sm: 32 } }} />
            <Typography 
              variant="h6" 
              noWrap 
              component="span" 
              className="font-black gradient-text tracking-wide text-xl sm:text-2xl select-none"
              sx={{ display: 'inline-block', fontWeight: 900 }}
            >
              DocsApp
            </Typography>
          </Box>



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
            <Typography variant="caption" className="px-3 py-1 font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block text-[11px]">
              My Groups ({groups.length})
            </Typography>

            {groups.map((group) => {
              const isSelected = group.groupId === activeGroupId;
              return (
                <MenuItem 
                  key={group._id || group.groupId}
                  onClick={() => handleSelectGroup(group.groupId)}
                  className={`rounded-xl my-0.5 transition-all ${isSelected ? 'bg-green-50 dark:bg-green-900/40 font-bold' : ''}`}
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
                        color: isSelected ? '#326127' : '#374151'
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
              <Box className="px-3 py-2 text-center text-gray-400 dark:text-gray-500 text-xs italic">
                No groups joined yet
              </Box>
            )}

            <Box className="border-t border-gray-200 dark:border-gray-700 my-1 pt-1">
              {currentGroup && (
                <MenuItem onClick={handleOpenMembersDialog} className="rounded-md text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800">
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <PeopleIcon sx={{ color: '#4b5563', fontSize: 15 }} />
                  </ListItemIcon>
                  Manage Group Members
                </MenuItem>
              )}
              <MenuItem onClick={handleOpenAddDialog} className="rounded-md text-xs font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-800">
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <GroupAddIcon sx={{ color: '#4b5563', fontSize: 15 }} />
                </ListItemIcon>
                Create New Group
              </MenuItem>
              <MenuItem onClick={handleOpenJoinDialog} className="rounded-md text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800">
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <GroupIcon sx={{ color: '#6b7280', fontSize: 15 }} />
                </ListItemIcon>
                Join Existing Group
              </MenuItem>
            </Box>
          </Menu>

        </Box>

        {/* Right Side Actions */}
        <Box className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Group Switcher (Visible on Mobile & Desktop) */}
          <Tooltip title="Switch Active Group">
            <Box 
              onClick={handleOpenGroupMenu}
              className="group flex items-center cursor-pointer transition-all duration-200"
              sx={{
                background: 'linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(66,124,54,0.06) 100%)',
                border: '1px solid rgba(66,124,54,0.1)',
                borderRadius: '10px',
                padding: { xs: '4px 6px', sm: '6px 12px' },
                '&:hover': { 
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(66,124,54,0.12) 100%)',
                  borderColor: 'rgba(66,124,54,0.3)',
                  boxShadow: '0 2px 8px rgba(66,124,54,0.1)'
                }
              }}
            >
              <Typography 
                variant="caption" 
                className="font-bold text-[#326127] uppercase tracking-wide truncate max-w-[100px] sm:max-w-[140px] mr-0.5 sm:mr-1 transition-colors"
                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              >
                {currentGroup ? currentGroup.name : 'NO GROUP'}
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#427c36', transition: 'transform 0.2s', ...{ '.group:hover &': { transform: 'translateY(1px)' } } }} />
            </Box>
          </Tooltip>

          <Box className="w-[1px] h-6 bg-green-100 dark:bg-green-900/60 mx-0.5 sm:mx-1 hidden md:block" />
          
          {/* Desktop-only extra buttons */}
          <Box className="hidden md:flex items-center gap-1.5">
            {currentGroup && (
              <Tooltip title="Manage Group Members">
                <IconButton
                  onClick={handleOpenMembersDialog}
                  size="small"
                  sx={{ color: '#427c36', bgcolor: 'rgba(66,124,54,0.04)', p: '8px', borderRadius: '10px', '&:hover': { bgcolor: 'rgba(66,124,54,0.1)', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
                >
                  <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Create New Group">
              <IconButton
                onClick={handleOpenAddDialog}
                size="small"
                sx={{ color: '#427c36', bgcolor: 'rgba(66,124,54,0.04)', p: '8px', borderRadius: '10px', '&:hover': { bgcolor: 'rgba(66,124,54,0.1)', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
              >
                <GroupAddIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Join Existing Group">
              <IconButton
                onClick={handleOpenJoinDialog}
                size="small"
                sx={{ color: '#427c36', bgcolor: 'rgba(66,124,54,0.04)', p: '8px', borderRadius: '10px', '&:hover': { bgcolor: 'rgba(66,124,54,0.1)', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
              >
                <GroupIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box className="w-[1px] h-6 bg-blue-100 mx-1 hidden md:block" />

          {/* Theme Toggle */}
            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton 
                onClick={() => dispatch(toggleTheme())}
                size="small"
                sx={{ 
                  color: isDarkMode ? '#fbbf24' : '#4b5563', 
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6', 
                  p: { xs: '6px', sm: '8px' }, 
                  borderRadius: '10px', 
                  mr: 1, 
                  '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#e5e7eb', transform: 'translateY(-1px)' }, 
                  transition: 'all 0.2s' 
                }}
              >
                {isDarkMode ? <LightModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} /> : <DarkModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              </IconButton>
            </Tooltip>
            
            {/* User Avatar (Desktop only) */}
            <Tooltip title="My Profile">
              <Box 
                onClick={() => setProfileDialogOpen(true)}
                className="hidden md:flex w-9 h-9 rounded-full items-center justify-center font-bold text-sm cursor-pointer shadow-sm dark:shadow-none border-2 border-white hover:scale-105 transition-transform"
                sx={{ background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)', color: 'white', ml: 1 }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Box>
            </Tooltip>
        </Box>
      </Toolbar>

      <Dialog
        id="add-group-dialog"
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: '1px solid #dcfce3'
            }
          }
        }}
      >
        <Box component="form" onSubmit={handleCreateGroupSubmit}>
          <DialogTitle className="flex justify-between items-center pb-2">
            <Box className="flex items-center gap-2">
              <Box className="p-2 rounded-xl bg-green-50 dark:bg-green-900/40 text-[#427c36] border border-green-100 dark:border-green-900">
                <GroupAddIcon fontSize="small" />
              </Box>
              <Typography variant="h6" className="font-extrabold text-gray-800 dark:text-gray-200">
                Create New Group
              </Typography>
            </Box>
            <IconButton onClick={handleCloseAddDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent className="pt-2 pb-2">
            <Typography variant="body2" className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4 text-xs sm:text-sm">
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
                slotProps={{
                  input: { className: 'rounded-xl bg-white/70 dark:bg-gray-800/70' }
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
                  slotProps={{
                    input: {
                      className: 'rounded-xl bg-white/70 dark:bg-gray-800/70',
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
                              color: '#53e626',
                              bgcolor: 'rgba(134, 239, 172, 0.1)',
                              borderRadius: '8px',
                              px: 1,
                              py: 0.25,
                              '&:hover': { bgcolor: 'rgba(134, 239, 172, 0.2)' }
                            }}
                          >
                            Generate
                          </Button>
                        </InputAdornment>
                      )
                    }
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
              className="font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 rounded-xl capitalize"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              id="create-group-submit-btn"
              type="submit"
              variant="contained"
              disabled={actionLoading || !newGroupName.trim()}
              className="rounded-xl font-bold capitalize bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white shadow-md hover:shadow-lg"
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: '1px solid #dcfce3'
            }
          }
        }}
      >
        <Box component="form" onSubmit={handleJoinGroupSubmit}>
          <DialogTitle className="flex justify-between items-center pb-2">
            <Box className="flex items-center gap-2">
              <Box className="p-2 rounded-xl bg-green-50 dark:bg-green-900/40 text-[#427c36] border border-green-100 dark:border-green-900">
                <GroupIcon fontSize="small" />
              </Box>
              <Typography variant="h6" className="font-extrabold text-gray-800 dark:text-gray-200">
                Join a Group
              </Typography>
            </Box>
            <IconButton onClick={handleCloseJoinDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent className="pt-2 pb-2">
            <Typography variant="body2" className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4 text-xs sm:text-sm">
              Enter the unique Group ID (for example: <strong className="text-green-600">nkoor-it</strong>). This will send a request to the admin. Once approved, you can read and write documents inside this group.
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
              slotProps={{ input: { className: 'rounded-xl bg-white/70 dark:bg-gray-800/70' } }}
            />
          </DialogContent>

          <DialogActions className="p-4 pt-2 gap-2">
            <Button 
              id="join-group-cancel-btn"
              onClick={handleCloseJoinDialog} 
              color="inherit" 
              className="font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 rounded-xl capitalize"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              id="join-group-submit-btn"
              type="submit"
              variant="contained"
              disabled={actionLoading || !joinInputId.trim()}
              className="rounded-xl font-bold capitalize bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white shadow-md hover:shadow-lg"
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: '1px solid #dcfce3'
            }
          }
        }}
      >
        <DialogTitle className="flex justify-between items-center pb-2">
          <Box className="flex items-center gap-2">
            <Box className="p-2 rounded-xl bg-green-50 dark:bg-green-900/40 text-[#427c36] border border-green-100 dark:border-green-900">
              <PeopleIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" className="font-extrabold text-gray-800 dark:text-gray-200 leading-tight">
                {currentGroup?.name || 'Group Members'}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono">
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
          <Box className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-white border border-green-100 dark:border-green-900 mb-4 shadow-sm dark:shadow-none">
            <Box>
              <Typography variant="body2" className="font-bold text-gray-700 dark:text-gray-300">
                Total Members: <span className="text-[#326127]">{currentGroupMembers.length}</span>
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {isCurrentUserAdmin ? 'You are the Group Admin.' : 'You are a Member of this group.'}
              </Typography>
            </Box>
            {isCurrentUserAdmin && (
              <Chip 
                icon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />} 
                label="Group Admin" 
                size="small"
                className="bg-gradient-to-r from-green-400 to-[#427c36] text-white font-bold text-xs shadow-sm dark:shadow-none" 
              />
            )}
          </Box>

          {/* Members List */}
          <Typography variant="subtitle2" className="font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase text-[11px] tracking-wider">
            Group Members
          </Typography>

          {membersLoading ? (
            <Box className="flex justify-center py-6">
              <CircularProgress size={32} sx={{ color: '#427c36' }} />
            </Box>
          ) : (
            <List className="p-0 space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
              {currentGroupMembers.map((member) => (
                <ListItem 
                  key={member._id}
                  disablePadding
                  className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-green-50 dark:border-green-800 flex items-center justify-between shadow-sm dark:shadow-none"
                >
                  <Box className="flex items-center gap-3 overflow-hidden flex-1">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: member.isAdmin ? '#427c36' : '#e0e7ff', color: member.isAdmin ? 'white' : '#4338ca', fontSize: 13, fontWeight: 'bold' }}>
                      {member.email?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box className="overflow-hidden">
                      <Typography variant="body2" className="font-bold text-gray-800 dark:text-gray-200 truncate text-xs sm:text-sm">
                        {member.email}
                      </Typography>
                      <Typography variant="caption" className="text-gray-400 dark:text-gray-500 block text-[10px]">
                        {member.isAdmin ? 'Admin (Creator)' : 'Member'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="flex items-center justify-end gap-2 shrink-0 ml-auto pl-2">
                    {member.isAdmin ? (
                      <Chip 
                        label="Admin" 
                        size="small" 
                        className="bg-green-100 dark:bg-green-900/60 text-[#326127] font-bold text-[10px] h-5" 
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
            <Box className="mt-4 pt-4 border-t border-green-100 dark:border-green-900">
              <Typography variant="subtitle2" className="font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase text-[11px] tracking-wider">
                Pending Join Requests ({currentJoinRequests.length})
              </Typography>
              <List className="p-0 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {currentJoinRequests.map((req) => (
                  <ListItem key={req._id} disablePadding className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between shadow-sm dark:shadow-none">
                    <Box className="flex items-center gap-2 overflow-hidden flex-1">
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#f97316', fontSize: 12, fontWeight: 'bold' }}>
                        {req.email?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" className="font-bold text-gray-800 dark:text-gray-200 truncate text-xs">
                        {req.email}
                      </Typography>
                    </Box>
                    <Box className="flex items-center justify-end gap-1 shrink-0 ml-auto pl-2">
                      <IconButton size="small" onClick={() => handleAcceptRequest(req._id)} sx={{ color: '#326127', bgcolor: '#f0fdf4', '&:hover': { bgcolor: '#dcfce3' } }}>
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
            <Box className="mt-4 pt-4 border-t border-green-100 dark:border-green-900">
              <Box className="p-3.5 rounded-xl bg-gradient-to-r from-green-50 to-white border border-green-100 dark:border-green-900 flex flex-col items-start gap-2 shadow-sm dark:shadow-none">
                <Typography variant="subtitle2" className="font-extrabold text-[#326127] flex items-center gap-1">
                  <LinkIcon fontSize="small" /> Share Invite Link
                </Typography>
                <Typography variant="caption" className="text-gray-600 dark:text-gray-400 dark:text-gray-500 leading-relaxed">
                  Users who click the invite link will automatically join without needing approval.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyInviteLink}
                  sx={{ mt: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 'bold', borderColor: '#ffb6d8', color: '#326127', '&:hover': { borderColor: '#427c36', bgcolor: '#f0fdf4' } }}
                >
                  Copy Link
                </Button>
              </Box>
            </Box>
          )}

          {/* DANGER ZONE (ADMIN ONLY) */}
          {isCurrentUserAdmin && (
            <Box className="mt-6 pt-4 border-t border-red-100">
              <Box className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 shadow-sm dark:shadow-none">
                <Box className="flex items-center gap-2 mb-1.5">
                  <WarningAmberIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" className="font-extrabold text-red-700">
                    Danger Zone: Delete Group
                  </Typography>
                </Box>
                <Typography variant="caption" className="text-gray-600 dark:text-gray-400 dark:text-gray-500 block mb-3 leading-relaxed">
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
          <Button onClick={handleCloseMembersDialog} className="font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 capitalize">
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              border: '2px solid #fca5a5'
            }
          }
        }}
      >
        <DialogTitle className="flex items-center gap-2 pb-2 text-red-600 font-extrabold">
          <DeleteForeverIcon />
          Delete Group Permanently?
        </DialogTitle>

        <DialogContent className="pt-2 pb-2">
          <Typography variant="body2" className="text-gray-700 dark:text-gray-300 mb-3">
            You are about to permanently delete <strong>{currentGroup?.name}</strong> (ID: <code className="text-green-600">{currentGroup?.groupId}</code>).
          </Typography>
          
          <Alert severity="error" className="mb-4 text-xs rounded-xl font-medium">
            <strong>Warning:</strong> All documentation created inside this group will be permanently deleted as well!
          </Alert>

          <Typography variant="body2" className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-2 text-xs">
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
            slotProps={{
              input: { className: 'rounded-xl bg-white/70 dark:bg-gray-800/70 font-mono' }
            }}
          />
        </DialogContent>

        <DialogActions className="p-4 pt-2 gap-2">
          <Button 
            onClick={handleCloseDeleteGroupDialog} 
            color="inherit" 
            className="font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 rounded-xl capitalize"
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

    
      {/* Profile Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { className: 'rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden m-4' } }}
      >
        {/* Cover Photo Area */}
        <Box className="h-32 relative bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/40 dark:to-green-900/40">
          <Box className="absolute inset-0 opacity-30 mix-blend-multiply dark:mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(0,0,0,0.1) 2px, transparent 0)', backgroundSize: '24px 24px' }} />
          <IconButton 
            onClick={() => setProfileDialogOpen(false)}
            sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}
            className="dark:bgcolor-gray-800/50 dark:hover:bg-gray-800"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Profile Info Area */}
        <Box className="flex flex-col items-center px-8 pb-8 -mt-16 relative z-10">
          <Avatar 
            sx={{ 
              width: 100, 
              height: 100, 
              bgcolor: 'white', 
              color: '#427c36',
              fontSize: 36,
              fontWeight: 800,
              border: '6px solid white',
              boxShadow: '0 8px 24px rgba(66,124,54,0.15)'
            }}
            className="dark:border-gray-900"
          >
            {user?.firstName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          
          <Box className="mt-4 text-center w-full">
            <Typography variant="h5" className="font-extrabold text-gray-800 dark:text-white tracking-tight">
              {user?.firstName 
                ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) 
                : (user?.email ? user.email.split('@')[0] : 'Workspace User')}
            </Typography>
            
            <Chip 
              label={user?.firstName ? "Verified Account" : "Standard Member"} 
              size="small" 
              className="mt-2 font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800" 
              sx={{ borderRadius: '8px' }}
            />
          </Box>

          <Box className="w-full mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
            <Box className="flex items-center gap-4">
              <Box className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600 shrink-0">
                <AlternateEmailIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
              </Box>
              <Box className="overflow-hidden">
                <Typography variant="caption" className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Email Address
                </Typography>
                <Typography variant="body2" className="text-gray-800 dark:text-gray-200 font-medium truncate">
                  {user?.email || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box className="w-full mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <Box className="flex items-center justify-between mb-2">
              <Typography variant="caption" className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                My Workspaces
              </Typography>
              {groups && groups.length > 0 && (
                <Typography variant="caption" className="text-gray-400 dark:text-gray-500 font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                  {groups.length}
                </Typography>
              )}
            </Box>
            
            <Box className="max-h-[140px] overflow-y-auto custom-scrollbar pr-2 mt-2 space-y-1">
              {groups && groups.length > 0 ? (
                groups.map((g) => {
                  const isActive = g.groupId === activeGroupId;
                  return (
                    <Box key={g.groupId} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isActive ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'}`}>
                      <Box className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-[#427c36] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        <GroupIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography variant="body2" className={`font-bold truncate flex-1 ${isActive ? 'text-[#326127] dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {g.name}
                      </Typography>
                      {isActive && (
                        <Chip label="Active" size="small" sx={{ height: 20, fontSize: '0.65rem' }} className="bg-[#427c36] text-white font-bold" />
                      )}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" className="text-gray-500 text-center italic py-2">
                  No workspaces found.
                </Typography>
              )}
            </Box>
          </Box>

          <Button 
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => {
              setProfileDialogOpen(false);
              handleLogout();
            }}
            className="mt-12 py-2.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            sx={{ 
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem'
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Dialog>

    {/* TELEGRAM-STYLE BOTTOM NAVBAR FOR MOBILE */}
      <Box className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around z-[100] pb-safe transition-all" sx={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Button 
          onClick={() => onToggleMobileView && onToggleMobileView('sidebar')}
          sx={{ 
            display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5,
            color: mobileView === 'sidebar' ? '#427c36' : '#9ca3af',
            '&:hover': { bgcolor: 'transparent' }
          }}
        >
          <LibraryBooksIcon sx={{ fontSize: 22, mb: 0.2 }} />
          <Typography sx={{ fontSize: '0.6rem', fontWeight: mobileView === 'sidebar' ? 700 : 500, textTransform: 'none' }}>Library</Typography>
        </Button>
        
        <Button 
          onClick={() => {
            if (hasOpenDocuments) onToggleMobileView && onToggleMobileView('editor');
          }}
          sx={{ 
            display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5,
            color: hasOpenDocuments ? (mobileView === 'editor' ? '#427c36' : '#9ca3af') : '#d1d5db',
            '&:hover': { bgcolor: 'transparent' }
          }}
        >
          <DescriptionIcon sx={{ fontSize: 22, mb: 0.2 }} />
          <Typography sx={{ fontSize: '0.6rem', fontWeight: mobileView === 'editor' ? 700 : 500, textTransform: 'none' }}>Editor</Typography>
        </Button>

                  <Button 
            onClick={handleOpenAddDialog}
            sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#9ca3af', '&:hover': { bgcolor: 'transparent', color: '#427c36' } }}
          >
            <GroupAddIcon sx={{ fontSize: 22, mb: 0.2 }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 500, textTransform: 'none' }}>Add</Typography>
          </Button>
          
          <Button 
            onClick={handleOpenJoinDialog}
            sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#9ca3af', '&:hover': { bgcolor: 'transparent', color: '#427c36' } }}
          >
            <GroupIcon sx={{ fontSize: 22, mb: 0.2 }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 500, textTransform: 'none' }}>Join</Typography>
          </Button>

          <Button 
            onClick={() => setProfileDialogOpen(true)}
            sx={{ display: 'flex', flexDirection: 'column', minWidth: '60px', px: 1, py: 0.5, color: '#9ca3af', '&:hover': { bgcolor: 'transparent', color: '#427c36' } }}
          >
            <PersonIcon sx={{ fontSize: 22, mb: 0.2 }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 500, textTransform: 'none' }}>Profile</Typography>
          </Button>
      </Box>
    </>
  );
};

export default Navbar;
