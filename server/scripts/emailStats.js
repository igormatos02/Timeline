// Owners' notices e-mail usage (platform-wide): sent today / this month and waiting in the outbox.
// Usage: npm run email:stats
import { emailOutboxRepository } from '../infrastructure/database/supabase/SupabaseEmailOutboxRepository.js';

const startOfToday = new Date();
startOfToday.setUTCHours(0, 0, 0, 0);
const startOfMonth = new Date(Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth(), 1));
console.log(JSON.stringify({
  sentToday: await emailOutboxRepository.countSentSince(startOfToday.toISOString()),
  sentThisMonth: await emailOutboxRepository.countSentSince(startOfMonth.toISOString()),
  pending: await emailOutboxRepository.countPending(),
  dailyBudget: Number(process.env.EMAIL_DAILY_BUDGET) || 250
}, null, 2));
process.exit(0);
