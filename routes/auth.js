const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User  = require("../models/UserModel");

router.post('/signup', async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        email: req.body.email,
        password: hashedPassword,
      });
      await user.save();
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
  
  module.exports = router;