const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const { getGroupStorageStats, getDocumentSizeBytes, invalidateStorageCache } = require('../utils/storage');
const multer = require('multer');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');

const path = require('path');
const AdmZip = require('adm-zip');

// Helper: Parse PPTX presentation buffer into slides deck JSON
function parsePptxBuffer(buffer, originalname) {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    // Slide XML files in PowerPoint archives follow ppt/slides/slideN.xml
    const slideEntries = zipEntries.filter(entry => 
      !entry.isDirectory && /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName)
    );

    slideEntries.sort((a, b) => {
      const matchA = a.entryName.match(/slide(\d+)\.xml/i);
      const matchB = b.entryName.match(/slide(\d+)\.xml/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });

    const slides = [];

    for (let i = 0; i < slideEntries.length; i++) {
      const xml = slideEntries[i].getData().toString('utf8');
      
      // Match paragraph blocks and extract text inside <a:t> tags
      const paragraphMatches = xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/gi) || [];
      const paragraphs = [];
      
      for (const pXml of paragraphMatches) {
        const textPieces = [];
        const tMatches = pXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/gi);
        for (const tm of tMatches) {
          if (tm[1]) {
            textPieces.push(
              tm[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
            );
          }
        }
        const fullPText = textPieces.join('').trim();
        if (fullPText) {
          paragraphs.push(fullPText);
        }
      }

      const slideTitle = paragraphs[0] || `Slide ${i + 1}`;
      const subtitle = paragraphs[1] || '';
      const bullets = paragraphs.slice(1).filter(Boolean);

      slides.push({
        id: `slide_${i + 1}`,
        layout: i === 0 ? 'title' : (bullets.length > 0 ? 'bullets' : 'standard'),
        title: slideTitle,
        subtitle: i === 0 ? subtitle : '',
        bullets: i > 0 && bullets.length > 0 ? bullets : undefined,
        col1Title: 'Key Point',
        col1Text: paragraphs.slice(1).join(' ') || 'Slide details and highlights'
      });
    }

    if (slides.length === 0) {
      slides.push({
        id: 'slide_1',
        layout: 'title',
        title: path.basename(originalname, path.extname(originalname)) || 'Presentation',
        subtitle: 'Imported PowerPoint Presentation'
      });
    }

    return {
      themeId: 'emeraldGradient',
      slides
    };
  } catch (err) {
    console.error('PPTX parse error:', err);
    return {
      themeId: 'emeraldGradient',
      slides: [
        {
          id: 'slide_1',
          layout: 'title',
          title: path.basename(originalname, path.extname(originalname)) || 'Presentation',
          subtitle: 'Imported Presentation'
        }
      ]
    };
  }
}

