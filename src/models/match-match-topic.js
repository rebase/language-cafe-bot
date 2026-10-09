import mongoose from 'mongoose';

const { Schema } = mongoose;

// Break timestamp ties consistently in every queue reader.
export const TOPIC_ORDER = Object.freeze({ createdAt: 1, _id: 1 });
export const MAX_TOPIC_LENGTH = 256;

const matchMatchTopic = new Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_TOPIC_LENGTH,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

matchMatchTopic.index(TOPIC_ORDER);

export default mongoose.model('match_match_topic', matchMatchTopic);
