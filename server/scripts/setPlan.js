// License tool (alpha, before billing): sets an account's license in a product.
// Usage: npm run plan:set -- <email> <condoflow|myfinance> <free|basic|professional|manager> [YYYY-MM-DD | none] [condominiums]
// The date is when the license ends (after it the account works as Free); "none" or no date = no end.
// condominiums = how many condominiums it covers (default: the plan's).
import { planService } from '../application/services/PlanService.js';
import { userRepository } from '../infrastructure/database/supabase/SupabaseUserRepository.js';
import { PlanId } from '../../shared/config/plans.js';
import { PRODUCTS } from '../../shared/config/products.js';

const [email, productId, plan, until, condominiums] = process.argv.slice(2);
const usage = `Usage: npm run plan:set -- <email> <${Object.keys(PRODUCTS).join('|')}> <${Object.values(PlanId).join('|')}> [YYYY-MM-DD | none] [condominiums]`;
if (!email || !PRODUCTS[productId] || !Object.values(PlanId).includes(plan)) {
  console.error(usage);
  process.exit(1);
}
if (until && until !== 'none' && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
  console.error('The end date must be YYYY-MM-DD (or "none").');
  process.exit(1);
}
if (condominiums && !(Number(condominiums) > 0)) {
  console.error('condominiums must be a positive number.');
  process.exit(1);
}
const user = await userRepository.findByEmail(email);
if (!user) {
  console.error(`No account with the e-mail ${email}.`);
  process.exit(1);
}

await planService.setLicense(user.id, productId, {
  planId: plan,
  condominiums: condominiums ? Number(condominiums) : null,
  expiresAt: until && until !== 'none' ? `${until}T23:59:59.000Z` : null
});
console.log(JSON.stringify(await planService.getAccountLicense(user.id, productId), (key, value) => (value === Infinity ? null : value), 2));
process.exit(0);
