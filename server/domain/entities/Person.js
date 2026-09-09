import { PersonType, PersonRole } from '../../../shared/enums/index.js';

/**
 * Entity: Person
 * Represents a person or organization associated with a Timeboard.
 */
export class Person {
  constructor({
    id,
    timeboardId = null,
    type = PersonType.PERSON,
    name = '',
    email = '',
    phone = '',
    taxId = '',
    role = PersonRole.CONTRIBUTOR,
    userId = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.type = type || PersonType.PERSON;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.taxId = taxId;
    this.role = role || PersonRole.CONTRIBUTOR;
    this.userId = userId || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isOrganization() {
    return this.type === PersonType.ORGANIZATION;
  }

  isAdmin() {
    return this.role === PersonRole.ADMIN;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Person/Organization name is required');
    }
    if (!data.timeboardId && !data.timeboard_id) {
      throw new Error('timeboardId is required');
    }
    return true;
  }
}
