import { InvitationStatus } from '../enums/index.js';

/**
 * Entity: TimeboardInvitation
 * Represents an invitation to collaborate on a Timeboard.
 */
export class TimeboardInvitation {
  constructor({
    id,
    timeboardId,
    email,
    role = 'contributor',
    status = InvitationStatus.PENDING,
    invitedBy = null,
    expiresAt = null,
    acceptedAt = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.email = email;
    this.role = role;
    this.status = status;
    this.invitedBy = invitedBy;
    this.expiresAt = expiresAt;
    this.acceptedAt = acceptedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.timeboardId && !data.timeboard_id) {
      throw new Error('timeboardId is required');
    }
    if (!data.email) {
      throw new Error('email is required');
    }
    return true;
  }
}
