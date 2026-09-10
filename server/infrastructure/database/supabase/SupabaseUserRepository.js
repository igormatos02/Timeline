import { supabase } from './supabaseClient.js';
import { User } from '../../../domain/entities/User.js';

const TABLE = 'users';

function rowToEntity(row) {
  if (!row) return null;
  return new User({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    googleId: row.google_id || row.googleId,
    avatarUrl: row.avatar_url || row.avatarUrl,
    createdAt: row.created_at || row.createdAt
  });
}

function entityToRow(data) {
  const row = {};
  if (data.id !== undefined) row.id = data.id;
  if (data.name !== undefined) row.name = data.name;
  if (data.email !== undefined) row.email = data.email ? data.email.toLowerCase().trim() : null;
  if (data.password !== undefined && data.password !== null) row.password = data.password;
  if (data.googleId !== undefined) row.google_id = data.googleId;
  if (data.google_id !== undefined) row.google_id = data.google_id;
  if (data.avatarUrl !== undefined && data.avatarUrl !== null) row.avatar_url = data.avatarUrl;
  if (data.avatar_url !== undefined && data.avatar_url !== null) row.avatar_url = data.avatar_url;
  return row;
}

export class SupabaseUserRepository {
  async findByEmail(email) {
    if (!email) return null;
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.warn(`[SupabaseUserRepository] findByEmail warning: ${error.message}`);
        return null;
      }
      return rowToEntity(data);
    } catch (err) {
      console.warn(`[SupabaseUserRepository] findByEmail catch: ${err.message}`);
      return null;
    }
  }

  async findByGoogleId(googleId) {
    if (!googleId) return null;
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('google_id', googleId)
        .maybeSingle();

      if (error) {
        console.warn(`[SupabaseUserRepository] findByGoogleId warning: ${error.message}`);
        return null;
      }
      return rowToEntity(data);
    } catch (err) {
      console.warn(`[SupabaseUserRepository] findByGoogleId catch: ${err.message}`);
      return null;
    }
  }

  async findById(id) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return null;
      return rowToEntity(data);
    } catch {
      return null;
    }
  }

  async getById(id) {
    return this.findById(id);
  }

  async create(data) {
    let row = entityToRow(data);
    try {
      const { data: created, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      if (error) {
        console.warn(`[SupabaseUserRepository] create attempt 1 error: ${error.message}`);
        
        // Remove columns that might not exist in the schema yet (like avatar_url or password)
        const safeRow = { ...row };
        if (error.message && error.message.includes('avatar_url')) {
          delete safeRow.avatar_url;
        }
        if (error.message && error.message.includes('password')) {
          delete safeRow.password;
        }

        const { data: fallbackCreated, error: fallbackError } = await supabase
          .from(TABLE)
          .insert(safeRow)
          .select()
          .single();

        if (fallbackError) {
          throw new Error(fallbackError.message);
        }
        return rowToEntity({ ...fallbackCreated, ...data });
      }
      return rowToEntity(created);
    } catch (err) {
      console.error(`[SupabaseUserRepository] create failed: ${err.message}`);
      throw err;
    }
  }

  async update(id, updates) {
    const row = entityToRow(updates);

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const safeRow = { ...row };
        if (error.message && error.message.includes('avatar_url')) delete safeRow.avatar_url;

        const { data: fallbackData, error: fallbackError } = await supabase
          .from(TABLE)
          .update(safeRow)
          .eq('id', id)
          .select()
          .single();

        if (fallbackError) throw new Error(fallbackError.message);
        return rowToEntity(fallbackData);
      }
      return rowToEntity(data);
    } catch (err) {
      console.error(`[SupabaseUserRepository] update failed: ${err.message}`);
      throw err;
    }
  }
}

export const userRepository = new SupabaseUserRepository();
