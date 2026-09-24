import { IRepository } from './IRepository.js';

export class IDiaryRepository extends IRepository {
  async getByTimelineId(timelineId) {
    throw new Error('Method getByTimelineId() must be implemented');
  }

  async getByTimeboardId(timeboardId) {
    throw new Error('Method getByTimeboardId() must be implemented');
  }

  async getByTimelineAndDate(timelineId, date) {
    throw new Error('Method getByTimelineAndDate() must be implemented');
  }

  async deleteByTimelineId(timelineId) {
    throw new Error('Method deleteByTimelineId() must be implemented');
  }
}
