// Gives the receipts already paid in every condominium their receipt code and, when they have none, their receipt
// number (next number of the timeline, oldest payment first). Existing numbers are kept.
// Usage: node --env-file=server/.env server/scripts/backfillReceiptCodes.js [--apply]   (default: dry run)
import { timeboardRepository } from '../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { eventService } from '../application/services/EventService.js';
import { receiptCodeService } from '../application/services/ReceiptCodeService.js';
import { TimeboardType, isPositiveStatus } from '../../shared/enums/index.js';

const apply = process.argv.includes('--apply');
const today = new Date().toISOString().substring(0, 10);
const condominiums = await timeboardRepository.getAll((tb) => tb.type === TimeboardType.CONDOFLOW);
let total = 0;
let withoutNumber = 0;
for (const timeboard of condominiums) {
  const events = await eventService.getAllEvents({ timeboardId: timeboard.id, endDate: today });
  const paid = (events || [])
    .filter((ev) => (ev.obligationPersonId || ev.obligation_person_id) && isPositiveStatus(ev.status) && ev.date <= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const missing = paid.filter((ev) => !(Number(ev.contYear ?? ev.cont_year) > 0)).length;
  total += paid.length;
  withoutNumber += missing;
  console.log(`${timeboard.name}: ${paid.length} paid receipt(s), ${missing} without number`);
  if (!apply) continue;
  for (const ev of paid) {
    const result = await receiptCodeService.codeForOccurrence({ id: ev.id, date: ev.date });
    if (!result?.code) console.warn(`  no code for ${ev.id}`);
  }
}
console.log(`${total} receipt(s), ${withoutNumber} without number${apply ? ' — codes and numbers given' : ' (dry run: add --apply)'}`);
process.exit(0);
