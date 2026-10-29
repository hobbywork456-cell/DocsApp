const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  bonusStorageMB: {
    type: Number,
    required: true,
    default: 25
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'Razorpay'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayOrderId: {
    type: String,
    sparse: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true,
    index: true
  },
  razorpaySignature: {
    type: String
  },
  purchaseType: {
    type: String,
    enum: ['subscription', 'storage_booster'],
    default: 'subscription'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
  }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
