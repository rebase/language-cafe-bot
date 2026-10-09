import mongoose from 'mongoose';

const { Schema } = mongoose;

const waiterAssignmentSchema = new Schema(
  {
    // References MonitoredChannel.channelId
    channelId: {
      type: String,
      required: true,
    },
    // Discord user ID of the waiter
    userId: {
      type: String,
      required: true,
    },
    // false after /channel waiter-remove — kept for historical compliance queries
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedAt: {
      type: Date,
      required: true,
    },
    // Set when the waiter is removed
    removedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Efficient lookup of active waiters for a channel
waiterAssignmentSchema.index({ channelId: 1, isActive: 1 });
// Historical compliance: who was assigned to a channel at a point in time
waiterAssignmentSchema.index({ channelId: 1, assignedAt: 1, removedAt: 1 });
waiterAssignmentSchema.index({ channelId: 1, userId: 1 });

export default mongoose.model('waiter-assignment', waiterAssignmentSchema);
