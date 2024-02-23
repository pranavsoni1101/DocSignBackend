const jwt= require("jsonwebtoken");

const isAuthenticated = (req, res, next) => {
    if (!req.headers.authorization) {
        console.log("No Authorization header");
        return res.status(401).json({ message: "Missing authorization header" });
    }

    // Split the Authorization header to extract the token
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, 'your_secret_key');

        req.user = decoded.user;

        next();
    }
    catch(error) {
        console.log("error authenticating", error);
        return res.status(401).json('Unauthorized');
    }
}

module.exports = isAuthenticated;