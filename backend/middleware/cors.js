const cors = require('cors');

const corsOptions = {
  origin: '*', // Adjust for production
  methods: 'GET,POST,PATCH,DELETE,PUT',
  allowedHeaders: 'Content-Type,Authorization'
};

module.exports = cors(corsOptions);
