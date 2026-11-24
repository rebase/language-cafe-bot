import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  catalog: { type: [mongoose.Schema.Types.Mixed], default: [] },
  templates: { type: [mongoose.Schema.Types.Mixed], default: [] },
  drafts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  goals: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, guildId: 1 }, { unique: true });
export default mongoose.model('study_profile', schema);
