import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventHistorySchema = new Schema(
  {
    // Original EMS Event._id — preserved even after the Event is hard-deleted
    emsEventId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    // The monitored language channel — may differ from the event's submissionChannelId
    languageChannelId: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    eventPostLink: {
      type: String,
      default: null,
    },
    // false = cancelled/invalid; invalid records never count towards requirements
    isValid: {
      type: Boolean,
      default: true,
    },
    // Derived from startDate for efficient period queries — stored so we never recompute
    year: {
      type: Number,
      required: true,
    },
    // 1–6, derived from startDate month
    reportingPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

eventHistorySchema.index({ emsEventId: 1 });
eventHistorySchema.index({ languageChannelId: 1, year: 1, reportingPeriod: 1, isValid: 1 });
eventHistorySchema.index({ year: 1, reportingPeriod: 1 });

export default mongoose.model('event-history', eventHistorySchema);
