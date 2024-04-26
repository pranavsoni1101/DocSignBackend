const User = require('../models/UserModel').User;

async function updateAcceptanceAndExpiry(pdfId, action) {
    try {
        // Find the user containing the PDF
        const user = await User.findOne({ 'pdfs._id': pdfId });
        if (!user) {
            throw new Error('User not found');
        }

        // Find the PDF by its ID
        const pdf = user.pdfs.id(pdfId);
        if (!pdf) {
            throw new Error('PDF not found');
        }

        switch (action) {
            case 'accept':
              pdf.accepted = true;
              pdf.delayed = false;
              pdf.rejected = false;
              pdf.expiryDate = null; // Remove expiry date on acceptance
              break;
            case 'reject':
              pdf.accepted = false;
              pdf.delayed = false;
              pdf.rejected = true;
              pdf.expiryDate = new Date(new Date() - (1 * 24 * 60 * 60 * 1000)); // Remove expiry date on rejection
              break;
            case 'delay':
              pdf.accepted = true;
              pdf.delayed = true;
              pdf.rejected = false;
              // Extend expiry date by 7 days if delayed
              pdf.expiryDate = new Date(pdf.expiryDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 7 days to current expiry date
              break;
            default:
              throw new Error('Invalid action');
          }
      
          await user.save();      

          // To return the user
          return user;
    } catch (error) {
        console.error('Error updating PDF and expiry:', error);
        throw error;
    }
}

module.exports = { updateAcceptanceAndExpiry };
