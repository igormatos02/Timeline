import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { Person } from '../../domain/entities/Person.js';

export class PersonService {
  async getPersonsByTimeboard(timeboardId) {
    if (!timeboardId) return [];
    return await personRepository.getByTimeboardId(timeboardId);
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
