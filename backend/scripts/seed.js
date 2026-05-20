const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf';
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log('Seed Script: Connected to MongoDB.');
      global.useJsonDb = false;
    } catch (err) {
      console.warn(`\n⚠️  Seed Script: MongoDB connection failed: ${err.message}`);
      console.warn('⚠️  Seed Script: FALLING BACK to seed the self-contained JSON file database in backend/data/\n');
      global.useJsonDb = true;
    }

    // Clear existing data
    await User.deleteMany({});
    await Book.deleteMany({});
    await Ticket.deleteMany({});
    console.log('Seed Script: Cleared existing collections.');

    // Read and parse bookleaf_sample_data.json
    const filePath = path.join(__dirname, '../../bookleaf_sample_data.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sample data file not found at ${filePath}`);
    }
    const sampleData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const authorsToInsert = [];
    const booksToInsert = [];

    for (const author of sampleData.authors) {
      // 1. Prepare Author User
      authorsToInsert.push({
        name: author.name,
        email: author.email,
        password: 'password123', // Will be hashed by pre-save schema hook
        role: 'author',
        authorId: author.author_id,
        phone: author.phone,
        city: author.city,
        joinedDate: author.joined_date ? new Date(author.joined_date) : new Date(),
      });

      // 2. Prepare Books
      if (author.books && Array.isArray(author.books)) {
        for (const book of author.books) {
          booksToInsert.push({
            bookId: book.book_id,
            authorId: author.author_id,
            title: book.title,
            isbn: book.isbn,
            genre: book.genre,
            publicationDate: book.publication_date ? new Date(book.publication_date) : null,
            status: book.status,
            mrp: book.mrp || 0,
            authorRoyaltyPerCopy: book.author_royalty_per_copy || 0,
            totalCopiesSold: book.total_copies_sold || 0,
            totalRoyaltyEarned: book.total_royalty_earned || 0,
            royaltyPaid: book.royalty_paid || 0,
            royaltyPending: book.royalty_pending || 0,
            lastRoyaltyPayoutDate: book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
            printPartner: book.print_partner || null,
            availableOn: book.available_on || [],
          });
        }
      }
    }

    // Insert Authors
    // We use .create instead of .insertMany so the mongoose pre('save') password hashing hooks run properly!
    for (const authorData of authorsToInsert) {
      await User.create(authorData);
    }
    console.log(`Seed Script: Seeded ${authorsToInsert.length} author users successfully.`);

    // Insert Books
    await Book.insertMany(booksToInsert);
    console.log(`Seed Script: Seeded ${booksToInsert.length} books successfully.`);

    // Create default Admin User
    await User.create({
      name: 'BookLeaf Admin',
      email: 'admin@bookleafpub.com',
      password: 'admin123', // Hashed via pre-save
      role: 'admin',
    });
    console.log('Seed Script: Seeded default Admin user (admin@bookleafpub.com / admin123) successfully.');

    console.log('Seed Script: Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed Script Error:', error);
    process.exit(1);
  }
};

seedDatabase();
