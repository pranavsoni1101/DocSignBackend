const express = require('express');
const router = express.Router();
const multer = require('multer');
const randomstring = require("randomstring");
const { User } = require('../models/UserModel');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to retrieve all signatures for a specific user
router.get('/:userId/signatures', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.signatures);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to retrieve a specific signature for a specific user
router.get('/:userId/signatures/:signatureId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const signature = user.signatures.id(req.params.signatureId);
        if (!signature) {
            return res.status(404).json({ message: 'Signature not found' });
        }
        res.setHeader('Content-Type', 'image/png');
        res.send(signature.data);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to handle signature upload for a specific user
router.post('/:userId/signatures', upload.single('signature'), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a signature' });
        }

        // Limiting signature uploads to 10
        if (user.signatures.length >= 10) {
            return res.status(400).json({ message: 'Maximum number of signature uploads exceeded (10)' });
        }

        // Create a new signature document and add it to the user's signatures array
        const newSignature = {
            name: req.file.originalname || randomstring.generate(10),
            data: req.file.buffer.toString('base64'), // Assuming data is stored as base64 string
            type: req.body.type,
            uploadedAt: new Date()
        };

        user.signatures.push(newSignature);
        await user.save();

        return res.status(201).json({ message: 'Signature file uploaded successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to delete a specific signature for a specific user
router.delete('/:userId/signatures/:signatureId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const signature = user.signatures.id(req.params.signatureId);
        if (!signature) {
            return res.status(404).json({ message: 'Signature not found' });
        }

        signature.remove();
        await user.save();

        return res.status(200).json({ message: 'Signature deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
