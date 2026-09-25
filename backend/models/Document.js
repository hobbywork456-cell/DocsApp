const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Untitled Document' },
  content: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: String, required: true, index: true },
  tags: [{ type: String, trim: true }],
  history: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    changesSummary: { type: String }
  }],
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
