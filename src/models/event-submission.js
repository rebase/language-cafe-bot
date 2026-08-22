import mongoose from 'mongoose';

const { Schema } = mongoose;

// Tracks individual messages counted as submissions, so the same message
// is never counted more than once for the same event.
const eventSubmission = new Schema(
  {
    eventId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    // Discord message ID — used for deduplication
    messageId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    pointsAwarded: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Unique per message per event (one message can only count once per event)
eventSubmission.index({ eventId: 1, messageId: 1 }, { unique: true });
eventSubmission.index({ eventId: 1, userId: 1 });
eventSubmission.index({ eventId: 1 });

export default mongoose.model('event-submission', eventSubmission);
