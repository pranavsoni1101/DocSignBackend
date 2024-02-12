const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserCreation } = require("../models/UserModel");

router.post('/signup', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        });
        await user.save();

        // Create a record in the UserCreation collection
        const userCreation = new UserCreation({
            userId: user._id,
        });
        await userCreation.save();

        res.status(201).send('User created successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating user');
    }
});

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).send('User not found');
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(401).send('Invalid password');
        }
        const token = jwt.sign({ userId: user._id }, 'your_secret_key');
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error logging in');
    }
});

router.get('/user', async (req, res) => {
    try {
        // Extract the token from the Authorization header
        const token = req.headers.authorization.split(' ')[1];
        // Decode the token to get the user's ID
        const decoded = jwt.verify(token, 'your_secret_key');
        // Fetch the user details from the database
        const user = await User.findById(decoded.userId);
        // Send the user details back to the client
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone, // Include phone number
            address: user.address, // Include address
            profilePicture: user.profilePicture // Include profile picture
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching user details');
    }
});

router.patch('/user', async (req, res) => {
    try {
        // Extract the token from the Authorization header
        const token = req.headers.authorization.split(' ')[1];
        // Decode the token to get the user's ID
        const decoded = jwt.verify(token, 'your_secret_key');
        // Fetch the user details from the database
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).send('User not found');
        }
        // Update user details based on request data
        if (req.body.name) {
            user.name = req.body.name;
        }
        if (req.body.phone) {
            user.phone = req.body.phone;
        }
        if (req.body.address) {
            user.address = req.body.address;
        }
        if (req.body.profilePicture) {
            user.profilePicture = req.body.profilePicture;
        }
        await user.save();
        // Send updated user details back to the client
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            profilePicture: user.profilePicture
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating user details');
    }
});


module.exports = router;
