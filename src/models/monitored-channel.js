import mongoose from 'mongoose';

const { Schema } = mongoose;

const monitoredChannelSchema = new Schema(
  {
    // Discord language channel ID
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    // Human-readable name, e.g. "Korean"
    displayName: {
      type: String,
      required: true,
    },
    // Country flag or custom emoji string, e.g. "🇰🇷"
    emoji: {
      type: String,
      required: true,
    },
    // false = deregistered; exempt from future requirements
    isActive: {
      type: Boolean,
      default: true,
    },
    // When this channel was first registered — used to determine period exemptions
    registeredAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('monitored-channel', monitoredChannelSchema);
