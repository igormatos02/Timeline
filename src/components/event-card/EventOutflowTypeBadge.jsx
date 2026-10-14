import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { ArrowLeftRight } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventOutflowTypeBadge({ onPositiveCard }) {
  const {
    event,
    isTransferEvent,
    pocketName,
    t
  } = useEventCard();

  // Only transfers carry a badge (their route): an account expense already reads as one (sign, color, Pay)
  if (!isTransferEvent) return null;
  const color = TimelineColor.CYAN;
  const label = t('account.transferRoute', {
    from: pocketName(event.pocketId || event.pocket_id) || t('account.general'),
    to: pocketName(event.targetPocketId || event.target_pocket_id) || t('account.general')
  });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        marginLeft: '8px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.68rem',
        fontWeight: '700',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        color: onPositiveCard ? TimelineColor.WHITE : color,
        background: onPositiveCard ? color : `${color}1f`,
        border: `1px solid ${onPositiveCard ? `${TimelineColor.WHITE}59` : `${color}59`}`
      }}
    >
      <ArrowLeftRight size={11} />
      <span>{label}</span>
    </span>
  );
  }
