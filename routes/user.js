const {Router} = require('express');
const router = Router();
const {User,Book,Swap,Swiperequest,Review,CreditsLog} = require('../db');
const userMiddleware = require('../middlewares/user');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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

//book shelve add books
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

//book shelve get books
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

//get all swapes of user
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

//create a swipe request
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

//confirm a swipe request
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

//complete a swipe request and add credits
router.post('/:id/credits', userMiddleware, async (req, res) => {
  try {
    const swaprequest = await Swiperequest.findById(req.params.id);
    console.log(swaprequest);
    if (!swaprequest) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    // Fetch user using email from middleware
    const user = await User.findOne({ email: req.headers.email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (
      swaprequest.requesterId.toString() !== user._id.toString()){
      return res.status(403).json({ error: "Not authorized to complete this action" });
    }

    swaprequest.status = "confirmed";
    await swaprequest.save();

    await User.findByIdAndUpdate(
      swaprequest.requesterId,
      { $inc: { credits: 2 } }
    );
    await User.findByIdAndUpdate(
      swaprequest.ownerId,
      { $inc: { credits: 2 } }
    );

    //update credits log
    const newcreditlog1 =  new CreditsLog({
        userId: swaprequest.requesterId,
        change: 2,
        reason: "book_taken",
        createdAt: Date.now()
    })

    const newcreditlog2 =  new CreditsLog({
        userId: swaprequest.ownerId,
        change: 2,
        reason: "book_given",
        createdAt: Date.now()
    })

    const newSwap = new Swap({
      requesterId: swaprequest.requesterId,
      ownerId: swaprequest.ownerId,
      bookId: swaprequest.bookId,
      status: "completed",
      createdAt: Date.now(),
      qrToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    });
    await newSwap.save();
    await Swiperequest.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Swap request confirmed and +2 credits added to both users",
      swaprequest
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

//show my credits
router.get('/my-credits', userMiddleware, async (req, res) => {
    try{
        const userDoc = await User.findOne({ email: req.headers.email });
        if(!userDoc){
            return res.status(400).json({error: "User not found"});
        }
        else{
            res.status(200).json({credits: userDoc.credits});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
});

//Load 10 books at once 
router.get('/explore', userMiddleware, async (req, res) => {
    try{
        const {skip=0 , limit=10 , userId} = req.query;
        const books = await Book.find({ 
        status: "available", 
        userId: { $ne: userId } 
        })
        .skip(Number(skip))
        .limit(Number(limit));
        res.json(books);
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
})

//load all swap requests of a user (owner)
router.get('/swaprequests', userMiddleware, async (req, res) => { 
    try{
        const userDoc = await User.findOne({ email: req.headers.email });
        if(!userDoc){
            return res.status(400).json({error: "User not found"});
        }
        else{
            const requests = await Swiperequest.find({ownerId: userDoc._id}).populate('bookId requesterId');
            res.status(200).json({requests: requests});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
})

//get user details
router.get('/details', userMiddleware, async (req, res) => {
    try{
        const userDoc = await User.findOne({ email: req.headers.email });
        if(!userDoc){
            return res.status(400).json({error: "User not found"});
        }
        else{
            res.status(200).json({user: userDoc});
        }
    }
    catch(err){
        res.status(500).json({error: "Internal server error"});
    }
});

//review a user
router.post('/review', userMiddleware, async (req, res) => {
    try {
        const { revieweeId, rating, Comment } = req.body;
        const reviewer = await User.findOne({ email: req.headers.email });
        if (!reviewer) {
            return res.status(400).json({ error: "Reviewer not found" });
        }
        const reviewee = await User.findById(revieweeId);
        if (!reviewee) {
            return res.status(400).json({ error: "Reviewee not found" });
        }
        const newReview = new Review({
            reviewerId: reviewer._id,
            revieweeId,
            rating,
            Comment,
            createdAt: Date.now()
        });
        await newReview.save();
        res.status(201).json({ message: "Review submitted successfully", review: newReview });
      }
    catch(err){
      res.status(500).json({ error: "Internal server error" });
    }
  });

//show reviews of a user
router.get('/reviews/:userId',async(req,res)=>{
    try{
      const reviews= await Review.find({
          revieweeId: req.params.userId
      }).populate('reviewerId');
      res.status(200).json({reviews: reviews});
    }
    catch(err){
      res.status(500).json({ error: "Internal server error" });
    }
  })

//get random book for swipe basis of user genre interest which loads 10 books at once
router.get('/swipe-random', userMiddleware , async(req,res)=>{
  try{
    const {userId} = req.query;
    const userDoc = await User.findById(userId);
    if(!userDoc){
        return res.status(400).json({error: "User not found"});
    }
    const interests = userDoc.interest;
    const books = await Book.aggregate([
        { $match: { status: "available", userId: { $ne: userId }, genre: { $in: interests } } },
        { $sample: { size: 10 } }
    ]);
    res.status(200).json({books: books});
  }
  catch(err){
    res.status(500).json({ error: "Internal server error" });
  }
})

//on every swipe shows the name of book , autor name , coverUrl , owner name ,genre
router.get('/swipe-info/:bookId', userMiddleware, async(req,res)=>{
  try{
    const book = await Book.findById(req.params.bookId).populate('userId');
    if(!book){
        return res.status(400).json({error: "Book not found"});
    }
    res.status(200).json({book: book});
  }
  catch(err){
    res.status(500).json({ error: "Internal server error" });
  }
})

//serch books by title or author
router.get('/search-books', userMiddleware, async(req,res)=>{
  try{
    const {query} = req.query;
    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Search query required" });
    }
    const books = await Book.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        {author: { $regex: query, $options: 'i' } }
      ]
    })
    res.status(200).json({books: books});
    }
    catch(err){
      res.status(500).json({ error: "Internal server error" });
    }
  })

//book recomendations
router.get('/reccomendations', userMiddleware, async(req,res)=>{
  try{
    const {userId} = req.query;
    const userDoc = await User.findById(userId);
    if(!userDoc){
        return res.status(400).json({error: "User not found"});
    }
    const interests = userDoc.interest;
    const books = await Book.aggregate([
        { $match: { status: "available", userId: { $ne: userId }, genre: { $in: interests } } },
        { $sample: { size: 10 } }
    ]);
    res.status(200).json({books: books});
  }
  catch(err){
    res.status(500).json({ error: "Internal server error" });
  }   
})

//nearest safe spot algorithm

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

router.get('/nearest-safespot', userMiddleware, async(req,res)=>{
    try {
    const { lat, lon, query = "library" } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    // OpenStreetMap Nominatim API call
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=20&viewbox=${parseFloat(lon)-0.1},${parseFloat(lat)+0.1},${parseFloat(lon)+0.1},${parseFloat(lat)-0.1}&bounded=1`;

    const response = await axios.get(url, {
      headers: { "User-Agent": "BookSwapApp/1.0" }
    });

    // Filter only spots within 5 km
    const spots = response.data
      .map((spot) => {
        const distance = getDistance(
          parseFloat(lat),
          parseFloat(lon),
          parseFloat(spot.lat),
          parseFloat(spot.lon)
        );
        return {
          name: spot.display_name,
          lat: parseFloat(spot.lat),
          lon: parseFloat(spot.lon),
          distance: distance.toFixed(2), // km
          type: query
        };
      })
      .filter((spot) => spot.distance <= 5);

    res.status(200).json({ spots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});










module.exports = router;