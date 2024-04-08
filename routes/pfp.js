const express = require('express');
const {User}  = require("../models/UserModel");
const { verifyJWTTokenMiddleware } = require('../middlewares/jwtAuth');

const router = express.Router();

router.get('/', verifyJWTTokenMiddleware ,async (req, res) => {
    
    const data = req.decodedToken;
    const userId = data.id;
    
    try {
        const user = await User.findById(userId);
        // console.log("Greetings by the user",user);

        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        const base64ProfilePicture = user.profilePicture.toString('base64');

        res.json({            profilePicture: user.profilePicture, // Include profile picture
        profilePictureName: user.profilePictureName
});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

module.exports = router;
