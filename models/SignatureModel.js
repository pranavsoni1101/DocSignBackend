const mongoose = require("mongoose");

// Define Signature Schema
const signatureSchema = new mongoose.Schema({
    name :String,
    data: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = signatureSchema;