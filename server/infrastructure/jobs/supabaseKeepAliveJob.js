import { pingSupabase } from '../database/supabase/supabaseHealthService.js';

let keepAliveIntervalId = null;

/**
 * Starts the internal keep-alive cron / interval for long-running Node.js processes.
 * Runs once every 24 hours (or configured hours via env SUPABASE_PING_INTERVAL_HOURS).
 */
export function startSupabaseKeepAliveJob(options = {}) {
  const intervalHours = Number(process.env.SUPABASE_PING_INTERVAL_HOURS) || options.intervalHours || 24;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[SupabaseKeepAlive] Initializing background keep-alive job (runs every ${intervalHours}h)...`);

  // Run initial lightweight ping shortly after boot (5 seconds delay)
  setTimeout(async () => {
    try {
      const res = await pingSupabase();
      if (res.success) {
        console.log(`[SupabaseKeepAlive] Initial ping successful (${res.latencyMs}ms) at ${res.timestamp}`);
      } else {
        console.warn(`[SupabaseKeepAlive] Initial ping returned unhealthy status:`, res.error);
      }
    } catch (e) {
      console.error('[SupabaseKeepAlive] Initial ping failed:', e.message);
    }
  }, 5000);

  // Set recurring daily interval
  if (keepAliveIntervalId) {
    clearInterval(keepAliveIntervalId);
  }

  keepAliveIntervalId = setInterval(async () => {
    try {
      const res = await pingSupabase();
      if (res.success) {
        console.log(`[SupabaseKeepAlive] Daily ping successful (${res.latencyMs}ms) at ${res.timestamp}`);
      } else {
        console.warn(`[SupabaseKeepAlive] Daily ping warning:`, res.error);
      }
    } catch (err) {
      console.error('[SupabaseKeepAlive] Daily ping failed:', err.message);
    }
  }, intervalMs);

  // Prevent interval from blocking Node process graceful exit
  if (keepAliveIntervalId.unref) {
    keepAliveIntervalId.unref();
  }

  return keepAliveIntervalId;
}

export function stopSupabaseKeepAliveJob() {
  if (keepAliveIntervalId) {
    clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = null;
    console.log('[SupabaseKeepAlive] Job stopped.');
  }
}
