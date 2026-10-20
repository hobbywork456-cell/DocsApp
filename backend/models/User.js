const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  role: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  customStorageLimitMB: { type: Number, default: null },
  isSubscribed: { type: Boolean, default: false },
  currentPlan: { type: String, default: 'Free' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
