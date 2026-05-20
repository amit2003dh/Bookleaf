const express = require('express');
const router = express.Router();
const { getBooks } = require('../controllers/bookController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getBooks);

module.exports = router;
