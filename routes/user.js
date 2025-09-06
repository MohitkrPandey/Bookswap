const {Router} = require('express');
const router = Router();
const {User,Book,Swap,SafeSpot} = require('../db');
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


module.exports = router;