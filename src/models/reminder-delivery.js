import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Idempotency record for waiter reminders.
 * One record per channel per reporting period per year.
 * Prevents duplicate reminders after bot restarts or retries.
 */
const reminderDeliverySchema = new Schema(
  {
    channelId: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    reportingPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    attemptedAt: Date,
    content: String,
    destinationId: String,
    messageId: String,
    leaseUntil: Date,
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

reminderDeliverySchema.index({ channelId: 1, year: 1, reportingPeriod: 1 }, { unique: true });

export default mongoose.model('reminder-delivery', reminderDeliverySchema);
