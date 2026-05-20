const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Chainable query helper emulating Mongoose query builder behaviors
class MongooseQueryEmulator {
  constructor(executor) {
    this.executor = executor;
  }

  // Chainable Mongoose methods returning this query instance
  select() { return this; }
  sort() { return this; }
  populate() { return this; }
  limit() { return this; }
  skip() { return this; }

  // Promise-like resolution when awaited
  then(onResolve, onReject) {
    return Promise.resolve(this.executor()).then(onResolve, onReject);
  }

  catch(onReject) {
    return Promise.resolve(this.executor()).catch(onReject);
  }
}

class JsonDocument {
  constructor(data, collection) {
    Object.assign(this, JSON.parse(JSON.stringify(data)));
    // Hide collection reference from JSON serialization
    Object.defineProperty(this, '_collection', {
      value: collection,
      writable: true,
      enumerable: false,
    });
  }

  async save() {
    // If it's a User and the password isn't hashed yet, hash it
    if (this._collection.name === 'User' && this.password && !this.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    this.updatedAt = new Date().toISOString();
    return this._collection.saveDocument(this);
  }

  // User comparePassword helper
  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  }
}

class JsonCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name.toLowerCase()}s.json`);
    this.data = [];
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch (err) {
        console.error(`Error reading ${this.name} JSON database, resetting:`, err);
        this.data = [];
      }
    } else {
      this.data = [];
      this.saveToFile();
    }
  }

  saveToFile() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Convert raw object or array to JsonDocument instance
  wrap(doc) {
    if (!doc) return null;
    return new JsonDocument(doc, this);
  }

  wrapArray(docs) {
    return docs.map(doc => this.wrap(doc));
  }

  saveDocument(docInstance) {
    const serialized = JSON.parse(JSON.stringify(docInstance));
    const index = this.data.findIndex(d => d._id === serialized._id);
    
    if (index >= 0) {
      this.data[index] = serialized;
    } else {
      this.data.push(serialized);
    }
    
    this.saveToFile();
    return this.wrap(serialized);
  }

  // --- Mongoose API Emulator ---

  find(query = {}) {
    return new MongooseQueryEmulator(() => {
      let results = [...this.data];

      // Filter results
      for (const key of Object.keys(query)) {
        if (key === '$or') {
          // Query: { $or: [ { subject: { $regex: 'x', $options: 'i' } }, ... ] }
          const conditions = query[key];
          results = results.filter(item => {
            return conditions.some(cond => {
              const condKey = Object.keys(cond)[0];
              const itemVal = item[condKey];
              if (!itemVal) return false;
              
              // Check regex
              if (cond[condKey] && cond[condKey].$regex) {
                const regex = new RegExp(cond[condKey].$regex, cond[condKey].$options || '');
                return regex.test(itemVal);
              }
              return itemVal === cond[condKey];
            });
          });
        } else {
          const val = query[key];
          if (val !== undefined) {
            results = results.filter(item => {
              // Support simple regex object
              if (val && val.$regex) {
                const regex = new RegExp(val.$regex, val.$options || '');
                return regex.test(item[key]);
              }
              return item[key] === val;
            });
          }
        }
      }

      return this.wrapArray(results);
    });
  }

  findOne(query = {}) {
    return new MongooseQueryEmulator(async () => {
      const list = await this.find(query);
      return list.length > 0 ? list[0] : null;
    });
  }

  findById(id) {
    return new MongooseQueryEmulator(async () => {
      if (!id) return null;
      const strId = id.toString();
      return this.findOne({ _id: strId });
    });
  }

  async create(docData) {
    const now = new Date().toISOString();
    const newDoc = {
      _id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      createdAt: now,
      updatedAt: now,
      ...docData,
    };

    const docInstance = this.wrap(newDoc);
    await docInstance.save(); // Hashes password if User
    return docInstance;
  }

  async insertMany(docsArray) {
    const now = new Date().toISOString();
    const createdDocs = [];

    for (const doc of docsArray) {
      const newDoc = {
        _id: Math.random().toString(36).substring(2, 11).toUpperCase(),
        createdAt: now,
        updatedAt: now,
        ...doc,
      };
      
      const docInstance = this.wrap(newDoc);
      await docInstance.save();
      createdDocs.push(docInstance);
    }
    
    return createdDocs;
  }

  async deleteMany(query = {}) {
    if (Object.keys(query).length === 0) {
      this.data = [];
    } else {
      const toRemove = await this.find(query);
      const removeIds = toRemove.map(r => r._id);
      this.data = this.data.filter(item => !removeIds.includes(item._id));
    }
    this.saveToFile();
    return { deletedCount: this.data.length };
  }

  findByIdAndUpdate(id, updateData) {
    return new MongooseQueryEmulator(async () => {
      const doc = await this.findById(id);
      if (!doc) return null;
      
      Object.assign(doc, updateData);
      await doc.save();
      return doc;
    });
  }
}

const collections = {};

const getCollection = (name) => {
  if (!collections[name]) {
    collections[name] = new JsonCollection(name);
  }
  return collections[name];
};

module.exports = {
  getCollection,
};
