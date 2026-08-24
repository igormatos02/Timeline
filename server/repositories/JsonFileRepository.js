import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { IRepository } from './IRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.resolve(__dirname, '../data/db');

export class JsonFileRepository extends IRepository {
  constructor(tableName, EntityClass = null) {
    super();
    this.tableName = tableName;
    this.EntityClass = EntityClass;
    this.filePath = path.join(DB_DIR, `${tableName}.json`);
    this.isInitialized = false;
  }

  async _ensureFile() {
    if (this.isInitialized) return;
    try {
      await fs.mkdir(DB_DIR, { recursive: true });
      try {
        await fs.access(this.filePath);
      } catch {
        await fs.writeFile(this.filePath, '[]', 'utf8');
      }
      this.isInitialized = true;
    } catch (err) {
      console.error(`Failed to initialize ${this.tableName}.json:`, err);
      throw err;
    }
  }

  async _readAllRaw() {
    await this._ensureFile();
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      if (!content || !content.trim()) return [];
      return JSON.parse(content);
    } catch (err) {
      console.error(`Error reading ${this.filePath}:`, err);
      return [];
    }
  }

  async _writeAllRaw(items) {
    await this._ensureFile();
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    const payload = JSON.stringify(items, null, 2);
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }

  _toEntity(item) {
    if (!item) return null;
    if (this.EntityClass) {
      return new this.EntityClass(item);
    }
    return item;
  }

  async getAll(filterFn = null) {
    const rawItems = await this._readAllRaw();
    const filtered = filterFn ? rawItems.filter(filterFn) : rawItems;
    return filtered.map((item) => this._toEntity(item));
  }

  async getById(id) {
    const rawItems = await this._readAllRaw();
    const found = rawItems.find((item) => String(item.id) === String(id));
    return this._toEntity(found);
  }

  async create(data) {
    const rawItems = await this._readAllRaw();
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    rawItems.push(newItem);
    await this._writeAllRaw(rawItems);
    return this._toEntity(newItem);
  }

  async createMany(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
    const rawItems = await this._readAllRaw();
    const now = new Date().toISOString();
    const newItems = dataArray.map((data) => ({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || now,
      updatedAt: now
    }));
    rawItems.push(...newItems);
    await this._writeAllRaw(rawItems);
    return newItems.map((item) => this._toEntity(item));
  }

  async update(id, updates) {
    const rawItems = await this._readAllRaw();
    const index = rawItems.findIndex((item) => String(item.id) === String(id));
    if (index === -1) {
      return null;
    }
    const updated = {
      ...rawItems[index],
      ...updates,
      id: rawItems[index].id, // preserve id
      updatedAt: new Date().toISOString()
    };
    rawItems[index] = updated;
    await this._writeAllRaw(rawItems);
    return this._toEntity(updated);
  }

  async updateMany(filterFn, updates) {
    const rawItems = await this._readAllRaw();
    let updatedCount = 0;
    const now = new Date().toISOString();
    const updatedItems = rawItems.map((item) => {
      if (filterFn(item)) {
        updatedCount++;
        return {
          ...item,
          ...updates,
          id: item.id,
          updatedAt: now
        };
      }
      return item;
    });
    if (updatedCount > 0) {
      await this._writeAllRaw(updatedItems);
    }
    return updatedCount;
  }

  async delete(id) {
    const rawItems = await this._readAllRaw();
    const initialLength = rawItems.length;
    const remaining = rawItems.filter((item) => String(item.id) !== String(id));
    if (remaining.length !== initialLength) {
      await this._writeAllRaw(remaining);
      return true;
    }
    return false;
  }

  async deleteMany(filterFn) {
    const rawItems = await this._readAllRaw();
    const initialLength = rawItems.length;
    const remaining = rawItems.filter((item) => !filterFn(item));
    const deletedCount = initialLength - remaining.length;
    if (deletedCount > 0) {
      await this._writeAllRaw(remaining);
    }
    return deletedCount;
  }
}
