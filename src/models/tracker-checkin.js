import mongoose from 'mongoose';

const { Schema } = mongoose;

const trackerCheckin = new Schema(
  {
    trackerId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['done', 'break'],
      required: true,
    },
    trackerWeek: {
      type: Number,
      required: false, // Only used for weekly trackers
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for efficient queries
trackerCheckin.index({ trackerId: 1, userId: 1, date: 1 }, { unique: true });
trackerCheckin.index({ trackerId: 1, date: 1 });
trackerCheckin.index({ trackerId: 1, userId: 1 });

export default mongoose.model('tracker-checkin', trackerCheckin);
