const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require("mongoose");
const User = require('../models/UserModel').User;
const { updateAcceptanceAndExpiry } = require('../middlewares/updateAcceptanceAndExpiry'); // Import the function to update acceptance and expiry
const checkPdfExpiry = require('../middlewares/checkPdfExpiry'); // Import the middleware
const sendMail = require('../utils/sendMail');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to accept the PDF
router.post('/pdfs/:id/accept', async (req, res) => {
  const pdfId = req.params.id;
  try {
    const user = await updateAcceptanceAndExpiry(pdfId, 'accept'); // Update acceptance status
    const pdf = user.pdfs.id(pdfId);
    const from = pdf.recipientEmail;
    const to = user.email;
    const subject = "PDF Signature Accepted";
    const text = `${pdf.recipientName} will be signing the file`;
    
    sendMail(from, to, subject, text);
    res.status(200).send('PDF accepted successfully.');
  } catch (error) {
    console.error('Error accepting PDF:', error);
    res.status(500).send('Error accepting PDF.');
  }
});

// Route to mention a rejection in signing the PDF
router.post('/pdfs/:id/reject', async (req, res) => {
  const pdfId = req.params.id;
  try {
    const user = await updateAcceptanceAndExpiry(pdfId, 'reject'); // Update delay mention status and expiry date if necessary
    
    const pdf = user.pdfs.id(pdfId);
    const from = pdf.recipientEmail;
    const to = user.email;
    const subject = "PDF Signature Rejected";
    const text = `${pdf.recipientName} will not be signing ${pdf.fileName}`;
    
    sendMail(from, to, subject, text);
    res.status(200).send('Rejection mentioned successfully.');
  } catch (error) {
    console.error('Error mentioning delay:', error);
    res.status(500).send('Error mentioning delay.');
  }
});


// Route to mention a delay in signing the PDF
router.post('/pdfs/:id/delay', async (req, res) => {
  const pdfId = req.params.id;
  try {
    const user = await updateAcceptanceAndExpiry(pdfId, 'delay'); // Update delay mention status and expiry date if necessary
    
    const pdf = user.pdfs.id(pdfId);
    const from = pdf.recipientEmail;
    const to = user.email;
    const subject = "PDF Signature Delayed";
    const text = `${pdf.recipientName} will be Delayed to sign the file`;
    
    sendMail(from, to, subject, text);
    res.status(200).send('Delay mentioned successfully.');
  } catch (error) {
    console.error('Error mentioning delay:', error);
    res.status(500).send('Error mentioning delay.');
  }
});

// GET all PDF files for a specific user
router.get('/:userId/pdfs', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.pdfs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET a single PDF file by ID for a specific user
router.get('/:userId/pdfs/:pdfId', checkPdfExpiry, async (req, res) => { // Apply checkPdfExpiry middleware
  try {
    const userId = req.params.userId;
    const pdfId = req.params.pdfId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const pdf = user.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf.data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST upload a new PDF file for a specific user
router.post('/:userId/pdfs', upload.single('pdf'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ message: 'Please upload a file' });
      }

      const userId = req.params.userId;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      
      // Calculate the size of the uploaded file
      const fileSize = req.file.size; 

      // Set expiry date to 7 days from now
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const pdfId = new mongoose.Types.ObjectId();

      const newPdf = {
        _id: pdfId,
        fileName: req.file.originalname,
        data: req.file.buffer,
        size: fileSize, // Store the file 
        uploadedAt: new Date(),
        recipientName: req.body.recipientName,
        recipientEmail: req.body.recipientEmail,
        expiryDate: expiryDate // Set expiry date to 7 days from now
    }
    await user.pdfs.push(newPdf);
    await user.save();
    
    res.status(201).json({ fileName: newPdf.fileName, id: newPdf._id });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// route to post the positions of the inputs where the user has to sign
router.post('/:userId/pdfs/:pdfId/positions', async (req, res) => {
  try {
    const userId = req.params.userId;
    const pdfId = req.params.pdfId;
    const positions = req.body; // Array of input field positions [{ pageIndex, x, y }, { pageIndex, x, y }, ...]

    // Find the user and the PDF
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const pdf = user.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Update the input field positions
    pdf.inputFields = positions;
    await user.save();

    const from = user.email;
      const to = pdf.recipientEmail;
      const subject  = "New PDF Uploaded for your Signature";
      const text = `Dear ${pdf.recipientName},\n\nA new PDF file (${pdf.fileName}) has been uploaded by ${user.name}.PLease sign it before the expiry.\n\nThis PDF will expire on ${pdf.expiryDate.toString()}.\n\nBest regards,\nYour App`;
      sendMail(from, to, subject, text);


    res.status(200).json({ message: 'Input field positions updated successfully' });
  } catch (error) {
    console.error('Error updating input field positions:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// DELETE delete a PDF file by ID for a specific user
router.delete('/:userId/pdfs/:pdfId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const pdfId = req.params.pdfId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const pdf = user.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Remove the PDF from the user's PDFs array
    pdf.deleteOne();
    await user.save();

    return res.status(200).json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
