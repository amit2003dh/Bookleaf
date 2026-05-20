const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf';
    // Set 3 seconds timeout for fast fallback determination
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.useJsonDb = false;
  } catch (error) {
    console.warn(`\n⚠️  MongoDB Connection Refused: ${error.message}`);
    console.warn('⚠️  FALLING BACK TO EMBEDDED JSON FILE DATABASE (Self-Contained in backend/data/)');
    console.warn('⚠️  No background MongoDB service or external installation is required to test.\n');
    global.useJsonDb = true;
  }
};

module.exports = connectDB;
