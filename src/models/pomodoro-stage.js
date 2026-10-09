import mongoose from 'mongoose';

// This immutable attendance snapshot is also the statistics ledger. Confirming a
// row atomically avoids a separate counter update that could be lost on restart.
const schema = new mongoose.Schema({
  _id: String,
  guildId: { type: String, required: true, index: true },
  channelId: String,
  groupName: String,
  endedAt: Number,
  attendance: [{
    _id: false,
    userId: String,
    milliseconds: Number,
    completed: Boolean,
    confirmed: { type: Boolean, default: false },
  }],
}, { versionKey: false });

export default mongoose.model('pomodoro-stage', schema);
