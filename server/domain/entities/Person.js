import { PersonType, PersonRole } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Entity: Person
 * Represents a person or organization associated with a Timeboard.
 */
export class Person {
  constructor({
    id,
    timeboardId = null,
    type = PersonType.PERSON,
    personName = '',
    obligatorIdentification = '',
    phone = '',
    email = '',
    taxId = null,
    birthDate = null,
    observation = '',
    role = PersonRole.CONTRIBUTOR,
    userId = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  } = {}) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.type = type;
    this.personName = personName;
    this.obligatorIdentification = obligatorIdentification;
    this.phone = phone;
    this.email = email;
    this.taxId = taxId;
    this.birthDate = birthDate;
    this.observation = observation;
    this.role = role;
    this.userId = userId;
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
    if (!data.personName || typeof data.personName !== 'string' || data.personName.trim() === '') {
      throw new Error(t('backend.validation.personNameRequired'));
    }
    if (!data.obligatorIdentification || typeof data.obligatorIdentification !== 'string' || data.obligatorIdentification.trim() === '') {
      throw new Error(t('backend.validation.obligatorIdentificationRequired'));
    }
    if (!data.timeboardId) {
      throw new Error(t('backend.validation.timeboardIdRequired'));
    }
    return true;
  }
}
