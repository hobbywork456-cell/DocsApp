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

const mongoose = require('mongoose');
let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});



const upload = multer({ storage: multer.memoryStorage() });

// Instead of local disk, use memory storage to pipe to GridFS
const uploadDisk = multer({ storage: multer.memoryStorage() });

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

// Upload an image specifically for embedding in documents (GridFS)
router.post('/upload-image', auth, uploadDisk.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'img-' + uniqueSuffix + path.extname(req.file.originalname);

    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
      res.json({ url: `/api/documents/files/${uploadStream.id}` });
    });
    
    uploadStream.on('error', (error) => {
      res.status(500).json({ message: 'Error uploading image to DB', error: error.message });
    });
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

// Upload an attachment to a document (GridFS)
router.post('/:id/attachments', auth, uploadDisk.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const isMember = await verifyGroupMembership(req.user.userId, document.groupId);
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'file-' + uniqueSuffix + path.extname(req.file.originalname);

    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
      const attachment = {
        name: req.file.originalname,
        url: `/api/documents/files/${uploadStream.id}`,
        type: req.file.mimetype,
        size: req.file.size
      };

      const updatedDocument = await Document.findByIdAndUpdate(
        id,
        { $push: { attachments: attachment } },
        { new: true }
      ).populate('history.editedBy', 'email').populate('owner', 'email');

      res.json(updatedDocument);
    });

    uploadStream.on('error', (error) => {
      res.status(500).json({ message: 'Error uploading attachment to DB', error: error.message });
    });

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

    // Find the attachment to delete from DB
    const attachment = document.attachments.find(a => a._id.toString() === attachmentId);

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true }
    ).populate('history.editedBy', 'email').populate('owner', 'email');

    // Remove from GridFS if it's stored there
    if (attachment && attachment.url.includes('/api/documents/files/')) {
      try {
        const fileId = attachment.url.split('/').pop();
        if (gfsBucket && fileId) {
          await gfsBucket.delete(new mongoose.Types.ObjectId(fileId));
        }
      } catch (err) {
        console.error("Error deleting file from GridFS:", err);
      }
    }

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting attachment', error: error.message });
  }
});

module.exports = router;

// Get file from GridFS
router.get('/files/:id', async (req, res) => {
  try {
    if (!gfsBucket) {
      return res.status(500).json({ message: 'Database not fully initialized' });
    }
    
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const cursor = gfsBucket.find({ _id: fileId });
    const files = await cursor.toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const file = files[0];
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving file', error: error.message });
  }
});
