const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');
const { Book } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET;

async function bookMiddleware(req, res, next) {
    // If request has bookId (like update/delete), check if book exists
    try{
        if (req.params.bookId) {
            const book = await Book.findById(req.params.bookId);
            if (!book) {
                return res.status(404).json({ error: "Book not found." });
            }
            req.book = book;
            next();
        }
        else{
            return res.status(401).json({ error: "Invalid token." });
        }
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid token." });
    }
}

module.exports = bookMiddleware;