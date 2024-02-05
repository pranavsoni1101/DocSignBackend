const express = require('express');
const router = express.Router();
const multer = require('multer');
const PDF = require('../models/PdfModel');
const User = require('../models/UserModel');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET all PDF files
router.get('/', async (req, res) => {
  try {
    const pdfs = await PDF.find({});
    res.json(pdfs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET a single PDF file by ID
router.get('/:id', async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
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

// POST upload a new PDF file
// POST upload a new PDF file
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Retrieve the user ID from the Authorization header
        const userId = req.headers.authorization.split(' ')[1];

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create a new document in MongoDB and associate it with the user
        const newPDF = new PDF({
            name: req.file.originalname,
            data: req.file.buffer,
            user: userId // Assign the user ID to the PDF document
        });
        await newPDF.save();

        return res.status(201).json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


// DELETE delete a PDF file by ID
router.delete('/:id', async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    await pdf.deleteOne();
    return res.status(200).json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
