import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { CATEGORY_PICKER_POPOVER_WIDTH } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import { ChevronDown } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventCategoryBadge({ onPositiveCard }) {
  const {
    canChangeCategory,
    categoryAnchorRef,
    event,
    getCategorySources,
    setCategoryPickerPos,
    setIsCategoryPickerOpen,
    t
  } = useEventCard();

  const category = String(event.category || '').toLowerCase().trim();
  if (!category) return null;
  const match = getCategorySources().find(([metaMap]) => metaMap[category]);
  if (!match) return null;
  const [metaMap, labelNamespace] = match;
  const { icon: CategoryIcon, color } = metaMap[category];
  const BadgeTag = canChangeCategory ? 'button' : 'span';
  const openCategoryPicker = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCategoryPickerPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - CATEGORY_PICKER_POPOVER_WIDTH - 8)) });
    setIsCategoryPickerOpen((open) => !open);
  };
  return (
    <BadgeTag
      ref={canChangeCategory ? categoryAnchorRef : undefined}
      type={canChangeCategory ? 'button' : undefined}
      onClick={canChangeCategory ? openCategoryPicker : undefined}
      title={canChangeCategory ? t('timeline.changeCategory') : t(`${labelNamespace}.${category}`)}
      style={{
        cursor: canChangeCategory ? 'pointer' : 'default',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        margin: '0',
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
      {CategoryIcon && <CategoryIcon size={11} />}
      <span>{t(`${labelNamespace}.${category}`)}</span>
      {canChangeCategory && <ChevronDown size={10} />}
    </BadgeTag>
  );
  }
