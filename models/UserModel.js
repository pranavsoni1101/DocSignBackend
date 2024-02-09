const mongoose = require("mongoose");
const pdfSchema = require("./PdfModel");

// Define PDF Schema
// const pdfSchema = new mongoose.Schema({
//   name: String,
//   data: Buffer,
//   size: Number,
//   recipientEmail: String,
//   uploadedAt: { type: Date, default: Date.now }
// });

// Define User Schema
const userSchema = new mongoose.Schema({
    name: {type:String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pdfs: [pdfSchema]
});

// Create a virtual field for the user's creation date
userSchema.virtual('createdAt').get(function() {
    return this._createdAt;
}).set(function(value) {
    this._createdAt = value;
});

// Pre-save hook to set the creation date before saving the user
userSchema.pre('save', function(next) {
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Define Schema for storing creation dates
const userCreationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const UserCreation = mongoose.model('UserCreation', userCreationSchema);

module.exports = { User, UserCreation };
