import { supabase } from './supabaseClient.js';
import { TimeboardInvitation } from '../../../domain/entities/TimeboardInvitation.js';
import { InvitationStatus } from '../../../domain/enums/index.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';

const TABLE = 'timeboard_invitations';

function rowToEntity(row) {
  if (!row) return null;
  return new TimeboardInvitation({
    id: row.id,
    timeboardId: row.timeboard_id || row.timeboardId,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by || row.invitedBy,
    expiresAt: row.expires_at || row.expiresAt,
    acceptedAt: row.accepted_at || row.acceptedAt,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  });
}

function entityToRow(data) {
  const row = {};
  if (data.id !== undefined) row.id = data.id;
  if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
  if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
  if (data.email !== undefined) row.email = data.email.toLowerCase().trim();
  if (data.role !== undefined) row.role = data.role;
  if (data.status !== undefined) row.status = data.status;
  if (data.invitedBy !== undefined) row.invited_by = data.invitedBy;
  if (data.invited_by !== undefined) row.invited_by = data.invited_by;
  if (data.expiresAt !== undefined) row.expires_at = data.expiresAt;
  if (data.expires_at !== undefined) row.expires_at = data.expires_at;
  if (data.acceptedAt !== undefined) row.accepted_at = data.acceptedAt;
  if (data.accepted_at !== undefined) row.accepted_at = data.accepted_at;
  return row;
}

export class SupabaseTimeboardInvitationRepository extends IRepository {
  async getById(id) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`[SupabaseTimeboardInvitationRepository] getById warning: ${error.message}`);
        return null;
      }
      return rowToEntity(data);
    } catch (err) {
      console.warn(`[SupabaseTimeboardInvitationRepository] getById catch: ${err.message}`);
      return null;
    }
  }

  async getByTimeboardId(timeboardId) {
    if (!timeboardId) return [];
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`[SupabaseTimeboardInvitationRepository] getByTimeboardId warning: ${error.message}`);
        return [];
      }
      return (data || []).map(rowToEntity);
    } catch (err) {
      console.warn(`[SupabaseTimeboardInvitationRepository] getByTimeboardId catch: ${err.message}`);
      return [];
    }
  }

  async findPendingByTimeboardAndEmail(timeboardId, email) {
    if (!timeboardId || !email) return null;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('timeboard_id', timeboardId)
        .ilike('email', cleanEmail)
        .eq('status', InvitationStatus.PENDING)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn(`[SupabaseTimeboardInvitationRepository] findPending error: ${error.message}`);
        return null;
      }
      return rowToEntity(data);
    } catch (err) {
      console.warn(`[SupabaseTimeboardInvitationRepository] findPending catch: ${err.message}`);
      return null;
    }
  }

  async create(data) {
    TimeboardInvitation.validate(data);
    const row = entityToRow({
      ...data,
      status: data.status || InvitationStatus.PENDING
    });
    row.created_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();

    try {
      const { data: created, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToEntity(created);
    } catch (err) {
      console.error(`[SupabaseTimeboardInvitationRepository] create failed: ${err.message}`);
      throw err;
    }
  }

  async update(id, data) {
    if (!id) throw new Error('id is required for update');
    const row = entityToRow(data);
    row.updated_at = new Date().toISOString();

    try {
      const { data: updated, error } = await supabase
        .from(TABLE)
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToEntity(updated);
    } catch (err) {
      console.error(`[SupabaseTimeboardInvitationRepository] update failed: ${err.message}`);
      throw err;
    }
  }

  async markAsAccepted(timeboardId, email) {
    if (!timeboardId || !email) return null;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update({
          status: InvitationStatus.ACCEPTED,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('timeboard_id', timeboardId)
        .ilike('email', cleanEmail)
        .eq('status', InvitationStatus.PENDING)
        .select();

      if (error) {
        console.warn(`[SupabaseTimeboardInvitationRepository] markAsAccepted warning: ${error.message}`);
        return null;
      }
      return (data || []).map(rowToEntity);
    } catch (err) {
      console.warn(`[SupabaseTimeboardInvitationRepository] markAsAccepted catch: ${err.message}`);
      return null;
    }
  }

  async revoke(id) {
    if (!id) return false;
    return this.update(id, { status: InvitationStatus.CANCELLED });
  }

  async revokeByEmail(timeboardId, email) {
    if (!timeboardId || !email) return false;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update({
          status: InvitationStatus.CANCELLED,
          updated_at: new Date().toISOString()
        })
        .eq('timeboard_id', timeboardId)
        .ilike('email', cleanEmail)
        .eq('status', InvitationStatus.PENDING)
        .select();

      if (error) {
        console.warn(`[SupabaseTimeboardInvitationRepository] revokeByEmail warning: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`[SupabaseTimeboardInvitationRepository] revokeByEmail catch: ${err.message}`);
      return false;
    }
  }

  async delete(id) {
    if (!id) return false;
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    } catch (err) {
      console.error(`[SupabaseTimeboardInvitationRepository] delete failed: ${err.message}`);
      throw err;
    }
  }
}

export const timeboardInvitationRepository = new SupabaseTimeboardInvitationRepository();
