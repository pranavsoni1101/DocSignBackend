const mongoose = require('mongoose');

// Define PDF Schema
const pdfSchema = new mongoose.Schema({
  fileName: String,
  data: Buffer,
  size: Number,
  recipientName: String,
  recipientEmail: String,

  uploadedAt: { type: Date, default: Date.now }
});

module.exports = pdfSchema;