const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const URL_link = process.env.MONGOOSE_URL;

mongoose.connect(URL_link,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});


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
  interest: [String],
  reviews:[String]
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


//credits schema

const creditsLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  change: { type: Number, enum: [2, -2], required: true },
  reason: { type: String, enum: ["book_given", "book_taken", "swap_cancelled"], required: true },
  createdAt: { type: Date, default: Date.now }
});

//swipe schema

const swapRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who clicked "Go"
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // book owner
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  requesterName: { type: String }, // optional name input
  message: { type: String },       // optional message
  status: { type: String, enum: ["pending", "confirmed","completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

//review schema
const reviewSchema = new mongoose.Schema({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  Comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});


const User = mongoose.model("User", userSchema);
const Book = mongoose.model("Book", bookSchema);
const Swap = mongoose.model("Swap", swapSchema);
const CreditsLog = mongoose.model("CreditsLog", creditsLogSchema);
const Swiperequest = mongoose.model("Swiperequest", swapRequestSchema);
const Review = mongoose.model("Review", reviewSchema);


module.exports = { User, Book, Swap, CreditsLog,Swiperequest,Review };
