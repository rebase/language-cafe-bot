import mongoose from 'mongoose';

const { Schema } = mongoose;

const reminder = new Schema(
  {
    channelId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    messageUrl: {
      type: String,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    daysBefore: {
      type: Number,
      default: 1,
    },
    emoji: {
      type: String,
      default: '🔔',
    },
    reminderAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('reminder', reminder);
