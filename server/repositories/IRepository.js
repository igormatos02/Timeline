/**
 * Abstract Base Repository Interface
 * Defines the contract for all data stores (JSON Files, SQL Server, PostgreSQL, etc.)
 */
export class IRepository {
  async getAll(filterFn) {
    throw new Error('Method getAll() must be implemented');
  }

  async getById(id) {
    throw new Error('Method getById() must be implemented');
  }

  async create(entity) {
    throw new Error('Method create() must be implemented');
  }

  async createMany(entities) {
    throw new Error('Method createMany() must be implemented');
  }

  async update(id, updates) {
    throw new Error('Method update() must be implemented');
  }

  async updateMany(filterFn, updates) {
    throw new Error('Method updateMany() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }

  async deleteMany(filterFn) {
    throw new Error('Method deleteMany() must be implemented');
  }
}
