import { supabase } from './supabaseClient.js';

const TABLE = 'product_licenses';

const rowToEntity = (row) => ({
  id: row.id,
  userId: row.user_id,
  product: row.product,
  planId: row.plan,
  condominiums: row.condominiums ?? null,
  expiresAt: row.expires_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Before migration 0014 the table does not exist: reads answer "unknown" (undefined) so the plans keep the legacy rules
const isMissingTable = (error) => /product_licenses|relation|schema cache/i.test(error?.message || '') || error?.code === '42P01' || error?.code === 'PGRST205';

/** Licenses of an account per product (product_licenses). */
export class SupabaseLicenseRepository {
  /** The account's license in a product: null when it has none, undefined when the table does not exist yet. */
  async findByUserAndProduct(userId, product) {
    if (!userId) return null;
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).eq('product', product).maybeSingle();
    if (error) {
      if (isMissingTable(error)) return undefined;
      throw new Error(`Supabase findByUserAndProduct [${TABLE}]: ${error.message}`);
    }
    return data ? rowToEntity(data) : null;
  }

  /** Creates or replaces the account's license in a product. */
  async upsert({ userId, product, planId, condominiums = null, expiresAt = null }) {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, product, plan: planId, condominiums, expires_at: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'user_id,product' })
      .select()
      .single();
    if (error) throw new Error(`Supabase upsert [${TABLE}]: ${error.message}`);
    return rowToEntity(data);
  }

  /** Creates the license only when the account has none in the product (returns it, or null when one exists). */
  async createIfMissing(license) {
    const existing = await this.findByUserAndProduct(license.userId, license.product);
    if (existing !== null) return null;
    return this.upsert(license);
  }
}

export const licenseRepository = new SupabaseLicenseRepository();
