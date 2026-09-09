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
      throw new Error('timeboardId is required');
    }
    if (!data.userId && !data.user_id) {
      throw new Error('userId is required');
    }
    return true;
  }
}
