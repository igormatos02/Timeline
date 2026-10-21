import { PersonType } from './PersonType.js';
import { PersonRole } from './PersonRole.js';

/**
 * What a person record is in a condominium (CondoFlow):
 * - UNIT: a unit (fração) and its owner — has a unit identification; when invited, always Individual
 * - MEMBER: someone who helps manage — Administrator or Collaborator (contributor), invited by e-mail
 * - ENTITY: a person or company linked to costs and income, only a reference (never invited)
 */
export const PersonCategory = Object.freeze({
  UNIT: 'unit',
  ENTITY: 'entity',
  MEMBER: 'member'
});

// Roles a member can have (units are always Individual, entities have none)
export const MEMBER_ROLES = Object.freeze([PersonRole.ADMIN, PersonRole.CONTRIBUTOR]);

export const isMemberRole = (role) => MEMBER_ROLES.includes(role);

const unitIdOf = (person) => String(person?.obligatorIdentification ?? person?.obligator_identification ?? '').trim();

export function personCategoryOf(person) {
  if (unitIdOf(person)) return PersonCategory.UNIT;
  // Members are typed as such (a stored person without role reads as contributor, so the role alone is not enough)
  if (person?.type === PersonType.MEMBER || person?.role === PersonRole.ADMIN) return PersonCategory.MEMBER;
  return PersonCategory.ENTITY;
}

/**
 * The fields a condominium person must have for its category (role / type / unit), applied on every save:
 * units are Individual and never members, members are Administrator or Collaborator without a unit,
 * entities have no role.
 */
export function normalizeCondominiumPerson(person) {
  const category = personCategoryOf(person);
  if (category === PersonCategory.UNIT) {
    return { ...person, role: PersonRole.INDIVIDUAL, type: person.type === PersonType.MEMBER ? PersonType.PERSON : (person.type || PersonType.PERSON) };
  }
  if (category === PersonCategory.MEMBER) {
    return { ...person, type: PersonType.MEMBER, obligatorIdentification: null, role: isMemberRole(person.role) ? person.role : PersonRole.CONTRIBUTOR };
  }
  return { ...person, role: null, type: person.type === PersonType.MEMBER ? PersonType.PERSON : (person.type || PersonType.PERSON) };
}

// Access to a condominium when an account has several records (e.g. administrator and owner of a unit): the
// highest role wins
const ROLE_RANK = Object.freeze({ [PersonRole.ADMIN]: 3, [PersonRole.CONTRIBUTOR]: 2, [PersonRole.INDIVIDUAL]: 1 });
export const roleRank = (role) => ROLE_RANK[role] || 0;
