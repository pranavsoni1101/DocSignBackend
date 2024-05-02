const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require("mongoose");
const User = require('../models/UserModel').User;
const checkPdfExpiry = require('../middlewares/checkPdfExpiry'); // Import the middleware
const sendMail = require('../utils/sendMail');
const { verifyJWTTokenMiddleware } = require('../middlewares/jwtAuth');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET all PDF files for a specific user
router.get('/:userId/pdfs', verifyJWTTokenMiddleware, async (req, res) => {
  try {
    const data = req.decodedToken;
    const userId = data.id;

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

// Route that specifically fetches the files that are sent to them for signature
router.get('/pending/toBeSignedPdf', verifyJWTTokenMiddleware, async (req, res) => {
  try {
    const decodedToken = req.decodedToken;
    const loggedInUserEmail = decodedToken.email;

    const matchingPDFs = await User.aggregate([
      {
        $unwind: "$pdfs"
      },
      {
        $match: {
          "pdfs.recipients.email": loggedInUserEmail
        }
      },
      {
        $group: {
          _id: null,
          pdfs: { $push: "$pdfs" }
        }
      },
      {
        $project: {
          _id: 0,
          pdfs: 1
        }
      }
    ]);

    // Extract the array of PDFs from the aggregation result
    const pdfsArray = matchingPDFs.length > 0 ? matchingPDFs[0].pdfs : [];

    res.json(pdfsArray);
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
    // console.log("This is the pdf you have been looking for", pdf);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    // res.setHeader('Content-Type', 'application/pdf');
    // console.log("Pdf has been found and here is the recipient", pdf.recipients);

    res.json(pdf);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Route to fetch a single pending PDF by ID
router.get('/pending/:pdfId/:userEmail', verifyJWTTokenMiddleware, async (req, res) => {
  try {
    const pdfId = req.params.pdfId;

    // Find the pending PDF by ID
    const user = await User.findOne({ 'pdfs._id': pdfId });
    if (!user) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    const pdf = user.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Ensure that the logged-in user is the recipient of the pending PDF
    const loggedInUserEmail = req.params.userEmail;
    const isAuthorized = pdf.recipients.some(recipient => recipient.email === loggedInUserEmail);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access this PDF' });
    }

    res.json(pdf);
  } catch (error) {
    console.error('Error fetching pending PDF:', error);
    res.status(500).json({ message: 'Internal Server Error' });
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

      const recipients = JSON.parse(req.body.recipients); // Array of recipients

      const newPdf = {
        _id: pdfId,
        fileName: req.file.originalname,
        data: req.file.buffer,
        size: fileSize, // Store the file 
        uploadedAt: new Date(),
        recipients: recipients,
        // recipientName: req.body.recipientName,
        // recipientEmail: req.body.recipientEmail,
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


router.patch('/:emailId/pdfs/:pdfId', verifyJWTTokenMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const emailId = req.params.emailId;
    const pdfId = req.params.pdfId;
    
    // Define the fields to be updated
    const updateFields = {
      data: req.file.buffer,
      size: req.file.size,
      signedAt: new Date(),
      signed: true,
      expiryDate: null,
      delayMentioned: null,
      signatureReady: false
    };

    // Update the PDF document
    const filter = { 'pdfs._id': pdfId };
    const options = { new: true }; // Return the updated document
    const updatedPdf = await User.findOneAndUpdate(filter, updateFields, options);

    // Check if PDF is found
    if (!updatedPdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    console.log("Updated PDF", updatedPdf);

    res.status(200).json({ fileName: updatedPdf.fileName, id: updatedPdf._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


// route to post the positions of the inputs where the user has to sign
router.patch('/:userId/pdfs/:pdfId/positions', async (req, res) => {
  try {
    const userId = req.params.userId;
    const pdfId = req.params.pdfId;
    const positions = req.body; // Array of input field positions [{ pageIndex, x, y }, { pageIndex, x, y }, ...]
console.log("data", positions);
    // Find the user and the PDF
    const user = await User.findById(userId);
    // console.log("User", user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const pdf = user.pdfs.id(pdfId);
    // console.log("pdf", pdf);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Update the input field positions
    positions.map((position) => {
      pdf.inputFields.push(
        {
          id: position.id,
          // ref: Object,
          user: position.user,
          type: position.type,
          value: position.value,
          page: position.page, // Index of the page where the input field is located
          x: position.x, // X-coordinate of the input field
          y: position.y, // Y-coordinate of the input field
        }
      )
    })
    // pdf.inputFields = positions;
    pdf.signatureReady = true;
    await user.save();

    const from = user.email;
    const subject  = "New PDF Uploaded for your Signature";
    pdf.recipients.map((recipient) => {
      const text = `Dear ${recipient.name},\n\nA new PDF file (${pdf.fileName}) has been uploaded by ${user.name}.PLease sign it before the expiry.\n\nThis PDF will expire on ${pdf.expiryDate.toString()}.\n\nBest regards,\nYour App`;
      sendMail(from, recipient.email, subject, text);
    })  


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
