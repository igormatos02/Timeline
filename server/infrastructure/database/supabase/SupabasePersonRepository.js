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
    timeboardId: row.timeboard_id || row.timeboardId,
    type: row.type || PersonType.PERSON,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    taxId: row.tax_id || row.taxId || '',
    role: row.role || PersonRole.CONTRIBUTOR,
    userId: row.user_id || row.userId || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  });
}

function entityToRow(data) {
  const row = {};
  if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
  if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
  if (data.type !== undefined) row.type = data.type;
  if (data.name !== undefined) row.name = data.name;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.taxId !== undefined) row.tax_id = data.taxId;
  if (data.tax_id !== undefined) row.tax_id = data.tax_id;
  if (data.role !== undefined) row.role = data.role;
  if (data.userId !== undefined) row.user_id = data.userId;
  if (data.user_id !== undefined) row.user_id = data.user_id;
  return row;
}

export class SupabasePersonRepository extends IRepository {
  async getByTimeboardId(timeboardId) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn(`[SupabasePersonRepository] getByTimeboardId fallback: ${error.message}`);
        const mem = Array.from(inMemoryPersons.values()).filter(
          (p) => p.timeboard_id === timeboardId || p.timeboardId === timeboardId
        );
        return mem.map(rowToEntity);
      }
      return (data || []).map(rowToEntity);
    } catch (err) {
      console.warn(`[SupabasePersonRepository] getByTimeboardId catch fallback: ${err.message}`);
      const mem = Array.from(inMemoryPersons.values()).filter(
        (p) => p.timeboard_id === timeboardId || p.timeboardId === timeboardId
      );
      return mem.map(rowToEntity);
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

  async create(data) {
    const row = entityToRow(data);
    try {
      const { data: created, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      if (error) {
        console.warn(`[SupabasePersonRepository] create fallback: ${error.message}`);
        const newId = data.id || `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const memRow = {
          id: newId,
          ...row,
          timeboard_id: row.timeboard_id || data.timeboardId || data.timeboard_id,
          timeboardId: row.timeboard_id || data.timeboardId || data.timeboard_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
        timeboardId: row.timeboard_id || data.timeboardId || data.timeboard_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryPersons.set(newId, memRow);
      return rowToEntity(memRow);
    }
  }

  async update(id, updates) {
    const row = entityToRow(updates);
    row.updated_at = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update(row)
        .eq('id', id)
        .select()
        .single();

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

