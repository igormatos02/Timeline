import React from 'react';
import { TimelineColor } from '../../enums/index.js';

/** Small on / off switch shown at the right of the sidebar filter items. */
export default function FilterSwitch({ checked, color = 'var(--primary)' }) {
  return (
    <span
      style={{
        width: '28px',
        height: '16px',
        borderRadius: '9999px',
        background: checked ? color : `${TimelineColor.SLATE_LIGHT}40`,
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
        display: 'inline-block'
      }}
    >
      <span
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: TimelineColor.WHITE,
          position: 'absolute',
          top: '2px',
          left: checked ? '14px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: 'var(--shadow-xs)'
        }}
      />
    </span>
  );
}
