import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import HeaderShell from '../ui/HeaderShell.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';

export default function IndividualTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  filteredEvents,
  onEdit,
  onDelete,
  onAddEvent,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView
}) {
  const { t } = useTranslation();

  if (!timeline) return null;

  const headerColor = TimelineColor.INDIVIDUAL;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={false}
      onToggle={() => {}}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name}
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EntityViewSwitch
            selectedEntityId={selectedEntityId}
            isIndividualView={isIndividualView}
            onToggle={onToggleIndividualView}
          />
        </div>
      }
    />
  );
}