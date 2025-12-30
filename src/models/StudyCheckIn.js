import mongoose from 'mongoose';

const { Schema } = mongoose;

const studyCheckIn = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    point: {
      type: Number,
      required: true,
      default: 0,
    },
    lastAttendanceTimestamp: {
      type: Number,
      required: true,
    },
    expiredTimestamp: {
      type: Number,
      required: true,
    },
    highestPoint: {
      type: Number,
      required: true,
      default: 0,
    },
    freezePoint: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('study_check_in', studyCheckIn, 'study_check_ins');
