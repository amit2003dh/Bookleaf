const Book = require('../models/Book');

// Get all books for current user (Author filters by own authorId, Admin gets all)
const getBooks = async (req, res) => {
  try {
    let books;
    if (req.user.role === 'admin') {
      books = await Book.find({});
    } else {
      if (!req.user.authorId) {
        return res.status(400).json({ message: 'User does not have an associated author ID' });
      }
      books = await Book.find({ authorId: req.user.authorId });
    }
    return res.json(books);
  } catch (error) {
    console.error('Fetch books error:', error);
    return res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.toString()
    });
  }
};

module.exports = {
  getBooks,
};
