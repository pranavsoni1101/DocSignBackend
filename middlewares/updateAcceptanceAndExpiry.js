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

        // Update acceptance status and expiry date based on action
        if (action === 'accept') {
            pdf.accepted = true;
            pdf.delayMentioned = false;
            pdf.expiryDate = null;
        } else if (action === 'delay') {
            pdf.accepted = true;

            // Extend expiry date by 7 days
            const currentExpiry = pdf.expiryDate;
            const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
            pdf.expiryDate = newExpiry;
        }

        // Save the changes
        await user.save();

        return { success: true, message: `PDF ${action === 'accept' ? 'accepted' : 'expiry date updated'}` };
    } catch (error) {
        console.error('Error updating PDF and expiry:', error);
        throw error;
    }
}

module.exports = { updateAcceptanceAndExpiry };
