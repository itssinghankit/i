// One small storage layer with two back ends:
//  - MongoDB (Atlas) when MONGODB_URI is set
//  - a local JSON file (data/db.json) otherwise, so the app runs with dummy data and no database.
// Both expose the same calls: find, findOne, insert, update, upsert, remove.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const newId = () => crypto.randomUUID();

const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([k, v]) => doc[k] === v);

class FileStore {
  constructor(file) {
    this.file = file;
    this.data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    this.timer = null;
  }
  kind() { return 'file'; }
  col(name) { return (this.data[name] ||= []); }
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    }, 50);
  }
  async find(name, filter) { return this.col(name).filter((d) => matches(d, filter)).map((d) => ({ ...d })); }
  async findOne(name, filter) { const d = this.col(name).find((x) => matches(x, filter)); return d ? { ...d } : null; }
  async insert(name, doc) { const d = { _id: newId(), ...doc }; this.col(name).push(d); this.save(); return { ...d }; }
  async update(name, filter, patch) {
    const d = this.col(name).find((x) => matches(x, filter));
    if (!d) return null;
    Object.assign(d, patch); this.save(); return { ...d };
  }
  async updateMany(name, filter, patch) {
    this.col(name).filter((x) => matches(x, filter)).forEach((d) => Object.assign(d, patch)); this.save();
  }
  async upsert(name, filter, patch) {
    return (await this.update(name, filter, patch)) || this.insert(name, { ...filter, ...patch });
  }
  async remove(name, filter) {
    const before = this.col(name).length;
    this.data[name] = this.col(name).filter((x) => !matches(x, filter));
    this.save(); return before - this.data[name].length;
  }
  async count(name) { return this.col(name).length; }
  async wipe() { this.data = {}; this.save(); }
}

class MongoStore {
  constructor(db) { this.db = db; }
  kind() { return 'mongodb'; }
  c(name) { return this.db.collection(name); }
  async find(name, filter = {}) { return this.c(name).find(filter).toArray(); }
  async findOne(name, filter) { return this.c(name).findOne(filter); }
  async insert(name, doc) { const d = { _id: newId(), ...doc }; await this.c(name).insertOne(d); return d; }
  async update(name, filter, patch) {
    return this.c(name).findOneAndUpdate(filter, { $set: patch }, { returnDocument: 'after' });
  }
  async updateMany(name, filter, patch) { await this.c(name).updateMany(filter, { $set: patch }); }
  async upsert(name, filter, patch) {
    // Only invent an _id when the filter doesn't already give one (e.g. settings use _id 'main').
    const update = { $set: patch };
    if (!('_id' in filter)) update.$setOnInsert = { _id: newId() };
    return this.c(name).findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' });
  }
  async remove(name, filter) { return (await this.c(name).deleteMany(filter)).deletedCount; }
  async count(name) { return this.c(name).countDocuments(); }
  // Clears this app's collections only (a normal database user can't drop a whole database).
  async wipe() { await Promise.all(COLLECTIONS.map((n) => this.c(n).deleteMany({}))); }
  // Indexes keep the common lookups fast; creating an existing index again is a no-op.
  async ensureIndexes() {
    await Promise.all([
      this.c('days').createIndex({ date: 1 }, { unique: true }),
      this.c('todos').createIndex({ date: 1 }),
      this.c('weeklyHabits').createIndex({ weekStart: 1 }, { unique: true }),
      this.c('resolutions').createIndex({ year: 1 }),
    ]);
  }
}

const COLLECTIONS = ['routine', 'days', 'todos', 'weeklyHabits', 'wantToBe', 'resolutions', 'needsWants', 'settings'];

// One shared store per process. On Vercel a warm function reuses it, so it doesn't reconnect on every request.
let storePromise = null;
export function openStore() {
  storePromise ||= (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return new FileStore(process.env.DATA_FILE || path.join(__dirname, '..', '..', 'data', 'db.json'));
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const store = new MongoStore(client.db(process.env.MONGODB_DB || 'i_app'));
    await store.ensureIndexes();
    return store;
  })().catch((e) => { storePromise = null; throw e; }); // a failed connect is retried on the next request
  return storePromise;
}
