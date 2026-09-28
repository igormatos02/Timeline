import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { Loader2 } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function StatusDropdownButton({ buttonProps, children }) {
  const {
    handleStatusToggle,
    isCancelled,
    isFutureMonth,
    isLockedPositive,
    isReadOnly,
    isReminderEvent,
    isTogglingStatus,
    stripLockIcons,
    t
  } = useEventCard();

  // Read-only users: status is an indicator, not a button (reminders show no status at all)
  if (isReadOnly) {
    if (isReminderEvent) return null;
    return (
      <span
        style={{
          ...buttonProps?.style,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          cursor: 'default',
          pointerEvents: 'none',
          userSelect: 'none',
          boxShadow: 'none'
        }}
      >
        {stripLockIcons(children)}
      </span>
    );
  }

  if (isFutureMonth) {
    return (
      <div
        className="btn btn-sm"
        style={{
          ...buttonProps?.style,
          background: `${TimelineColor.WHITE}08`,
          color: 'var(--text-dim)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'none',
          cursor: 'default',
          userSelect: 'none',
          opacity: 0.65,
          pointerEvents: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
        title=""
      >
        {children}
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div
        className="btn btn-sm"
        style={{
          ...buttonProps?.style,
          boxShadow: 'none',
          cursor: 'default',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
        title={t('cancelEventConfirm.locked')}
      >
        {children}
      </div>
    );
  }

  if (isLockedPositive) {
    return (
      <div
        className="btn btn-sm"
        style={{
          ...buttonProps?.style,
          boxShadow: 'none',
          cursor: 'default',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
        title={t('timeline.lockedPositiveNotice')}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isTogglingStatus}
      onClick={(e) => {
        e.stopPropagation();
        handleStatusToggle(e);
      }}
      {...buttonProps}
      style={{
        ...buttonProps?.style,
        cursor: isTogglingStatus ? 'wait' : (buttonProps?.style?.cursor || 'pointer'),
        opacity: isTogglingStatus ? 0.75 : (buttonProps?.style?.opacity || 1)
      }}
    >
      {isTogglingStatus ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Loader2 size={12} className="animate-spin" />
          <span>{t('common.processing')}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
  }
