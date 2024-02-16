const User = require("../models/UserModel").User;
// Middleware to check access to PDF
const checkPdfExpiry = async (req, res, next) => {
    try {
      const userId = req.params.userId;
      const pdfId = req.params.pdfId;
  
      // Retrieve the user from the database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Retrieve the PDF from the user's PDFs array
      const pdf = user.pdfs.id(pdfId);
      if (!pdf) {
        return res.status(404).json({ message: 'PDF not found' });
      }
  
      // Check if the PDF has an expiry date and if it has passed the current date
      const currentDate = new Date();
      if (pdf.expiryDate && pdf.expiryDate < currentDate) {
        return res.status(403).json({ message: 'PDF has expired and is inaccessible' });
      }
  
      // If the PDF is accessible, proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Error checking PDF expiry:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
module.exports = checkPdfExpiry;  