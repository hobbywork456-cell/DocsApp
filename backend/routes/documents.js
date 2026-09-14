const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

// Helper to check if user is a member of groupId
async function verifyGroupMembership(userId, groupId) {
  if (!groupId) return false;
  const group = await Group.findOne({ groupId: groupId.trim().toLowerCase() });
  if (!group) return false;
  return group.members.some(m => m.toString() === userId.toString());
}

// Get all documents for a group
router.get('/', auth, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: 'groupId query parameter is required' });
    }

    const normalizedGroupId = groupId.trim().toLowerCase();
    const isMember = await verifyGroupMembership(req.user.userId, normalizedGroupId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const documents = await Document.find({ groupId: normalizedGroupId })
      .sort({ updatedAt: -1 })
      .populate('history.editedBy', 'email')
      .populate('owner', 'email');

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id })
      .populate('history.editedBy', 'email')
      .populate('owner', 'email');
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, document.groupId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this document group.' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new document in a group
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: 'groupId is required to create a document' });
    }

    const normalizedGroupId = groupId.trim().toLowerCase();
    const isMember = await verifyGroupMembership(req.user.userId, normalizedGroupId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const document = new Document({
      title: title || 'Untitled Document',
      content: content || '',
      groupId: normalizedGroupId,
      owner: req.user.userId
    });

    const savedDocument = await document.save();
    await savedDocument.populate('owner', 'email');
    res.status(201).json(savedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a document
router.put('/:id', auth, async (req, res) => {
  try {
    const existingDoc = await Document.findById(req.params.id);
    if (!existingDoc) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, existingDoc.groupId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const updatedDocument = await Document.findOneAndUpdate(
      { _id: req.params.id },
      { 
        $set: { title: req.body.title, content: req.body.content },
        $push: { history: { editedBy: req.user.userId, editedAt: new Date() } }
      },
      { new: true }
    ).populate('history.editedBy', 'email').populate('owner', 'email');

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a document
router.delete('/:id', auth, async (req, res) => {
  try {
    const existingDoc = await Document.findById(req.params.id);
    if (!existingDoc) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, existingDoc.groupId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    await Document.findOneAndDelete({ _id: req.params.id });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
