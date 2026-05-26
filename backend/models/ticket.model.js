const mongoose = require('mongoose');

const SLA_TARGETS = {
  urgent: 60,       // 1 hour in minutes
  high: 240,        // 4 hours in minutes
  medium: 1440,     // 24 hours in minutes
  low: 4320         // 72 hours in minutes
};

const ticketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be low, medium, high, or urgent'
      }
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'resolved', 'closed'],
        message: 'Status must be open, in_progress, resolved, or closed'
      },
      default: 'open'
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field: ageMinutes
ticketSchema.virtual('ageMinutes').get(function () {
  const endTime = this.resolvedAt ? new Date(this.resolvedAt) : new Date();
  const diffMs = endTime - new Date(this.createdAt);
  return Math.max(0, Math.floor(diffMs / 1000 / 60));
});

// Virtual field: slaBreached
ticketSchema.virtual('slaBreached').get(function () {
  const age = this.ageMinutes;
  const target = SLA_TARGETS[this.priority];
  if (!target) return false;
  return age > target;
});

module.exports = mongoose.model('Ticket', ticketSchema);
