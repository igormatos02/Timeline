/**
 * Converts the legacy pocket movements to the bank account model (v0.6):
 * a pocket only exchanges money with the current account (contribution / withdrawal); everything else
 * happens in the current account. Each legacy movement of a pocket that talks to the outside becomes the
 * same movement in the current account + a transfer between the current account and the pocket:
 *
 *   external / cash deposit into pocket A   -> deposit in the current account + contribution current -> A
 *   expense paid by pocket A                -> withdrawal A -> current + expense in the current account
 *   withdrawal from pocket A to the wallet  -> withdrawal A -> current + withdrawal in the current account
 *   transfer pocket A -> pocket B           -> withdrawal A -> current + contribution current -> B
 *
 * Balances do not change. Rows are copied as stored (every column kept); the new transfer gets the same
 * dates, versions and recurrence, and the monthly statuses of the original (effective -> completed),
 * without its receipt data (the receipt stays on the movement that talks to the outside).
 *
 *   node server/scripts/convertPocketMovements.js              dry run (reads only, prints the plan)
 *   node server/scripts/convertPocketMovements.js --apply      converts, writes a rollback file
 *   node server/scripts/convertPocketMovements.js --rollback <file>   undoes a conversion
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '../infrastructure/database/supabase/supabaseClient.js';
import { EventType, EventStatus, isPositiveStatus, isCancelledStatus, normalizeTimelineType, TimelineType } from '../../shared/enums/index.js';

const EVENTS = 'financial_events';
const STATUSES = 'financial_event_status';
const TRANSFER_EVENT_SUFFIX = '-pt';
const args = process.argv.slice(2);
const mode = args.includes('--apply') ? 'apply' : (args.includes('--rollback') ? 'rollback' : 'dry-run');

const fail = (message, error) => {
  console.error(message, error?.message || error || '');
  process.exit(1);
};

async function selectAll(table, build) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(supabase.from(table).select('*')).range(from, from + pageSize - 1);
    if (error) fail(`Reading ${table} failed:`, error);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

// Status of the new transfer for a month, from the original movement's status
const transferStatusOf = (status) => {
  if (isCancelledStatus(status) || status === EventStatus.DELETED) return status;
  return isPositiveStatus(status) ? EventStatus.COMPLETED : EventStatus.PENDING;
};

// What happens to a legacy row: the update of the original and the new transfer (null = already valid)
function planFor(row) {
  const pocketId = row.pocket_id;
  const targetId = row.target_pocket_id || null;
  const type = row.event_type;
  if (type === EventType.POCKET_TRANSFER) {
    if (!pocketId || !targetId) return null; // current <-> pocket: already valid
    return {
      kind: 'pocket_to_pocket',
      update: { target_pocket_id: null }, // A -> current account (withdrawal from A)
      transfer: { pocket_id: null, target_pocket_id: targetId } // current account -> B (contribution)
    };
  }
  if (!pocketId) return null;
  if (type === EventType.INVESTMENT || type === 'investments') {
    return { kind: 'deposit_into_pocket', update: { pocket_id: null }, transfer: { pocket_id: null, target_pocket_id: pocketId } };
  }
  if (type === EventType.POCKET_EXPENSE || type === EventType.POCKET_COST) {
    return { kind: 'expense_from_pocket', update: { pocket_id: null }, transfer: { pocket_id: pocketId, target_pocket_id: null } };
  }
  if (type === EventType.WITHDRAWAL) {
    return { kind: 'withdrawal_from_pocket', update: { pocket_id: null }, transfer: { pocket_id: pocketId, target_pocket_id: null } };
  }
  return { kind: `unhandled:${type}`, skip: true };
}

function transferRowFrom(row, plan, transferEventId) {
  const copy = { ...row };
  delete copy.created_at;
  delete copy.updated_at;
  // The receipt belongs to the movement that talks to the outside: never copied to the transfer
  ['cont_year', 'receipt_date', 'receipt_number'].forEach((column) => {
    if (column in copy) copy[column] = null;
  });
  if ('status' in copy && copy.status) copy.status = transferStatusOf(copy.status);
  return {
    ...copy,
    id: crypto.randomUUID(),
    event_id: transferEventId,
    event_type: EventType.POCKET_TRANSFER,
    installment_amount: Math.abs(Number(row.installment_amount || 0)),
    category: 'other',
    is_external: null,
    is_obligation: false,
    obligation_person_id: null,
    breakdown_items: null,
    pocket_id: plan.transfer.pocket_id,
    target_pocket_id: plan.transfer.target_pocket_id
  };
}

async function run() {
  if (mode === 'rollback') {
    const file = args[args.indexOf('--rollback') + 1];
    if (!file || !fs.existsSync(file)) fail('Rollback file not found:', file);
    const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const statusKey of backup.createdStatuses) {
      const { error } = await supabase.from(STATUSES).delete()
        .eq('year', statusKey.year).eq('month', statusKey.month).eq('event_id', statusKey.event_id);
      if (error) fail('Deleting a status failed:', error);
    }
    for (const id of backup.createdEventIds) {
      const { error } = await supabase.from(EVENTS).delete().eq('id', id);
      if (error) fail('Deleting a transfer failed:', error);
    }
    for (const original of backup.originals) {
      const { error } = await supabase.from(EVENTS).update({ pocket_id: original.pocket_id, target_pocket_id: original.target_pocket_id }).eq('id', original.id);
      if (error) fail('Restoring a movement failed:', error);
    }
    console.log(`Rolled back: ${backup.createdEventIds.length} transfers removed, ${backup.originals.length} movements restored.`);
    return;
  }

  // Movements of the bank account timelines that involve a pocket
  const timelines = await selectAll('timelines', (q) => q);
  const accountTimelineIds = new Set(timelines.filter((tl) => normalizeTimelineType(tl.type) === TimelineType.INVESTMENT).map((tl) => tl.id));
  const rows = (await selectAll(EVENTS, (q) => q.not('pocket_id', 'is', null)))
    .concat(await selectAll(EVENTS, (q) => q.is('pocket_id', null).not('target_pocket_id', 'is', null)))
    .filter((row) => accountTimelineIds.has(row.timeline_id));

  const planned = rows.map((row) => ({ row, plan: planFor(row) })).filter((entry) => entry.plan);
  const toConvert = planned.filter((entry) => !entry.plan.skip);
  const skipped = planned.filter((entry) => entry.plan.skip);
  const seriesIds = [...new Set(toConvert.map((entry) => entry.row.event_id))];
  const statuses = seriesIds.length ? await selectAll(STATUSES, (q) => q.in('event_id', seriesIds)) : [];

  const byKind = toConvert.reduce((acc, { plan }) => ({ ...acc, [plan.kind]: (acc[plan.kind] || 0) + 1 }), {});
  console.log(`Mode: ${mode}`);
  console.log(`Account movements involving a pocket: ${rows.length}`);
  console.log('To convert (rows):', byKind);
  console.log(`Series: ${seriesIds.length}, monthly statuses to mirror: ${statuses.length}`);
  if (skipped.length) console.log('Skipped (not handled):', skipped.map(({ row, plan }) => `${row.id} ${plan.kind}`));
  toConvert.slice(0, 15).forEach(({ row, plan }) => {
    console.log(`  ${row.date} ${plan.kind.padEnd(22)} ${String(row.name).slice(0, 30).padEnd(30)} ${row.installment_amount} (${row.recurrence})`);
  });
  if (toConvert.length > 15) console.log(`  ... and ${toConvert.length - 15} more`);
  if (mode !== 'apply') return;

  const backup = { createdAt: new Date().toISOString(), createdEventIds: [], createdStatuses: [], originals: [] };
  const backupFile = path.resolve(`server/scripts/pocket-conversion-rollback-${Date.now()}.json`);
  const saveBackup = () => fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  for (const { row, plan } of toConvert) {
    const transferEventId = `${row.event_id}${TRANSFER_EVENT_SUFFIX}`;
    const transfer = transferRowFrom(row, plan, transferEventId);
    const { error: insertError } = await supabase.from(EVENTS).insert(transfer);
    if (insertError) { saveBackup(); fail(`Creating the transfer of ${row.id} failed (rollback file: ${backupFile}):`, insertError); }
    backup.createdEventIds.push(transfer.id);

    backup.originals.push({ id: row.id, pocket_id: row.pocket_id, target_pocket_id: row.target_pocket_id || null });
    const { error: updateError } = await supabase.from(EVENTS).update(plan.update).eq('id', row.id);
    if (updateError) { saveBackup(); fail(`Updating ${row.id} failed (rollback file: ${backupFile}):`, updateError); }
    saveBackup();
  }

  // Monthly statuses of each series, mirrored once per series on the new transfer
  for (const status of statuses) {
    const statusRow = {
      year: status.year,
      month: status.month,
      event_id: `${status.event_id}${TRANSFER_EVENT_SUFFIX}`,
      status: transferStatusOf(status.status),
      timeline_id: status.timeline_id,
      timeboard_id: status.timeboard_id
    };
    const { error } = await supabase.from(STATUSES).upsert(statusRow, { onConflict: 'year,month,event_id' });
    if (error) { saveBackup(); fail(`Mirroring a status failed (rollback file: ${backupFile}):`, error); }
    backup.createdStatuses.push({ year: statusRow.year, month: statusRow.month, event_id: statusRow.event_id });
  }
  saveBackup();
  console.log(`Converted ${toConvert.length} movements; rollback file: ${backupFile}`);
}

run().then(() => process.exit(0)).catch((error) => fail('Conversion failed:', error));
