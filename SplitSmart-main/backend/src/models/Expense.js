const mongoose = require('mongoose');

const participantShareSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    shareMinor: {
      type: Number,
      required: true,
      min: [1, 'Share must be at least 1 minor unit'],
      validate: {
        validator: Number.isInteger,
        message: 'Share amount in minor units must be an integer'
      }
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    amountMinor: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [1, 'Amount must be greater than zero'],
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
    category: {
      type: String,
      enum: [
        'Food',
        'Transport',
        'Accommodation',
        'Groceries',
        'Entertainment',
        'Shopping',
        'Utilities',
        'Other'
      ],
      default: 'Other',
      index: true
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participants: {
      type: [participantShareSchema],
      required: true,
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'At least one participant must be included in the split'
      }
    },
    splitMethod: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE'],
      default: 'EQUAL',
      required: true
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
expenseSchema.index({ group: 1, expenseDate: -1 });
expenseSchema.index({ 'participants.user': 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
