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
  delayMentioned: { type: Boolean, default: false }, // Field to track delay mention
  signatureReady: {type: Boolean, default: false},

  inputFields: [{
    pageIndex: Number, // Index of the page where the input field is located
    x: Number, // X-coordinate of the input field
    y: Number, // Y-coordinate of the input field
  }]

});

module.exports = pdfSchema;