import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventBan = new Schema(
  {
    eventId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    // Moderator who issued the ban
    bannedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One ban record per user per event
eventBan.index({ eventId: 1, userId: 1 }, { unique: true });
eventBan.index({ eventId: 1 });

export default mongoose.model('event-ban', eventBan);
