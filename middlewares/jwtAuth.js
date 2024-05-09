const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const secretKey = crypto.randomBytes(16).toString('hex'); 

const generateJWTToken = (userData) => {
    const token = jwt.sign(userData, secretKey, {algorithm: 'HS256'});
    console.log("Token", token);
    return token;
}

const verifyJWTTokenMiddleware = (req, res, next) => {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
    if  (!token) {
        return res.status(401).send('Unauthorized');
    }
    // Verify token
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).send('Unauthorized');
        }
        // Attach decoded token to request object
        req.decodedToken = decoded;
        // Pass control to the next middleware
        next();
    });
}

module.exports = {generateJWTToken, verifyJWTTokenMiddleware}