import mongoose from 'mongoose';

const { Schema } = mongoose;

// Tracks the pinned leaderboard message for an event.
// One record per event — created when /event leaderboard is run.
const eventLeaderboard = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    // The channel where the leaderboard message was posted
    channelId: {
      type: String,
      required: true,
    },
    // The pinned message ID — used to edit the embed on every submission
    messageId: {
      type: String,
      required: true,
    },
    // Once 3 participants hit max points, no further edits are made
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('event-leaderboard', eventLeaderboard);
