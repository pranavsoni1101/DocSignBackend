const mongoose = require('mongoose');

// Define PDF Schema
const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
  size: Number,
  recipientEmail: String,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = pdfSchema;