import { IRepository } from './IRepository.js';

export class IFollowupRepository extends IRepository {
  async getByTimelineId(timelineId) {
    throw new Error('Method getByTimelineId() must be implemented');
  }

  async getByTimeboardId(timeboardId) {
    throw new Error('Method getByTimeboardId() must be implemented');
  }

  async getByEventId(eventId) {
    throw new Error('Method getByEventId() must be implemented');
  }

  async deleteByEventId(eventId) {
    throw new Error('Method deleteByEventId() must be implemented');
  }

  async deleteByTimelineId(timelineId) {
    throw new Error('Method deleteByTimelineId() must be implemented');
  }
}
