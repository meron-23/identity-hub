const mongoose = require('mongoose');

/**
 * Consent Model
 * Records which third-party services a user has approved
 * for KYC data sharing.
 */
const ConsentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate consent entries for the same user + service
ConsentSchema.index({ userId: 1, serviceName: 1 }, { unique: true });

module.exports = mongoose.model('Consent', ConsentSchema);
