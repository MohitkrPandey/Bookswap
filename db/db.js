const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const URL_link = process.env.MONGOOSE_URL;

mongoose.connect(URL_link,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const mongoose = require("mongoose");
const { request } = require("http");

//user schema

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  location: {
    lat: Number,
    lon: Number
  },
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  interest: [String]
});

//book schema

const bookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  author: { type: String },
  coverUrl: { type: String },
  status: {
    type: String,
    enum: ["available", "reserved", "swapped"],
    default: "available"
  },
  genre: [String],
  createdAt: { type: Date, default: Date.now }
});

//swaps Schema

const swapSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "completed", "cancelled"],
    default: "pending"
  },
  qrToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

//Safespot Schema

const safeSpotSchema = new mongoose.Schema({
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookid: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    Location: {
        lat: Number,
        lon: Number
    },
    status: {
    type: String,
    enum: ["reached", "pending", "cancelled" , "completed"],
    default: "pending"
    },
    createdAt: { type: Date, default: Date.now }
})

//credits schema

const creditsLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  change: { type: Number, enum: [2, -2], required: true },
  reason: { type: String, enum: ["book_given", "book_taken", "swap_cancelled"], required: true },
  createdAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model("CreditsLog", creditsLogSchema);
module.exports = mongoose.model("Swap", swapSchema);
module.exports = mongoose.model("Book", bookSchema);
module.exports = mongoose.model("User", userSchema);
