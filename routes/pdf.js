const express = require('express');
const crypto = require("crypto");
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
router.get('/:userId/pdfs/:pdfId', checkPdfExpiry, async (req, res) => {
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

    // Retrieve the encryption key and IV associated with the PDF
    const encryptionKey = pdf.encryptionKey;
    const iv = pdf.iv;

    // Decrypt the PDF data using the encryption key and IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
    let decryptedData = Buffer.concat([decipher.update(pdf.data), decipher.final()]);

    // Create an object containing both the PDF object and the decrypted data
    const responseObj = {
      pdf: pdf.toObject(), // Convert Mongoose document to plain JavaScript object
      decryptedData: decryptedData.toString('base64') // Convert the decrypted buffer to base64 string
    };

    // Send the response containing the PDF object and decrypted data
    res.status(200).json(responseObj);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Route to fetch a single pending PDF by ID
router.get('/pending/:pdfId/:userEmail', verifyJWTTokenMiddleware, async (req, res) => {
  try {
    const pdfId = req.params.pdfId;
    const loggedInUserEmail = req.params.userEmail;

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
    const recipient = pdf.recipients.find(recipient => recipient.email === loggedInUserEmail);
    if (!recipient) {
      return res.status(403).json({ message: 'You are not authorized to access this PDF' });
    }

    // Retrieve the encryption key and IV associated with the PDF
    const encryptionKey = pdf.encryptionKey;
    const iv = pdf.iv;

    // Decrypt the PDF data using the encryption key and IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
    let decryptedData = Buffer.concat([decipher.update(pdf.data), decipher.final()]);

    // Update the PDF object with the decrypted data
    pdf.data = decryptedData;

    // Send the PDF object as response
    res.status(200).json(pdf);
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

    // Generate a random encryption key
    const encryptionKey = crypto.randomBytes(32); // 32 bytes = 256 bits, suitable for AES-256

    // Generate a random IV
    const iv = crypto.randomBytes(16); // 16 bytes = 128 bits, suitable for AES

    // Encrypt the PDF buffer using the encryption key and IV
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encryptedData = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

    const newPdf = {
      _id: pdfId,
      fileName: req.file.originalname,
      data: encryptedData, // Store the encrypted data
      size: fileSize, // Store the file size
      uploadedAt: new Date(),
      recipients: recipients,
      expiryDate: expiryDate, // Set expiry date to 7 days from now
      encryptionKey: encryptionKey.toString('hex'), // Store the encryption key as a hexadecimal string
      iv: iv.toString('hex') // Store the IV as a hexadecimal string
    };

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

    // Find the user
    const user = await User.findOne({ 'pdfs._id': pdfId });
    if (!user) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Find the PDF within the user's documents
    const pdf = user.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Check if the logged-in user is authorized to update the PDF
    if (emailId !== pdf.recipients[0].email) { // Assuming only one recipient for simplicity
      return res.status(403).json({ message: 'You are not authorized to update this PDF' });
    }

    // Calculate the size of the uploaded file
    const fileSize = req.file.size;

    // Generate a random encryption key for the updated PDF
    const encryptionKey = crypto.randomBytes(32).toString('hex'); // Store as a hexadecimal string

    // Generate a random IV for the updated PDF
    const iv = crypto.randomBytes(16).toString('hex'); // Store as a hexadecimal string

    // Encrypt the updated PDF buffer using the new encryption key and IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
    const encryptedData = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

    // Define the fields to be updated in the PDF document
    const updateFields = {
      data: encryptedData,
      size: fileSize,
      signedAt: new Date(),
      signed: true,
      expiryDate: null,
      delayMentioned: null,
      signatureReady: false,
      encryptionKey: encryptionKey,
      iv: iv
    };

    // Update the PDF document
    const options = { new: true }; // Return the updated document
    const updatedPdf = await User.findOneAndUpdate({ 'pdfs._id': pdfId }, { $set: { 'pdfs.$': updateFields } }, options);

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
