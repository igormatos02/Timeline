import React from 'react';
import { Repeat, Zap, Calendar } from 'lucide-react';
import { EventRecurrence, TimelineColor } from '../../enums/index.js';
import OptionBoxGroup from './OptionBoxGroup.jsx';

/**
 * RecurrenceSelector - recurrence choice (one-time / recurring / period) with the same box style
 * as the category selector.
 */
export default function RecurrenceSelector({
  value,
  onChange,
  accent = TimelineColor.SUCCESS,
  t,
  options,
  disabled = false
}) {
  if (disabled) return null;

  const defaultOptions = [
    { id: EventRecurrence.ONCE, label: t('recurrence.once'), icon: Zap },
    { id: EventRecurrence.RECURRING, label: t('recurrence.recurring'), icon: Repeat },
    { id: EventRecurrence.LIMITED, label: t('recurrence.limited'), icon: Calendar }
  ];

  const items = (options || defaultOptions).map((item) => ({ ...item, color: item.color || accent }));

  return (
    <OptionBoxGroup
      label={t('modal.recurrence')}
      options={items}
      value={value}
      onChange={onChange}
    />
  );
}
