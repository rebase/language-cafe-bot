import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  day: { type: String, required: true },
  activities: { type: [mongoose.Schema.Types.Mixed], default: [] },
  channelId: String,
  messageId: String,
  deliveryUntil: Number,
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, guildId: 1, day: 1 }, { unique: true });
export default mongoose.model('study_plan', schema);
