const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const multer = require('multer');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');

const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadDisk = multer({ storage: diskStorage });

// Import content from a document file
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { mimetype, buffer, originalname } = req.file;
    let htmlContent = '';

    if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      htmlContent = data.text.split('\n').map(line => `<p>${line}</p>`).join('');
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalname.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.convertToHtml({ buffer });
      htmlContent = result.value;
    } else if (
      mimetype === 'application/vnd.ms-excel' || 
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      originalname.toLowerCase().endsWith('.xlsx') || originalname.toLowerCase().endsWith('.xls')
    ) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      htmlContent = xlsx.utils.sheet_to_html(sheet);
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }

    res.json({ html: htmlContent });
  } catch (error) {
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Upload an image specifically for embedding in documents
router.post('/upload-image', auth, uploadDisk.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

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

    const oldTitle = existingDoc.title || '';
    const newTitle = req.body.title || '';
    const oldContent = existingDoc.content || '';
    const newContent = req.body.content || '';

    let changes = [];
    if (oldTitle !== newTitle) {
      changes.push(`Title changed from "${oldTitle}" to "${newTitle}"`);
    }
    if (oldContent !== newContent) {
      const lengthDiff = newContent.length - oldContent.length;
      if (lengthDiff > 0) {
        changes.push(`Content modified (+${lengthDiff} chars)`);
      } else if (lengthDiff < 0) {
        changes.push(`Content modified (-${Math.abs(lengthDiff)} chars)`);
      } else {
        changes.push(`Content modified`);
      }
    }

    const changesSummary = changes.length > 0 ? changes.join(', ') : 'No visible changes';

    const updatedDocument = await Document.findOneAndUpdate(
      { _id: req.params.id },
      { 
        $set: { title: newTitle, content: newContent },
        $push: { history: { editedBy: req.user.userId, editedAt: new Date(), changesSummary } }
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

// Upload an attachment to a document
router.post('/:id/attachments', auth, uploadDisk.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, document.groupId);
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const attachment = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype,
      size: req.file.size
    };

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      { $push: { attachments: attachment } },
      { returnDocument: 'after' }
    ).populate('history.editedBy', 'email').populate('owner', 'email');

    res.json(updatedDocument);
  } catch (error) {
    console.error("Upload Attachment Backend Error:", error);
    res.status(500).json({ message: `Error uploading attachment: ${error.message}` });
  }
});

// Delete an attachment
router.delete('/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, document.groupId);
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      { $pull: { attachments: { _id: attachmentId } } },
      { returnDocument: 'after' }
    ).populate('history.editedBy', 'email').populate('owner', 'email');

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting attachment', error: error.message });
  }
});

module.exports = router;
