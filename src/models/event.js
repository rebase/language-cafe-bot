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
      enum: ['Reading', 'Listening', 'Speaking', 'Writing', 'Mixed', 'Other'],
      required: true,
    },
    hashtag: {
      type: String,
      required: true,
    },
    submissionChannelId: {
      type: String,
      required: true,
    },
    languageChannelId: { type: String, default: null },
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
    // Optional — defaults to 200 when points_per_submission is set
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
    eventPostLink: {
      type: String,
      default: null,
    },
    creatorId: {
      type: String,
      required: true,
    },
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
eventSchema.index({ name: 'text' });

export default mongoose.model('event', eventSchema);
