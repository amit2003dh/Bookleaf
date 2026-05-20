const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getCollection } = require('../config/jsonDb');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['author', 'admin'],
      default: 'author',
    },
    authorId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing for admins
    },
    phone: String,
    city: String,
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const mongooseModel = mongoose.model('User', userSchema);

module.exports = new Proxy(mongooseModel, {
  get(target, prop) {
    if (global.useJsonDb) {
      const jsonCollection = getCollection('User');
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
