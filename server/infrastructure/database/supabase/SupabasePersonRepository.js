import { supabase } from './supabaseClient.js';
import { Person } from '../../../domain/entities/Person.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';
import { PersonType, PersonRole } from '../../../../shared/enums/index.js';

const TABLE = 'persons';

// In-memory fallback if the Supabase table hasn't been created yet
const inMemoryPersons = new Map();

function rowToEntity(row) {
  if (!row) return null;
  return new Person({
    id: row.id,
    timeboardId: row.timeboard_id,
    type: row.type || PersonType.PERSON,
    personName: row.person_name || '',
    obligatorIdentification: row.obligator_identification || '',
    email: row.email || '',
    phone: row.phone || '',
    birthDate: row.birth_date || null,
    observation: row.observation || '',
    role: row.role || PersonRole.CONTRIBUTOR,
    userId: row.user_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function entityToRow(data) {
  const row = {};
  if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
  if (data.type !== undefined) row.type = data.type;
  if (data.personName !== undefined) row.person_name = data.personName;
  if (data.obligatorIdentification !== undefined) row.obligator_identification = data.obligatorIdentification;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.birthDate !== undefined) row.birth_date = data.birthDate;
  if (data.observation !== undefined) row.observation = data.observation;
  if (data.role !== undefined) row.role = data.role;
  if (data.userId !== undefined) row.user_id = data.userId;
  return row;
}

export class SupabasePersonRepository extends IRepository {
  async getByTimeboardId(timeboardId) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId)
        .order('type', { ascending: true });

      if (error) {
        console.warn(`[SupabasePersonRepository] getByTimeboardId fallback: ${error.message}`);
        const mem = Array.from(inMemoryPersons.values()).filter(
          (p) => p.timeboard_id === timeboardId || p.timeboardId === timeboardId
        );
        return mem.map(rowToEntity).sort((a, b) => {
          const typeComp = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
          if (typeComp !== 0) return typeComp;
          return (a.personName || '').localeCompare(b.personName || '', undefined, { sensitivity: 'base' });
        });
      }
      return (data || []).map(rowToEntity).sort((a, b) => {
        const typeComp = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
        if (typeComp !== 0) return typeComp;
        return (a.personName || '').localeCompare(b.personName || '', undefined, { sensitivity: 'base' });
      });
    } catch (err) {
      console.warn(`[SupabasePersonRepository] getByTimeboardId catch fallback: ${err.message}`);
      const mem = Array.from(inMemoryPersons.values()).filter(
        (p) => p.timeboard_id === timeboardId || p.timeboardId === timeboardId
      );
      return mem.map(rowToEntity).sort((a, b) => {
        const typeComp = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
        if (typeComp !== 0) return typeComp;
        return (a.personName || '').localeCompare(b.personName || '', undefined, { sensitivity: 'base' });
      });
    }
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return inMemoryPersons.get(id) ? rowToEntity(inMemoryPersons.get(id)) : null;
      }
      return rowToEntity(data);
    } catch {
      return inMemoryPersons.get(id) ? rowToEntity(inMemoryPersons.get(id)) : null;
    }
  }

  async findByEmail(email) {
    if (!email) return [];
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .ilike('email', cleanEmail);
      if (error) return [];
      return (data || []).map(rowToEntity);
    } catch {
      return [];
    }
  }

  async linkUserByEmail(email, userId) {
    if (!email || !userId) return false;
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { error } = await supabase
        .from(TABLE)
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .ilike('email', cleanEmail);
      if (error) {
        console.warn(`[SupabasePersonRepository] linkUserByEmail warning: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`[SupabasePersonRepository] linkUserByEmail catch: ${err.message}`);
      return false;
    }
  }

  async create(data) {
    const row = entityToRow(data);
    row.created_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();

    try {
      // First attempt with full row
      let { data: created, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      // If a new column does not exist yet in Supabase schema, remove it and retry
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        const safeRow = { ...row };
        if (error.message?.includes('person_name')) delete safeRow.person_name;
        if (error.message?.includes('name') && safeRow.person_name) delete safeRow.name;
        if (error.message?.includes('obligator_identification')) delete safeRow.obligator_identification;
        if (error.message?.includes('tax_id') && safeRow.obligator_identification) delete safeRow.tax_id;
        if (error.message?.includes('birth_date')) delete safeRow.birth_date;
        if (error.message?.includes('observation')) delete safeRow.observation;

        const retry = await supabase.from(TABLE).insert(safeRow).select().single();
        created = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn(`[SupabasePersonRepository] create fallback: ${error.message}`);
        const newId = data.id || `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const memRow = {
          id: newId,
          ...row,
          timeboard_id: row.timeboard_id || data.timeboardId || data.timeboard_id,
          timeboardId: row.timeboard_id || data.timeboardId || data.timeboard_id
        };
        inMemoryPersons.set(newId, memRow);
        return rowToEntity(memRow);
      }
      return rowToEntity(created);
    } catch (err) {
      console.warn(`[SupabasePersonRepository] create catch fallback: ${err.message}`);
      const newId = data.id || `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const memRow = {
        id: newId,
        ...row,
        timeboard_id: row.timeboard_id || data.timeboardId || data.timeboard_id,
        timeboardId: row.timeboard_id || data.timeboardId || data.timeboard_id
      };
      inMemoryPersons.set(newId, memRow);
      return rowToEntity(memRow);
    }
  }

  async update(id, updates) {
    const row = entityToRow(updates);
    row.updated_at = new Date().toISOString();

    try {
      let { data, error } = await supabase
        .from(TABLE)
        .update(row)
        .eq('id', id)
        .select()
        .single();

      // If a new column does not exist yet in Supabase schema, remove it and retry
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        const safeRow = { ...row };
        if (error.message?.includes('person_name')) delete safeRow.person_name;
        if (error.message?.includes('name') && safeRow.person_name) delete safeRow.name;
        if (error.message?.includes('obligator_identification')) delete safeRow.obligator_identification;
        if (error.message?.includes('tax_id') && safeRow.obligator_identification) delete safeRow.tax_id;
        if (error.message?.includes('birth_date')) delete safeRow.birth_date;
        if (error.message?.includes('observation')) delete safeRow.observation;

        const retry = await supabase.from(TABLE).update(safeRow).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn(`[SupabasePersonRepository] update fallback: ${error.message}`);
        const existing = inMemoryPersons.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...row };
        inMemoryPersons.set(id, updated);
        return rowToEntity(updated);
      }
      return rowToEntity(data);
    } catch (err) {
      const existing = inMemoryPersons.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...row };
      inMemoryPersons.set(id, updated);
      return rowToEntity(updated);
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) {
        console.warn(`[SupabasePersonRepository] delete fallback: ${error.message}`);
      }
      inMemoryPersons.delete(id);
      return true;
    } catch {
      inMemoryPersons.delete(id);
      return true;
    }
  }
}

export const personRepository = new SupabasePersonRepository();
