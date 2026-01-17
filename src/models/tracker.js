import mongoose from 'mongoose';

const { Schema } = mongoose;

const tracker = new Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      required: true,
    },
    gracePeriodDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 30,
    },
    maxBreaksPerWeek: {
      type: Number,
      required: false,
      min: 0,
    },
    maxMisses: {
      type: Number,
      required: false,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    liveTrackerMessageId: {
      type: String,
      required: false,
    },
    infoMessageId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Index for efficient queries
tracker.index({ isActive: 1 });

export default mongoose.model('tracker', tracker);
