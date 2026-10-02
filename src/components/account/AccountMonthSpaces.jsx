import React, { useMemo } from 'react';
import { EventStatus, TimelineColor, isCancelledStatus } from '../../enums/index.js';
import { computeSpaceBalances, GENERAL_SPACE_KEY, isMovementInSpace } from '../../../shared/finance/savingsSpaces.js';
import { pocketHasTarget } from '../../utils/pocketUtils.js';
import AccountSpaceCard from './AccountSpaceCard.jsx';

const ALL_SPACES_FILTERS = [EventStatus.ALL, 'all', 'Todos'];

/**
 * A month of the account timeline: the General space (movements without a pocket) followed by the pockets open
 * in that month, each with its balance at the end of the month and its movements. The account total is always
 * General + pockets; transfers appear in both spaces they touch.
 *
 * Props:
 *   monthKey ('yyyy-MM'), monthStartStr ('yyyy-MM-01'), isFutureMonth
 *   monthEvents        - movements of the month (already filtered by the sidebar)
 *   allEvents          - every movement of the account (for the balances)
 *   pockets            - pockets of the account
 *   spaceFilter        - pocket filter of the sidebar: all, GENERAL_SPACE_KEY or a pocket id
 *   color, palette     - timeline color and palette theme
 *   onAddInflow(dateStr, pocketId | null), onAddOutflow(dateStr, pocketId | null)
 *   onEditPocket(pocket), onDeletePocket(pocket)
 *   renderEvents(events) - renders the movement cards of a space
 *   t
 */
export default function AccountMonthSpaces({
  monthKey,
  monthStartStr,
  isFutureMonth,
  monthEvents = [],
  allEvents = [],
  pockets = [],
  spaceFilter = EventStatus.ALL,
  color = TimelineColor.INVESTMENT,
  palette,
  onAddMovement,
  onAddInflow,
  onAddOutflow,
  onEditPocket,
  onDeletePocket,
  renderEvents,
  t
}) {
  const isAllSpaces = ALL_SPACES_FILTERS.includes(spaceFilter);
  const handleAddMovement = onAddMovement || onAddInflow;

  // Pockets open in this month (and matching the sidebar filter)
  const visiblePockets = (pockets || []).filter((pocket) => {
    if (!isAllSpaces && String(pocket.id) !== String(spaceFilter)) return false;
    const createdMonth = (pocket.date_created || pocket.dateCreated || '').substring(0, 7) || '1900-01';
    const closedMonth = (pocket.date_closed || pocket.dateClosed || '').substring(0, 7) || null;
    return monthKey >= createdMonth && (!closedMonth || monthKey <= closedMonth);
  });
  const showGeneral = isAllSpaces || spaceFilter === GENERAL_SPACE_KEY;

  // Balance of every space at the end of the month: planned for future months, effective up to the current one
  const balances = useMemo(() => computeSpaceBalances({
    events: allEvents,
    pockets,
    side: isFutureMonth ? 'projected' : 'realized',
    upToMonth: monthKey
  }), [allEvents, pockets, isFutureMonth, monthKey]);

  const activeMonthEvents = (monthEvents || []).filter(
    (ev) => ev && !ev.isDeleted && !isCancelledStatus(ev.status) && ev.status !== EventStatus.DELETED
  );
  const eventsOfSpace = (pocketId) => activeMonthEvents.filter((ev) => isMovementInSpace(ev, pocketId));
  const renderSpaceEvents = (pocketId) => {
    const events = eventsOfSpace(pocketId);
    return events.length > 0 ? renderEvents(events) : null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {showGeneral && (
        <AccountSpaceCard
          name={t('account.general')}
          subtitle={t('account.generalHint')}
          isGeneral
          balance={balances.get(GENERAL_SPACE_KEY) || 0}
          isFutureMonth={isFutureMonth}
          color={color}
          palette={palette}
          onAddMovement={handleAddMovement ? () => handleAddMovement(monthStartStr, null) : undefined}
          t={t}
        >
          {renderSpaceEvents(null)}
        </AccountSpaceCard>
      )}

      {visiblePockets.map((pocket) => (
        <AccountSpaceCard
          key={pocket.id}
          name={pocket.name}
          isClosed={Boolean(pocket.date_closed || pocket.dateClosed)}
          balance={balances.get(String(pocket.id)) || 0}
          target={pocketHasTarget(pocket) ? Number(pocket.target_value ?? pocket.targetValue ?? 0) : 0}
          initialValue={Number(pocket.initial_value ?? pocket.initialValue ?? 0)}
          isFutureMonth={isFutureMonth}
          color={color}
          palette={palette}
          onAddMovement={handleAddMovement ? () => handleAddMovement(monthStartStr, pocket.id) : undefined}
          onEdit={onEditPocket ? () => onEditPocket(pocket) : undefined}
          onDelete={onDeletePocket ? () => onDeletePocket(pocket) : undefined}
          t={t}
        >
          {renderSpaceEvents(pocket.id)}
        </AccountSpaceCard>
      ))}
    </div>
  );
}
