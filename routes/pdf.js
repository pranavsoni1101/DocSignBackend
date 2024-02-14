const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require("nodemailer");
const User = require('../models/UserModel').User;

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
router.get('/:userId/pdfs/:pdfId', async (req, res) => {
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

        user.pdfs.push({
            fileName: req.file.originalname,
            data: req.file.buffer,
            size: fileSize, // Store the file 
            uploadedAt: new Date(),
            recipientName: req.body.recipientName,
            recipientEmail: req.body.recipientEmail,
        });
        await user.save();
        let transporter = nodemailer.createTransport({
          // host: "smtp.gmail.com",
          // port: 465,
          // secure: true,       
          service: 'Gmail',
          auth: {
              user: "pranav.soni@kcloudtechnologies.com",
              pass: "uoxu mmnh icfh jktr" // Your Gmail password
          }
      });

      // Prepare email message
      let mailOptions = {
          from: user.email, // Sender address
          to: req.body.recipientEmail, // Recipient address
          subject: 'New PDF Uploaded', // Subject line
          text: `Dear ${req.body.recipientName},\n\nA new PDF file (${req.file.originalname}) has been uploaded.\n\nBest regards,\nYour App`
      };

      // Send email
      await transporter.sendMail(mailOptions);

      return res.status(201).json({ message: 'File uploaded successfully and email sent' });

        // return res.status(201).json({ message: 'File uploaded successfully' });  
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
    user.pdfs.id(pdfId).deleteOne();
    await user.save();
    return res.status(200).json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
