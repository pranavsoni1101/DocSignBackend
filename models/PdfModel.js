const mongoose = require('mongoose');

// Define PDF Schema
const pdfSchema = new mongoose.Schema({
  fileName: String,
  data: Buffer,
  size: Number,
  recipientName: String,
  recipientEmail: String,

  uploadedAt: { type: Date, default: Date.now },
  expiryDate: { type: Date }, // Expiry date to be set conditionally
  accepted: { type: Boolean, default: false }, // Field to track acceptance
  delayMentioned: { type: Boolean, default: false } // Field to track delay mention

});

module.exports = pdfSchema;