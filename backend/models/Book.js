const mongoose = require('mongoose');
const { getCollection } = require('../config/jsonDb');

const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    authorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      trim: true,
    },
    genre: {
      type: String,
      trim: true,
    },
    publicationDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    mrp: {
      type: Number,
      default: 0,
    },
    authorRoyaltyPerCopy: {
      type: Number,
      default: 0,
    },
    totalCopiesSold: {
      type: Number,
      default: 0,
    },
    totalRoyaltyEarned: {
      type: Number,
      default: 0,
    },
    royaltyPaid: {
      type: Number,
      default: 0,
    },
    royaltyPending: {
      type: Number,
      default: 0,
    },
    lastRoyaltyPayoutDate: {
      type: Date,
    },
    printPartner: {
      type: String,
      trim: true,
    },
    availableOn: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const mongooseModel = mongoose.model('Book', bookSchema);

module.exports = new Proxy(mongooseModel, {
  get(target, prop) {
    if (global.useJsonDb) {
      const jsonCollection = getCollection('Book');
      if (typeof jsonCollection[prop] === 'function') {
        return jsonCollection[prop].bind(jsonCollection);
      }
      return jsonCollection[prop];
    }
    const val = Reflect.get(target, prop);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});
