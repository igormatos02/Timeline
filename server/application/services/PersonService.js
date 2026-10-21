import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { Person } from '../../domain/entities/Person.js';
import { planService } from './PlanService.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { PersonCategory, TimeboardType, normalizeCondominiumPerson, personCategoryOf } from '../../../shared/enums/index.js';

// Condominiums keep units, entities and members apart (shared/enums/PersonCategory.js)
const isCondominium = async (timeboardId) => (await timeboardRepository.getById(timeboardId))?.type === TimeboardType.CONDOFLOW;

export class PersonService {
  async getPersonsByTimeboard(timeboardId) {
    if (!timeboardId) return [];
    const persons = await personRepository.getByTimeboardId(timeboardId);
    const condominium = await isCondominium(timeboardId);

    // Auto-link any persons whose email matches a registered user in `users` table (never a condominium's
    // entities: they are only a reference and have no access)
    for (const p of persons) {
      if (condominium && personCategoryOf(p) === PersonCategory.ENTITY) continue;
      if (p.email && !p.userId) {
        try {
          const matchingUser = await userRepository.findByEmail(p.email);
          if (matchingUser && matchingUser.id) {
            p.userId = matchingUser.id;
            await personRepository.update(p.id, { userId: matchingUser.id });
          }
        } catch (e) {}
      }
    }

    return persons;
  }

  async getPersonById(id) {
    if (!id) return null;
    return await personRepository.getById(id);
  }

  async createPerson(data) {
    Person.validate(data);
    const timeboardId = data.timeboardId || data.timeboard_id;
    const person = (await isCondominium(timeboardId)) ? normalizeCondominiumPerson(data) : data;
    // The condominium's plan limits its units (frações) and administrators
    await planService.assertPersonFits(timeboardId, person);
    return await personRepository.create(person);
  }

  async updatePerson(id, updates) {
    const previous = await personRepository.getById(id);
    if (!previous) return await personRepository.update(id, updates);
    // In a condominium the record keeps the fields of its category (e.g. a unit is always Individual)
    const merged = { ...previous, ...updates };
    const next = (await isCondominium(previous.timeboardId)) ? normalizeCondominiumPerson(merged) : merged;
    await planService.assertPersonFits(previous.timeboardId, next, previous);
    const { role, type, obligatorIdentification } = next;
    return await personRepository.update(id, { ...updates, role, type, obligatorIdentification });
  }

  async deletePerson(id) {
    return await personRepository.delete(id);
  }
}

export const personService = new PersonService();
