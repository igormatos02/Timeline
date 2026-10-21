// Splits the people of every condominium into units, entities and members (shared/enums/PersonCategory.js).
// Usage: node --env-file=server/.env server/scripts/migrateCondominiumPeople.js [--apply]   (default: dry run)
// Rules agreed with the product owner (2026-10-21):
// - a record with a unit becomes an Individual unit; if it also had an admin / contributor role with an account,
//   a member record with that role and the same account is created (the person keeps managing)
// - an Individual without a unit but with an account becomes a Collaborator member
// - member records keep Administrator / Collaborator; the rest are entities (no role)
import { supabase } from '../infrastructure/database/supabase/supabaseClient.js';
import { PersonRole, PersonType, TimeboardType, isMemberRole } from '../../shared/enums/index.js';

const apply = process.argv.includes('--apply');
const { data: condos, error } = await supabase.from('timeboards').select('id,name').eq('type', TimeboardType.CONDOFLOW);
if (error) throw error;

const plan = [];
for (const condo of condos) {
  const { data: persons } = await supabase.from('persons').select('*').eq('timeboard_id', condo.id);
  for (const p of persons || []) {
    const hasUnit = Boolean(String(p.obligator_identification || '').trim());
    if (hasUnit) {
      const unitType = p.type === PersonType.MEMBER ? PersonType.PERSON : (p.type || PersonType.PERSON);
      if (p.role !== PersonRole.INDIVIDUAL || p.type !== unitType) {
        plan.push({ condo: condo.name, person: p.person_name, action: 'unit', update: { id: p.id, role: PersonRole.INDIVIDUAL, type: unitType } });
      }
      if (isMemberRole(p.role) && p.user_id) {
        const { data: account } = await supabase.from('users').select('name').eq('id', p.user_id).maybeSingle();
        plan.push({
          condo: condo.name,
          person: p.person_name,
          action: `member ${p.role} (same account)`,
          insert: { timeboard_id: condo.id, type: PersonType.MEMBER, role: p.role, person_name: account?.name || p.person_name, email: p.email, phone: p.phone, user_id: p.user_id }
        });
      }
    } else if (p.role === PersonRole.INDIVIDUAL && p.user_id) {
      plan.push({ condo: condo.name, person: p.person_name, action: 'member contributor', update: { id: p.id, role: PersonRole.CONTRIBUTOR, type: PersonType.MEMBER } });
    } else if (p.type === PersonType.MEMBER || p.role === PersonRole.ADMIN) {
      const role = isMemberRole(p.role) ? p.role : PersonRole.CONTRIBUTOR;
      if (p.role !== role || p.type !== PersonType.MEMBER) plan.push({ condo: condo.name, person: p.person_name, action: `member ${role}`, update: { id: p.id, role, type: PersonType.MEMBER } });
    } else if (p.role) {
      plan.push({ condo: condo.name, person: p.person_name, action: 'entity', update: { id: p.id, role: null } });
    }
  }
}

for (const step of plan) console.log(`${step.condo} | ${step.person} -> ${step.action}`);
console.log(`${plan.length} change(s)${apply ? '' : ' (dry run: add --apply to save)'}`);

if (apply) {
  for (const step of plan) {
    if (step.update) {
      const { id, ...fields } = step.update;
      const { error: updateError } = await supabase.from('persons').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
      if (updateError) throw updateError;
    }
    if (step.insert) {
      const { error: insertError } = await supabase.from('persons').insert({ ...step.insert, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (insertError) throw insertError;
    }
  }
  console.log('Applied.');
}
process.exit(0);
