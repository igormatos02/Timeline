import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { Person } from '../../domain/entities/Person.js';

export class PersonService {
  async getPersonsByTimeboard(timeboardId) {
    if (!timeboardId) return [];
    const persons = await personRepository.getByTimeboardId(timeboardId);

    // Auto-link any persons whose email matches a registered user in `users` table
    for (const p of persons) {
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
    return await personRepository.create(data);
  }

  async updatePerson(id, updates) {
    return await personRepository.update(id, updates);
  }

  async deletePerson(id) {
    return await personRepository.delete(id);
  }
}

export const personService = new PersonService();
