import { JsonFileRepository } from './JsonFileRepository.js';
import { Timeboard } from '../models/Timeboard.js';

export class TimeboardRepository extends JsonFileRepository {
  constructor() {
    super('timeboards', Timeboard);
  }

  async findByTenant(tenant) {
    return this.getAll((tb) => tb.tenant === tenant);
  }
}

export const timeboardRepository = new TimeboardRepository();
