import { IRepository } from './IRepository.js';

export class ITodoRepository extends IRepository {
  async getByTimelineId(timelineId) {
    throw new Error('Method getByTimelineId() must be implemented');
  }

  async getByTimeboardId(timeboardId) {
    throw new Error('Method getByTimeboardId() must be implemented');
  }

  async deleteByTimelineId(timelineId) {
    throw new Error('Method deleteByTimelineId() must be implemented');
  }
}
