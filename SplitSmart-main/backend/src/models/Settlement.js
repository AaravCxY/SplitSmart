const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amountMinor: {
      type: Number,
      required: true,
      min: [1, 'Settlement amount must be greater than zero'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount in minor units must be an integer'
      }
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['completed', 'pending'],
      default: 'completed',
      index: true
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Note cannot exceed 300 characters']
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes
settlementSchema.index({ group: 1, createdAt: -1 });

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;
