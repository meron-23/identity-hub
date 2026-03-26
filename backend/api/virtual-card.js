const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.json({ message: 'Virtual card endpoint' });
});

module.exports = router;
