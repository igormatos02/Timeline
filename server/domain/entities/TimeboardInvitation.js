import { InvitationStatus } from '../enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

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
      throw new Error(t('backend.validation.timeboardIdRequired'));
    }
    if (!data.email) {
      throw new Error(t('backend.validation.emailRequiredField'));
    }
    return true;
  }
}
