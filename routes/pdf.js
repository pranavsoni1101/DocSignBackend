const express = require('express');
const router = express.Router();
const multer = require('multer');
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
    await updateAcceptanceAndExpiry(pdfId, 'accept'); // Update acceptance status
    res.status(200).send('PDF accepted successfully.');
  } catch (error) {
    console.error('Error accepting PDF:', error);
    res.status(500).send('Error accepting PDF.');
  }
});

// Route to mention a delay in signing the PDF
router.post('/pdfs/:id/delay', async (req, res) => {
  const pdfId = req.params.id;
  try {
    await updateAcceptanceAndExpiry(pdfId, 'delay'); // Update delay mention status and expiry date if necessary
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

      user.pdfs.push({
          fileName: req.file.originalname,
          data: req.file.buffer,
          size: fileSize, // Store the file 
          uploadedAt: new Date(),
          recipientName: req.body.recipientName,
          recipientEmail: req.body.recipientEmail,
          expiryDate: expiryDate // Set expiry date to 7 days from now
      });
      await user.save();
      
      const from = user.email;
      const to = req.body.recipientEmail;
      const subject  = "New PDF Uploaded";
      const text = `Dear ${req.body.recipientName},\n\nA new PDF file (${req.file.originalname}) has been uploaded.\n\nThis PDF will expire on ${expiryDate.toDateString()}.\n\nBest regards,\nYour App`;
      sendMail(from, to, subject, text);

  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
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

module.exports = router;
