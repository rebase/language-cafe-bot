import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Tracks the Discord message that holds the annual visual event tracker.
 * One record per calendar year.
 */
const trackerMessageSchema = new Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
    },
    // Discord channel ID where the tracker message lives (WAITER_CHANNEL_ID)
    channelId: {
      type: String,
      required: true,
    },
    // Discord message ID — updated if the message is deleted and recreated
    messageId: {
      type: String,
      required: true,
    },
    // true once the next year's tracker has been created on Jan 1
    // Archived trackers are never edited again
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('tracker-message', trackerMessageSchema);
