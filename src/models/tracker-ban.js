import mongoose from 'mongoose';

const { Schema } = mongoose;

const trackerBan = new Schema(
  {
    trackerId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      default: 'max_misses_exceeded',
    },
    bannedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for efficient queries
trackerBan.index({ trackerId: 1, userId: 1 }, { unique: true });
trackerBan.index({ trackerId: 1 });

export default mongoose.model('tracker-ban', trackerBan);