// Helper: Parse Spreadsheet buffer into Workbook sheets JSON
function parseSpreadsheetBuffer(buffer, originalname) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames && workbook.SheetNames.length > 0 ? workbook.SheetNames : ['Sheet1'];

    const sheets = sheetNames.map((name, idx) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) {
        return {
          id: `sheet${idx + 1}`,
          name: name || `Sheet${idx + 1}`,
          rowCount: 30,
          colCount: 12,
          cells: {}
        };
      }

      const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
      const cells = {};

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const coord = xlsx.utils.encode_cell({ r: R, c: C });
          const cell = sheet[coord];
          if (cell && cell.v !== undefined) {
            cells[coord] = {
              value: String(cell.w !== undefined ? cell.w : cell.v)
            };
            if (cell.f) {
              cells[coord].formula = `=${cell.f}`;
            }
          }
        }
      }

      return {
        id: `sheet${idx + 1}`,
        name: name || `Sheet${idx + 1}`,
        rowCount: Math.max(30, range.e.r + 5),
        colCount: Math.max(12, range.e.c + 3),
        cells
      };
    });

    return {
      activeSheetId: sheets[0]?.id || 'sheet1',
      sheets
    };
  } catch (err) {
    console.error('Spreadsheet parse error:', err);
    return {
      activeSheetId: 'sheet1',
      sheets: [
        {
          id: 'sheet1',
          name: 'Sheet1',
          rowCount: 30,
          colCount: 12,
          cells: {}
        }
      ]
    };
  }
}

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
    const lowerName = (originalname || '').toLowerCase();
    const docTitle = path.basename(originalname, path.extname(originalname)) || 'Imported Document';

    // 1. PRESENTATION (PowerPoint / Slides): .pptx, .ppt
    if (
      lowerName.endsWith('.pptx') || 
      lowerName.endsWith('.ppt') ||
      mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimetype === 'application/vnd.ms-powerpoint'
    ) {
      const deck = parsePptxBuffer(buffer, originalname);
      return res.json({
        docType: 'ppt',
        content: JSON.stringify(deck),
        title: docTitle,
        html: ''
      });
    }

    // 2. SPREADSHEET (Excel / CSV): .xlsx, .xls, .csv
    if (
      lowerName.endsWith('.xlsx') || 
      lowerName.endsWith('.xls') || 
      lowerName.endsWith('.csv') ||
      mimetype === 'application/vnd.ms-excel' || 
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'text/csv'
    ) {
      const workbookData = parseSpreadsheetBuffer(buffer, originalname);
      return res.json({
        docType: 'sheet',
        content: JSON.stringify(workbookData),
        title: docTitle,
        html: ''
      });
    }

    // 3. PDF: .pdf
    if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
      let text = '';
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(buffer);
        text = data.text || '';
      } else if (pdfParse && pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const data = await parser.getText();
        text = data.text || '';
      }
      const htmlContent = text
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '')
        .filter(Boolean)
        .join('');
      return res.json({
        docType: 'doc',
        content: htmlContent || '<p>Imported PDF Document</p>',
        html: htmlContent,
        title: docTitle
      });
    }

    // 4. WORD / DOC: .docx, .doc
    if (
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimetype === 'application/msword'
    ) {
      const options = {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "r[style-name='Strong'] => strong",
          "b => strong",
          "i => em",
          "u => u",
          "strike => s",
          "table => table",
          "tr => tr",
          "td => td"
        ]
      };
      const result = await mammoth.convertToHtml({ buffer }, options);
      return res.json({
        docType: 'doc',
        content: result.value || '<p>Imported Word Document</p>',
        html: result.value,
        title: docTitle
      });
    }

    // 5. TEXT / JSON / MARKDOWN: .txt, .md, .json
    if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || mimetype.startsWith('text/')) {
      const text = buffer.toString('utf8');
      const htmlContent = text
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '')
        .filter(Boolean)
        .join('');
      return res.json({
        docType: 'doc',
        content: htmlContent,
        html: htmlContent,
        title: docTitle
      });
    }

    if (lowerName.endsWith('.json')) {
      try {
        const text = buffer.toString('utf8');
        const parsed = JSON.parse(text);
        if (parsed.slides && Array.isArray(parsed.slides)) {
          return res.json({ docType: 'ppt', content: text, title: docTitle });
        }
        if (parsed.sheets && Array.isArray(parsed.sheets)) {
          return res.json({ docType: 'sheet', content: text, title: docTitle });
        }
      } catch (err) {
        // Fallback to text
      }
    }

    return res.status(400).json({ message: 'Unsupported file format. Please upload PPTX, XLSX, DOCX, PDF, or CSV.' });
  } catch (error) {
    console.error("Document Import Error:", error);
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
  const group = await Group.findOne({ groupId: groupId.trim().toLowerCase() }).select('members').lean();
  if (!group || !Array.isArray(group.members)) return false;
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
      .populate('owner', 'email')
      .lean();

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

    // Check storage quota for the workspace owner of this group
    const storageStats = await getGroupStorageStats(normalizedGroupId);
    if (storageStats && storageStats.isExceeded) {
      return res.status(403).json({
        message: 'Storage quota exceeded (100% full). Workspace is locked in Read-Only mode. Please upgrade subscription to add new documents.',
        isStorageFull: true,
        storageStats
      });
    }

    const docType = req.body.docType || 'doc';
    const defaultTitle = docType === 'sheet' ? 'Untitled Spreadsheet' : docType === 'ppt' ? 'Untitled Presentation' : 'Untitled Document';

    const document = new Document({
      title: title || defaultTitle,
      content: content || '',
      docType,
      groupId: normalizedGroupId,
      owner: req.user.userId,
      tags: req.body.tags || []
    });

    document.sizeBytes = getDocumentSizeBytes(document);
    const savedDocument = await document.save();
    invalidateStorageCache(req.user.userId, normalizedGroupId);

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

    // Check storage quota for the workspace owner of this group
    const storageStats = await getGroupStorageStats(existingDoc.groupId);
    if (storageStats && storageStats.isExceeded) {
      return res.status(403).json({
        message: 'Storage quota exceeded (100% full). This document is locked in Read-Only mode. Please upgrade your subscription to edit documents.',
        isStorageFull: true,
        storageStats
      });
    }

    const oldTitle = existingDoc.title || '';
    const newTitle = req.body.title !== undefined ? req.body.title : oldTitle;
    const oldContent = existingDoc.content || '';
    const newContent = req.body.content !== undefined ? req.body.content : oldContent;
    const newTags = req.body.tags !== undefined ? req.body.tags : existingDoc.tags;
    const newDocType = req.body.docType !== undefined ? req.body.docType : (existingDoc.docType || 'doc');

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
    if (existingDoc.docType !== newDocType) {
      changes.push(`Format changed from ${existingDoc.docType || 'doc'} to ${newDocType}`);
    }

    const changesSummary = changes.length > 0 ? changes.join(', ') : 'No visible changes';

    const calculatedSizeBytes = getDocumentSizeBytes({
      title: newTitle,
      content: newContent,
      tags: newTags,
      attachments: existingDoc.attachments
    });

    const updatedDocument = await Document.findOneAndUpdate(
      { _id: req.params.id },
      { 
        $set: { 
          title: newTitle, 
          content: newContent, 
          tags: newTags, 
          docType: newDocType,
          sizeBytes: calculatedSizeBytes 
        },
        $push: { history: { editedBy: req.user.userId, editedAt: new Date(), changesSummary } }
      },
      { returnDocument: 'after' }
    ).populate('history.editedBy', 'email').populate('owner', 'email');

    invalidateStorageCache(existingDoc.owner, existingDoc.groupId);

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

    // Check storage quota for the workspace owner
    const storageStats = await getGroupStorageStats(existingDoc.groupId);
    if (storageStats && storageStats.isExceeded) {
      return res.status(403).json({
        message: 'Storage quota exceeded (100% capacity reached). Workspace is locked in Read-Only mode. Document removal is disabled.',
        isStorageFull: true,
        storageStats
      });
    }

    await Document.findOneAndDelete({ _id: req.params.id });
    invalidateStorageCache(existingDoc.owner, existingDoc.groupId);
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

    // Check storage quota
    const storageStats = await getGroupStorageStats(document.groupId);
    if (storageStats) {
      const remainingBytes = (storageStats.totalQuotaMB * 1024 * 1024) - storageStats.totalUsedBytes;
      if (storageStats.isExceeded || req.file.size > remainingBytes) {
        return res.status(403).json({
          message: `Storage quota exceeded! File size (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) exceeds available space (${Math.max(0, storageStats.remainingMB)} MB). Please upgrade your subscription.`,
          isStorageFull: true,
          storageStats
        });
      }
    }

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

      const newAttachments = [...(document.attachments || []), attachment];
      const newSizeBytes = getDocumentSizeBytes({
        title: document.title,
        content: document.content,
        tags: document.tags,
        attachments: newAttachments
      });

      const updatedDocument = await Document.findByIdAndUpdate(
        id,
        { 
          $push: { attachments: attachment },
          $set: { sizeBytes: newSizeBytes }
        },
        { returnDocument: 'after' }
      ).populate('history.editedBy', 'email').populate('owner', 'email');

      invalidateStorageCache(document.owner, document.groupId);

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

    // Check storage quota
    const storageStats = await getGroupStorageStats(document.groupId);
    if (storageStats && storageStats.isExceeded) {
      return res.status(403).json({
        message: 'Storage quota exceeded. Workspace is locked in Read-Only mode.',
        isStorageFull: true,
        storageStats
      });
    }

    // Find the attachment to delete from DB
    const attachment = document.attachments.find(a => a._id.toString() === attachmentId);
    const remainingAttachments = (document.attachments || []).filter(a => a._id.toString() !== attachmentId);
    const newSizeBytes = getDocumentSizeBytes({
      title: document.title,
      content: document.content,
      tags: document.tags,
      attachments: remainingAttachments
    });

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      { 
        $pull: { attachments: { _id: attachmentId } },
        $set: { sizeBytes: newSizeBytes }
      },
      { returnDocument: 'after' }
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

    invalidateStorageCache(document.owner, document.groupId);

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
