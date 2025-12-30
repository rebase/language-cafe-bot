import mongoose from 'mongoose';

const { Schema } = mongoose;

const newMember = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('new_member', newMember, 'new_members');
