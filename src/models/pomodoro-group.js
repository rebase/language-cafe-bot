import mongoose from 'mongoose';

const { Schema } = mongoose;

const pomodoroGroup = new Schema(
  {
    guildId: String,
    displayName: String,
    permanent: { type: Boolean, default: false },
    ownerId: String,
    controllerId: String,
    statusMessageId: String,
    studyRound: { type: Number, default: 1 },
    completedRounds: { type: Number, default: 0 },
    checkIn: {
      type: new Schema({
        id: String,
        study: Boolean,
        initial: Boolean,
        deadline: Number,
        messageId: String,
        delivered: { type: Boolean, default: false },
        dirty: { type: Boolean, default: true },
        participants: [{ _id: false, userId: String, joinedAt: Number }],
        responded: [String],
      }, { _id: false }),
      default: undefined,
    },
    stageId: String,
    stageIndex: { type: Number, default: 0 },
    stageStartedAt: Number,
    creditStartedAt: Number,
    stageEndsAt: Number,
    awaitingResponse: { type: Boolean, default: false },
    respondedMembers: { type: [String], default: [] },
    joinedAt: { type: Map, of: Number, default: {} },
    announcementPending: { type: Boolean, default: false },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    startTimeStamp: {
      type: Number,
      required: true,
    },
    timeOption: [
      {
        type: String,
        required: true,
      },
    ],
    members: [
      {
        type: String,
        required: true,
      },
    ],
    channelId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('pomodoro-group', pomodoroGroup);
