/**
 * Domain Repository Interface (Port)
 */
export class IRepository {
  async getAll(filterFn = null) {
    throw new Error('Method getAll() must be implemented');
  }

  async getById(id) {
    throw new Error('Method getById() must be implemented');
  }

  async create(entity) {
    throw new Error('Method create() must be implemented');
  }

  async update(id, updates) {
    throw new Error('Method update() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}
