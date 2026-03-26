const express = require('express');
const router = express.Router();

router.get('/authorize', (req, res) => {
  res.json({ message: 'OAuth authorize endpoint' });
});

router.post('/token', (req, res) => {
  res.json({ message: 'OAuth token endpoint' });
});

module.exports = router;
