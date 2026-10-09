import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Idempotency record for staff overdue reports.
 * One record per reporting period per year.
 * Prevents duplicate reports after bot restarts or retries.
 */
const overdueReportSchema = new Schema(
  {
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

overdueReportSchema.index({ year: 1, reportingPeriod: 1 }, { unique: true });

export default mongoose.model('overdue-report', overdueReportSchema);
