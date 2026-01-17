import mongoose from 'mongoose';

const { Schema } = mongoose;

const trackerParticipant = new Schema(
  {
    trackerId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    joinedAt: {
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
trackerParticipant.index({ trackerId: 1, userId: 1 }, { unique: true });
trackerParticipant.index({ trackerId: 1 });
trackerParticipant.index({ trackerId: 1, emoji: 1 }, { unique: true });

export default mongoose.model('tracker-participant', trackerParticipant);
