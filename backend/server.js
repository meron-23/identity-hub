const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('Identity Hub API is running...');
});

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/enroll', require('./api/enrollment'));
app.use('/api/card', require('./api/card'));
app.use('/api/transaction', require('./api/transaction'));
app.use('/api/consent', require('./api/consent'));
app.use('/api/virtual-card', require('./api/virtual-card'));
app.use('/oauth', require('./api/oauth'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
