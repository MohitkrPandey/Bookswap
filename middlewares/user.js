const dotenv = require('dotenv');
dotenv.config();
const {User,Book,Swap,SafeSpot} = require('../db');
const jwt = require('jsonwebtoken');
const { decode } = require('punycode');
const JWT_SECRET = process.env.JWT_SECRET;

function userMiddleware(req, res, next) {
    try{
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }
        else {
            const words = token.split(' ');
            const decoded = jwt.verify(words[1], JWT_SECRET);
            if (decoded.email)
            {
                req.email = decoded.email;
                next();
            }
        }
    }
    catch(err){
        return res.status(401).json({ error: "Invalid token." });
    }
}



module.exports = userMiddleware;
