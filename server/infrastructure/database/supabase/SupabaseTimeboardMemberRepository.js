import { supabase } from './supabaseClient.js';
import { TimeboardMember } from '../../../domain/entities/TimeboardMember.js';
import { Timeboard } from '../../../domain/entities/Timeboard.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';

const TABLE = 'timeboard_members';

function rowToEntity(row) {
  if (!row) return null;
  return new TimeboardMember({
    id: row.id,
    timeboardId: row.timeboard_id || row.timeboardId,
    userId: row.user_id || row.userId,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  });
}

function entityToRow(data) {
  const row = {};
  if (data.id !== undefined) row.id = data.id;
  if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
  if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
  if (data.userId !== undefined) row.user_id = data.userId;
  if (data.user_id !== undefined) row.user_id = data.user_id;
  return row;
}

export class SupabaseTimeboardMemberRepository extends IRepository {
  async getByUserId(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.warn(`[SupabaseTimeboardMemberRepository] getByUserId warning: ${error.message}`);
        return [];
      }
      return (data || []).map(rowToEntity);
    } catch (err) {
      console.warn(`[SupabaseTimeboardMemberRepository] getByUserId catch: ${err.message}`);
      return [];
    }
  }

  async getByTimeboardId(timeboardId) {
    if (!timeboardId) return [];
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId);

      if (error) {
        console.warn(`[SupabaseTimeboardMemberRepository] getByTimeboardId warning: ${error.message}`);
        return [];
      }
      return (data || []).map(rowToEntity);
    } catch (err) {
      console.warn(`[SupabaseTimeboardMemberRepository] getByTimeboardId catch: ${err.message}`);
      return [];
    }
  }

  async addMember(timeboardId, userId) {
    try {
      // Check if membership already exists
      const { data: existing, error: findError } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!findError && existing) {
        return rowToEntity(existing);
      }

      const row = entityToRow({ timeboardId, userId });
      const { data, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToEntity(data);
    } catch (err) {
      console.error(`[SupabaseTimeboardMemberRepository] addMember failed: ${err.message}`);
      throw err;
    }
  }

  async removeMember(timeboardId, userId) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('timeboard_id', timeboardId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
      return true;
    } catch (err) {
      console.error(`[SupabaseTimeboardMemberRepository] removeMember failed: ${err.message}`);
      throw err;
    }
  }

  // Fetch all timeboards shared with a given user
  async getSharedTimeboardsForUser(userId) {
    if (!userId) return [];
    try {
      // 1. Get member rows for this user
      const { data: memberRows, error: memberErr } = await supabase
        .from(TABLE)
        .select('timeboard_id')
        .eq('user_id', userId);

      if (memberErr || !memberRows || memberRows.length === 0) {
        return [];
      }

      const timeboardIds = memberRows.map(r => r.timeboard_id).filter(Boolean);
      if (timeboardIds.length === 0) return [];

      // 2. Fetch the corresponding timeboards
      const { data: timeboards, error: tbErr } = await supabase
        .from('timeboards')
        .select('*')
        .in('id', timeboardIds);

      if (tbErr) {
        console.warn(`[SupabaseTimeboardMemberRepository] getSharedTimeboardsForUser fetch error: ${tbErr.message}`);
        return [];
      }

      return (timeboards || []).map(row => new Timeboard({
        id: row.id,
        name: row.name,
        description: row.description,
        tenant: row.tenant,
        tenantId: row.tenant_id,
        userId: row.user_id || row.owner_id,
        ownerId: row.owner_id || row.user_id,
        type: row.type,
        currency: row.Currency || row.currency || 'EUR',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (err) {
      console.warn(`[SupabaseTimeboardMemberRepository] getSharedTimeboardsForUser catch: ${err.message}`);
      return [];
    }
  }
}

export const timeboardMemberRepository = new SupabaseTimeboardMemberRepository();
