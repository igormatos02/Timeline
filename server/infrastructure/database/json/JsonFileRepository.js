import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { IRepository } from '../../../domain/repositories/IRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonFileRepository extends IRepository {
  constructor(collectionName, EntityClass = null) {
    super();
    this.collectionName = collectionName;
    this.EntityClass = EntityClass;
    this.dbDir = path.resolve(__dirname, '../../../data/db');
    this.filePath = path.resolve(this.dbDir, `${collectionName}.json`);
  }

  async _ensureFile() {
    try {
      await fs.mkdir(this.dbDir, { recursive: true });
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  async _readAllRaw() {
    await this._ensureFile();
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch {
      return [];
    }
  }

  async _writeAllRaw(items) {
    await this._ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  _toEntity(raw) {
    if (!raw) return null;
    if (this.EntityClass) {
      return new this.EntityClass(raw);
    }
    return raw;
  }

  async getAll(filterFn = null) {
    const rawItems = await this._readAllRaw();
    const filtered = filterFn ? rawItems.filter(filterFn) : rawItems;
    return filtered.map((item) => this._toEntity(item));
  }

  async getById(id) {
    const rawItems = await this._readAllRaw();
    const item = rawItems.find((i) => i.id === id);
    return item ? this._toEntity(item) : null;
  }

  async create(entityData) {
    if (this.EntityClass && typeof this.EntityClass.validate === 'function') {
      this.EntityClass.validate(entityData);
    }

    const rawItems = await this._readAllRaw();
    const id = entityData.id || randomUUID();
    const now = new Date().toISOString();

    const newItemRaw = {
      ...entityData,
      id,
      createdAt: entityData.createdAt || now,
      updatedAt: entityData.updatedAt || now
    };

    rawItems.push(newItemRaw);
    await this._writeAllRaw(rawItems);
    return this._toEntity(newItemRaw);
  }

  async update(id, updates) {
    const rawItems = await this._readAllRaw();
    const index = rawItems.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const existing = rawItems[index];
    const updatedRaw = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };

    if (this.EntityClass && typeof this.EntityClass.validate === 'function') {
      this.EntityClass.validate(updatedRaw);
    }

    rawItems[index] = updatedRaw;
    await this._writeAllRaw(rawItems);
    return this._toEntity(updatedRaw);
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
    const filtered = rawItems.filter((i) => i.id !== id);
    if (filtered.length === rawItems.length) return false;
    await this._writeAllRaw(filtered);
    return true;
  }

  async deleteMany(filterFn) {
    const rawItems = await this._readAllRaw();
    const remaining = rawItems.filter((i) => !filterFn(i));
    const deletedCount = rawItems.length - remaining.length;
    if (deletedCount > 0) {
      await this._writeAllRaw(remaining);
    }
    return deletedCount;
  }
}
