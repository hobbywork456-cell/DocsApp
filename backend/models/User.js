const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
