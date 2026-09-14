const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Document = require('../models/Document');
const auth = require('../middleware/auth');

// Get all groups the logged-in user belongs to
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.userId })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    let { name, groupId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!groupId || !groupId.trim()) {
      // Auto-generate if not provided
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
      groupId = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    } else {
      groupId = groupId.trim().toLowerCase().replace(/\s+/g, '-');
    }

    // Check if groupId already exists
    const existingGroup = await Group.findOne({ groupId });
    if (existingGroup) {
      return res.status(400).json({ message: `Group ID '${groupId}' is already taken. Please choose another.` });
    }

    const group = new Group({
      name: name.trim(),
      groupId,
      createdBy: req.user.userId,
      members: [req.user.userId]
    });

    const savedGroup = await group.save();
    await savedGroup.populate('createdBy', 'email');
    res.status(201).json(savedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join an existing group by groupId
router.post('/join', auth, async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId || !groupId.trim()) {
      return res.status(400).json({ message: 'Group ID is required to join' });
    }

    const normalizedGroupId = groupId.trim().toLowerCase();
    const group = await Group.findOne({ groupId: normalizedGroupId });

    if (!group) {
      return res.status(404).json({ message: `No group found with ID '${normalizedGroupId}'. Please check the ID and try again.` });
    }

    const isMember = group.members.some(m => m.toString() === req.user.userId.toString());
    if (!isMember) {
      group.members.push(req.user.userId);
      await group.save();
    }

    await group.populate('createdBy', 'email');
    res.json({ message: 'Successfully joined group', group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get members of a specific group
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const normalizedGroupId = req.params.groupId.trim().toLowerCase();
    const group = await Group.findOne({ groupId: normalizedGroupId })
      .populate('members', 'email')
      .populate('createdBy', 'email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(m => m._id.toString() === req.user.userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const isCurrentUserAdmin = group.createdBy && group.createdBy._id.toString() === req.user.userId.toString();

    const membersWithRole = group.members.map(member => ({
      _id: member._id,
      email: member.email,
      isAdmin: group.createdBy && member._id.toString() === group.createdBy._id.toString()
    }));

    res.json({
      groupName: group.name,
      groupId: group.groupId,
      isCurrentUserAdmin,
      createdBy: group.createdBy,
      members: membersWithRole
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove a member from the group (Admin only)
router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const normalizedGroupId = req.params.groupId.trim().toLowerCase();
    const targetUserId = req.params.userId;

    const group = await Group.findOne({ groupId: normalizedGroupId });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if the caller is the group admin
    const isCallerAdmin = group.createdBy && group.createdBy.toString() === req.user.userId.toString();
    if (!isCallerAdmin) {
      return res.status(403).json({ message: 'Only the group admin can remove members.' });
    }

    // Cannot remove the admin
    if (group.createdBy.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'The group admin cannot be removed from the group.' });
    }

    // Remove member from array
    group.members = group.members.filter(m => m.toString() !== targetUserId.toString());
    await group.save();

    await group.populate('members', 'email');
    const membersWithRole = group.members.map(member => ({
      _id: member._id,
      email: member.email,
      isAdmin: group.createdBy && member._id.toString() === group.createdBy.toString()
    }));

    res.json({
      message: 'Member removed successfully',
      members: membersWithRole
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete an entire group and all its documents (Admin only)
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const normalizedGroupId = req.params.groupId.trim().toLowerCase();
    const group = await Group.findOne({ groupId: normalizedGroupId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if the caller is the group admin
    const isCallerAdmin = group.createdBy && group.createdBy.toString() === req.user.userId.toString();
    if (!isCallerAdmin) {
      return res.status(403).json({ message: 'Only the group admin can delete this group.' });
    }

    // 1. Delete all documents belonging to this group
    const deleteDocsResult = await Document.deleteMany({ groupId: normalizedGroupId });

    // 2. Delete the group
    await Group.findOneAndDelete({ groupId: normalizedGroupId });

    res.json({
      message: `Group '${group.name}' and all ${deleteDocsResult.deletedCount} documents deleted successfully.`,
      groupId: normalizedGroupId,
      deletedDocsCount: deleteDocsResult.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single group details
router.get('/:groupId', auth, async (req, res) => {
  try {
    const normalizedGroupId = req.params.groupId.trim().toLowerCase();
    const group = await Group.findOne({ groupId: normalizedGroupId }).populate('createdBy', 'email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.toString() === req.user.userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
