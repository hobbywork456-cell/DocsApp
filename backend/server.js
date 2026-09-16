const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean)
}));
app.use(express.json());

const path = require('path');

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const groupRoutes = require('./routes/groups');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/groups', groupRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/docs_app';

const Group = require('./models/Group');
const Document = require('./models/Document');
const User = require('./models/User');

async function initDefaultGroupAndMigrate() {
  try {
    const defaultGroupId = 'nkoor-it';
    const allUsers = await User.find({});
    const allUserIds = allUsers.map(u => u._id);

    let defaultGroup = await Group.findOne({ groupId: defaultGroupId });
    if (!defaultGroup) {
      const creatorId = allUserIds[0] || new mongoose.Types.ObjectId();
      defaultGroup = new Group({
        name: 'NKORR IT',
        groupId: defaultGroupId,
        createdBy: creatorId,
        members: allUserIds
      });
      await defaultGroup.save();
      console.log(`Created default group '${defaultGroupId}' with ${allUserIds.length} members`);
    }

    // Migrate any existing documents without groupId
    const migrationResult = await Document.updateMany(
      { $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: '' }] },
      { $set: { groupId: defaultGroupId } }
    );

    if (migrationResult.modifiedCount > 0) {
      console.log(`Migrated ${migrationResult.modifiedCount} documents to group '${defaultGroupId}'`);
    }
  } catch (err) {
    console.error('Error during group migration:', err);
  }
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await initDefaultGroupAndMigrate();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
