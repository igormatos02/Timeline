import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { CATEGORY_PICKER_POPOVER_WIDTH } from './cardUtils.js';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventCategoryPicker() {
  const {
    categoryPickerPopoverRef,
    categoryPickerPos,
    event,
    getCategorySources,
    isCategoryPickerOpen,
    saveCategory,
    t
  } = useEventCard();

  if (!isCategoryPickerOpen || !categoryPickerPos) return null;
  const [options] = getCategorySources();
  if (!options) return null;
  const [metaMap, labelNamespace] = options;
  const currentCategory = String(event.category || '').toLowerCase().trim();
  return createPortal(
    <div
      ref={categoryPickerPopoverRef}
      role="listbox"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: categoryPickerPos.top,
        left: categoryPickerPos.left,
        zIndex: 1000,
        width: `${CATEGORY_PICKER_POPOVER_WIDTH}px`,
        maxHeight: '320px',
        overflowY: 'auto',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}
    >
      {Object.entries(metaMap).map(([categoryKey, { icon: OptionIcon, color }]) => {
        const isSelected = categoryKey === currentCategory;
        return (
          <button
            key={categoryKey}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => saveCategory(categoryKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: isSelected ? 'var(--bg-app)' : 'transparent',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '0.76rem',
              fontWeight: isSelected ? '700' : '500',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            {OptionIcon && <OptionIcon size={13} style={{ color, flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{t(`${labelNamespace}.${categoryKey}`)}</span>
            {isSelected && <Check size={12} style={{ color: 'var(--primary)' }} />}
          </button>
        );
      })}
    </div>,
    document.body
  );
  }
