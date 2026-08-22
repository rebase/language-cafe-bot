import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ['Reading', 'Listening', 'Speaking', 'Writing', 'Live Event', 'Mixed', 'Other'],
      required: true,
    },
    hashtag: {
      type: String,
      required: true,
    },
    // Single channel where submissions are tracked
    submissionChannelId: {
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
    // Optional — if null, submissions are tracked but no points are awarded
    pointsPerSubmission: {
      type: Number,
      default: null,
      min: 1,
    },
    // Optional — required only when pointsPerSubmission is set
    maxPoints: {
      type: Number,
      default: null,
      min: 1,
    },
    // 0 means no bonus
    creatorBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional link to the original event post
    eventPostLink: {
      type: String,
      default: null,
    },
    // Discord user ID of the event creator
    creatorId: {
      type: String,
      required: true,
    },
    // Status: pending → active → ended
    status: {
      type: String,
      enum: ['pending', 'active', 'ended'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

eventSchema.index({ status: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ status: 1, endDate: 1 });
eventSchema.index({ status: 1, submissionChannelId: 1 });
// For name autocomplete
eventSchema.index({ name: 'text' });

export default mongoose.model('event', eventSchema);
