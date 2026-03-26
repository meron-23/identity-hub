const express = require('express');
const router = express.Router();

router.post('/link-card', (req, res) => {
  res.json({ message: 'Link card endpoint' });
});

router.patch('/:id/disable', (req, res) => {
  res.json({ message: 'Disable card endpoint' });
});

module.exports = router;
