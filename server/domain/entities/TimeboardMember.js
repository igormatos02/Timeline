import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Entity: TimeboardMember
 * Represents a member relation between a User and a Timeboard (Shared Dashboards).
 */
export class TimeboardMember {
  constructor({
    id,
    timeboardId,
    userId,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.userId = userId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.timeboardId && !data.timeboard_id) {
      throw new Error(t('backend.validation.timeboardIdRequired'));
    }
    if (!data.userId && !data.user_id) {
      throw new Error(t('backend.validation.userIdRequired'));
    }
    return true;
  }
}
