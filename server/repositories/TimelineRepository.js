import { JsonFileRepository } from './JsonFileRepository.js';
import { Timeline } from '../models/Timeline.js';

export class TimelineRepository extends JsonFileRepository {
  constructor() {
    super('timelines', Timeline);
  }

  async findByType(type) {
    return this.getAll((tl) => tl.type === type);
  }
}

export const timelineRepository = new TimelineRepository();
