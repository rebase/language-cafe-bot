import mongoose from 'mongoose';

const { Schema } = mongoose;

const matchMatchMessage = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    submissionInTargetLanguage: {
      type: String,
      required: true,
    },
    submission: {
      type: String,
      required: true,
    },
    // Which topic this submission was made for. Without it a round can score
    // words that were submitted against a different topic.
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'match_match_topic',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('match_match_message', matchMatchMessage);
