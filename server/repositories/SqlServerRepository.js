import { IRepository } from './IRepository.js';

/**
 * SqlServerRepository Template (Prepared for Future Migration)
 *
 * To activate:
 * 1. Install 'mssql' or 'tedious': `npm install mssql`
 * 2. Configure connection string in server/.env (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME)
 * 3. Replace JsonFileRepository instances with SqlServerRepository in repositories exports.
 */
export class SqlServerRepository extends IRepository {
  constructor(tableName, EntityClass = null, pool = null) {
    super();
    this.tableName = tableName;
    this.EntityClass = EntityClass;
    this.pool = pool;
  }

  async getAll(filterFn = null) {
    // Example: const result = await this.pool.request().query(`SELECT * FROM ${this.tableName}`);
    throw new Error(`SqlServerRepository for ${this.tableName} not yet connected to a database instance.`);
  }

  async getById(id) {
    // Example: const result = await this.pool.request().input('id', id).query(`SELECT * FROM ${this.tableName} WHERE Id = @id`);
    throw new Error(`SqlServerRepository for ${this.tableName} not yet connected to a database instance.`);
  }

  async create(entity) {
    throw new Error(`SqlServerRepository for ${this.tableName} not yet connected to a database instance.`);
  }

  async update(id, updates) {
    throw new Error(`SqlServerRepository for ${this.tableName} not yet connected to a database instance.`);
  }

  async delete(id) {
    throw new Error(`SqlServerRepository for ${this.tableName} not yet connected to a database instance.`);
  }
}
