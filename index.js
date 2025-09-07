const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const userRouter = require('./routes/user');
//const chatservice = require('./chathandler');
const dotenv = require('dotenv');
dotenv.config();
//const io = socketIo(server, { /* config */ });


app.use(bodyParser.json());
app.use('/user', userRouter);
// Initialize chat service
//chatService.init(io);

// Initialize chat handler
//const initializeChat = require('./chatHandler');
//initializeChat(io);



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
