const {Router} = require('express');
const router = Router();
const {User,Book,Swap,SafeSpot,Swiperequest} = require('../db');
const userMiddleware = require('../middlewares/user');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { create } = require('domain');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

//get user details (signup)
router.post('/signup', async (req, res) => {
    try{
        const {name,email,password,lat,lon,interest} = req.body;
        const existinguser = await User.findOne({
            email: email,
            password: password
        });
        if (existinguser){
            return res.status(400).json({error: "User already exists"});
        }
        else{
            await User.create({
                name:name,
                email:email,
                password:password,
                Location: {lat: lat, lon: lon},
                credits: 0,
                interest: [],
                createdAt: Date.now()
            });
            res.status(201).json({message: "User created successfully"});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
});

//login user

router.post('/login', async(req,res)=>{
    try{
        const {email,password} = req.body;
        const user = await User.findOne({
            email: email,
            password: password
        });
        if(user){
            const token = jwt.sign({email: user.email},    JWT_SECRET, {expiresIn: '1h'});
            res.status(200).json({token: token,message:"Login successful"});
        }
        else{
            return res.status(400).json({error: "Invalid email or password"});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }

})

router.post('/book-shelve/addbooks', userMiddleware, async (req, res) => {
  try {
    const { title, author, coverUrl, genre, status } = req.body;

    // Use req.email from middleware
    const userDoc = await User.findOne({ email: req.email });
    if (!userDoc) {
      return res.status(400).json({ error: "User not found" });
    }

    await Book.create({
      userId: userDoc._id,
      title,
      author,
      coverUrl,
      genre,
      status,
      createdAt: Date.now()
    });

    res.status(201).json({ message: "Book added successfully" });
  } catch (err) {
    console.error("Add book error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/book-shelve',userMiddleware,async(req,res)=>{
    try{
        const userDoc = await User.findOne({ email: req.headers.email });
        if(!userDoc){
            return res.status(400).json({error: "User not found"});
        }
        else{
            const books = await Book.find({userId: userDoc._id});
            res.status(200).json({books: books});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
})

router.get("/my-swipes", userMiddleware, async (req, res) => {
  try {
    const userDoc = await User.findOne({ email: req.headers.email });
    if (!userDoc) {
      return res.status(400).json({ error: "User not found" });
    }

    const swipes = await Swipe.find({ userId: userDoc._id }).populate("bookId ownerId");
    res.status(200).json({ swipes });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/swipe',userMiddleware,async(req,res)=>{
    try {
    const { bookId, message , requesterName } = req.body;

    const user = await User.findOne({ email: req.headers.email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const book = await Book.findById(bookId);
    if (!book) return res.status(400).json({ error: "Book not found" });

    const swap = new Swiperequest({
      requesterId: user._id,
      ownerId: book.userId,
      bookId,
      requesterName,
      message,
      status: "pending"
    });
    await swap.save();
    res.json({ status: "ok", swap });
    } 
    catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/request", userMiddleware, async (req, res) => {
    try {
    const user = await User.findOne({ email: req.headers.email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const swap = await Swiperequest.findById(req.params.id);
    if (!swap) return res.status(400).json({ error: "Swap not found" });

    if (swap.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    swap.status = "confirmed";
    await swap.save();

    res.json({ status: "ok", message: "Swap confirmed", swap });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/:id/credits', userMiddleware, async (req, res) => {
  try {
    const swaprequest = await Swiperequest.findById(req.params.id);
    
    if (!swaprequest) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    if (
      swaprequest.requesterId.toString() !== req.user._id.toString() &&
      swaprequest.ownerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized to complete this action" });
    }

    swaprequest.status = "confirmed";
    await swaprequest.save();

    // Update credits directly in the database
    await User.findByIdAndUpdate(
      swaprequest.requesterId,
      { $inc: { credits: 2 } }
    );
    
    await User.findByIdAndUpdate(
      swaprequest.ownerId,
      { $inc: { credits: 2 } }
    );

    res.status(200).json({
      message: "Swap request confirmed and +2 credits added to both users",
      swaprequest
    });

  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;