// License tool (alpha, before billing): sets the CondoFlow plan of a condominium.
// Usage: npm run plan:set -- <timeboardId> <free|basic|professional|manager> [YYYY-MM-DD | none]
// The date is when the plan ends (after it the condominium works as Free); "none" or no date = no end.
import { timeboardService } from '../application/services/TimeboardService.js';
import { planService } from '../application/services/PlanService.js';
import { PlanId } from '../../shared/config/plans.js';

const [timeboardId, plan, until] = process.argv.slice(2);
if (!timeboardId || !Object.values(PlanId).includes(plan)) {
  console.error(`Usage: npm run plan:set -- <timeboardId> <${Object.values(PlanId).join('|')}> [YYYY-MM-DD | none]`);
  process.exit(1);
}
if (until && until !== 'none' && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
  console.error('The end date must be YYYY-MM-DD (or "none").');
  process.exit(1);
}
const planExpiresAt = until && until !== 'none' ? `${until}T23:59:59.000Z` : null;

await timeboardService.setPlan(timeboardId, { plan, planExpiresAt });
const info = await planService.getPlanInfo(timeboardId);
console.log(JSON.stringify({ timeboardId, planId: info?.planId, effectivePlanId: info?.effectivePlanId, expiresAt: info?.expiresAt, usage: info?.usage }, null, 2));
process.exit(0);
