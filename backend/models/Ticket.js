const mongoose = require('mongoose');
const { getCollection } = require('../config/jsonDb');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['author', 'admin'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    bookId: {
      type: String, // bookId string (e.g. 'BK001') or null/empty for 'General / Account Level'
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: 'General Inquiry',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    aiSuggestedCategory: {
      type: String,
      default: '',
    },
    aiSuggestedPriority: {
      type: String,
      default: '',
    },
    isCategoryOverridden: {
      type: Boolean,
      default: false,
    },
    isPriorityOverridden: {
      type: Boolean,
      default: false,
    },
    aiDraftResponse: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    internalNotes: {
      type: String,
      default: '',
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

const mongooseModel = mongoose.model('Ticket', ticketSchema);

module.exports = new Proxy(mongooseModel, {
  get(target, prop) {
    if (global.useJsonDb) {
      const jsonCollection = getCollection('Ticket');
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
