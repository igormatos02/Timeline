import React from 'react';
import { Landmark, PiggyBank } from 'lucide-react';
import OptionBoxGroup from './OptionBoxGroup.jsx';
import { TimelineColor } from '../../enums/index.js';
import { GENERAL_SPACE_KEY } from '../../../shared/finance/savingsSpaces.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

/**
 * "Where" field of the account movements: the account's General space or one of its pockets.
 *
 * Props:
 *   label       - field label
 *   pockets     - pockets of the account (closed ones are left out unless selected)
 *   value       - selected pocket id, or null for the General space
 *   onChange    - (pocketId | null) => void
 *   balances    - optional Map(pocketId | GENERAL_SPACE_KEY -> balance), shown under each option
 *   excludeId   - optional space that cannot be chosen (the origin of a transfer); undefined = none
 *   generalLabel- label of the General space
 *   color       - accent color of the options
 */
export default function AccountSpaceSelector({
  label,
  pockets = [],
  value = null,
  onChange,
  balances = null,
  excludeId,
  generalLabel,
  color = TimelineColor.INVESTMENT
}) {
  const balanceHint = (key) => (balances ? formatCurrency(balances.get(key) || 0) : undefined);
  const isOpenPocket = (pocket) => !(pocket.date_closed || pocket.dateClosed) || String(pocket.id) === String(value);

  const options = [
    { id: null, key: GENERAL_SPACE_KEY, label: generalLabel, icon: Landmark },
    ...(pockets || []).filter(isOpenPocket).map((pocket) => ({ id: pocket.id, key: String(pocket.id), label: pocket.name, icon: PiggyBank }))
  ].map((option) => ({
    ...option,
    color,
    hint: balanceHint(option.key),
    disabled: excludeId !== undefined && String(option.id ?? '') === String(excludeId ?? '')
  }));

  return <OptionBoxGroup label={label} options={options} value={value ?? null} onChange={onChange} />;
}
