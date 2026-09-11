import { supabase } from './supabaseClient.js';

/**
 * Service to execute lightweight queries against Supabase to keep the project active
 * and verify database connectivity.
 */
export async function pingSupabase() {
  const startTime = Date.now();
  try {
    // Lightweight count / head query to timeboards table to ping Postgres without transferring full data
    const { count, error } = await supabase
      .from('timeboards')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      console.warn('[SupabasePing] Ping query warning:', error.message);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        latencyMs,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      status: 'healthy',
      totalTimeboardsCount: count ?? 0,
      latencyMs,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error('[SupabasePing] Failed to ping Supabase:', err.message);
    return {
      success: false,
      status: 'error',
      error: err.message,
      latencyMs,
      timestamp: new Date().toISOString()
    };
  }
}
