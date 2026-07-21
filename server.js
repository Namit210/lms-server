const express = require('express');
const app = express();
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

// Configure Cloudinary
const cloudinaryConfig = require('./config/cloudinary');
cloudinaryConfig();

// Middleware to parse JSON requests
app.use(express.json());


//give access to all origins
const cors = require('cors');
app.use(cors());

// use routes
app.use('/api/courses', require('./controller/courseController'));
app.use('/api/users', require('./controller/userController'));
app.use('/api/payments', require('./controller/paymentController'));
app.use('/api/cloudinary', require('./controller/CloudinaryController'));
app.use('/api/auth', require('./controller/AuthController'));

//Port number
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hare Krishna! Welcome to the LMS server.');
});

app.listen(port, () => {
  console.log(`LMS server is running at http://localhost:${port}`);
});