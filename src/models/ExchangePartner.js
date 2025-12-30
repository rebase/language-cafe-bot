import mongoose from 'mongoose';

const { Schema } = mongoose;

const exchangePartner = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    targetLanguage: {
      type: String,
      required: true,
    },
    offeredLanguage: {
      type: String,
      required: true,
    },
    introduction: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model('exchange_partner', exchangePartner, 'exchange_partners');
