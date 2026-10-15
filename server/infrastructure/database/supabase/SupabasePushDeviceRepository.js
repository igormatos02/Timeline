import { supabase } from './supabaseClient.js';
import { PushPlatform } from '../../../../shared/enums/index.js';

const TABLE = 'push_devices';

const toDevice = (row) => ({
  id: row.id,
  userId: row.user_id,
  token: row.token,
  platform: row.platform,
  language: row.language,
  notifyPosts: Boolean(row.notify_posts),
  notifyReminders: Boolean(row.notify_reminders),
  updatedAt: row.updated_at
});

/** Phones registered for push notifications (table 'push_devices', migration 0013). */
export class SupabasePushDeviceRepository {
  // A token belongs to one phone: registering it again (other user, other preferences) replaces the row
  async upsert({ userId, token, platform = PushPlatform.ANDROID, language = 'pt', notifyPosts = true, notifyReminders = true }) {
    const { data, error } = await supabase.from(TABLE).upsert({
      user_id: userId,
      token,
      platform,
      language,
      notify_posts: Boolean(notifyPosts),
      notify_reminders: Boolean(notifyReminders),
      updated_at: new Date().toISOString()
    }, { onConflict: 'token' }).select().single();
    if (error) throw new Error(`Supabase upsert [${TABLE}]: ${error.message}`);
    return toDevice(data);
  }

  async deleteByToken(token, userId = null) {
    let query = supabase.from(TABLE).delete().eq('token', token);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw new Error(`Supabase delete [${TABLE}]: ${error.message}`);
  }

  async listByUserIds(userIds = []) {
    if (!userIds.length) return [];
    const { data, error } = await supabase.from(TABLE).select('*').in('user_id', userIds);
    if (error) throw new Error(`Supabase list [${TABLE}]: ${error.message}`);
    return (data || []).map(toDevice);
  }
}

export const pushDeviceRepository = new SupabasePushDeviceRepository();
