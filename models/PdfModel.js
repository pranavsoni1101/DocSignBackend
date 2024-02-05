const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer, // Store the binary data of the PDF file
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const PDF = mongoose.model('UserPdf', pdfSchema);

module.exports = PDF;
