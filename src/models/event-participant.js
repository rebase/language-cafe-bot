import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventParticipant = new Schema(
  {
    eventId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    // Total points earned from submissions (capped at maxPoints)
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Number of valid submissions counted
    submissionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One record per user per event
eventParticipant.index({ eventId: 1, userId: 1 }, { unique: true });
eventParticipant.index({ eventId: 1 });
// For leaderboard queries: sort by points descending
eventParticipant.index({ eventId: 1, points: -1 });

export default mongoose.model('event-participant', eventParticipant);
