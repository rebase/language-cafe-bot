import mongoose from 'mongoose';

const { Schema } = mongoose;

const newMember = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    tutorialStep: {
      type: Number,
      required: true,
      unique: false,
    },
    tutorialDmId: {
      type: String,
      required: false,
      unique: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('new_member', newMember, 'new_members');
