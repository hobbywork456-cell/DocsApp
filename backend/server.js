const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Load backend/.env no matter which folder the server is started from
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'].filter(Boolean)
}));
// Documents carry inline content (base64 images, workbook/deck JSON), so the 100kb default is far too small
app.use(express.json({
  limit: '25mb',
  // Razorpay webhooks are signed over the exact raw bytes
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/subscription/webhook')) req.rawBody = buf;
  }
}));

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
const aiRoutes = require('./routes/ai');
const subscriptionRoutes = require('./routes/subscription');
const superadminRoutes = require('./routes/superadmin');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/superadmin', superadminRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/docs_app';

const Group = require('./models/Group');
const Document = require('./models/Document');
const User = require('./models/User');

// A stray rejected promise in one request must never take the whole API down
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason && reason.message ? reason.message : reason);
});

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
