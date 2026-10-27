const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Group name must be at least 2 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
      type: String,
      enum: ['Trip', 'Home', 'Event', 'Other'],
      default: 'Other'
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
      trim: true,
      maxlength: 5
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
groupSchema.index({ members: 1 });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
