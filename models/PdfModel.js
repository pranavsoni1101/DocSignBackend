const mongoose = require('mongoose');


const inputFieldsSchema = new mongoose.Schema({
  id: String,
  type: String,
  value: String,
  ref: Object,
  user: String,
  page: Number, // Index of the page where the input field is located
  x: Number, // X-coordinate of the input field
  y: Number, // Y-coordinate of the input field
});

// To accept more than 1 recipients
const recipientSchema = new mongoose.Schema({
  name: String,
  email: String,
});

// Define PDF Schema
const pdfSchema = new mongoose.Schema({
  fileName: String,
  data: Buffer,
  size: Number,
  recipients: [recipientSchema],
  // recipientName: String,
  // recipientEmail: String,
  
  uploadedAt: { type: Date, default: Date.now },
  signedAt: {type: Date, default: Date.now}, 
  signed: {type: Boolean, default: false},
  expiryDate: { type: Date }, // Expiry date to be set conditionally
  accepted: { type: Boolean, default: false }, // Field to track acceptance
  delayed: { type: Boolean, default: false }, // New field for tracking delay
  rejected: { type: Boolean, default: false }, // New field for tracking rejection
  delayMentioned: { type: Boolean, default: false }, // Field to track delay mention
  signatureReady: {type: Boolean, default: false},

  inputFields: [inputFieldsSchema],
  encryptionKey: String, // Store the encryption key
  iv: String //

});


module.exports = pdfSchema;