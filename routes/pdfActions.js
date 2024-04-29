const express = require('express');
const router = express.Router();
const { updateAcceptanceAndExpiry } = require('../middlewares/updateAcceptanceAndExpiry'); // Import the function to update acceptance and expiry
const sendMail = require('../utils/sendMail');
const { verifyJWTTokenMiddleware } = require('../middlewares/jwtAuth');

router.post('/pdfs/:id/accept', verifyJWTTokenMiddleware,async (req, res) => {
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
  router.post('/pdfs/:id/reject', verifyJWTTokenMiddleware,async (req, res) => {
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
  router.post('/pdfs/:id/delay', verifyJWTTokenMiddleware, async (req, res) => {
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

  
  module.exports = router