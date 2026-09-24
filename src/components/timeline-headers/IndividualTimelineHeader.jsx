import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, FileCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { EventStatus, TimelineColor, getDefaultTimelineColor, isCancelledStatus, isPositiveStatus } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency';
import HeaderShell from '../ui/HeaderShell.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';

// An obligation is open (overdue or pending) when it is not completed, cancelled or deleted.
const isOpenObligation = (ev) => {
  if (!ev || ev.isDeleted) return false;
  if (ev.status === EventStatus.DELETED) return false;
  if (isCancelledStatus(ev.status)) return false;
  if (isPositiveStatus(ev.status) || ev.isCompleted) return false;
  return true;
};

export default function IndividualTimelineHeader({
  timeline,
  entityEvents = [],
  selectedEntity = null,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView,
  onOpenClearance
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  const { debtBalance, openCount } = useMemo(() => {
    const open = (entityEvents || []).filter(isOpenObligation);
    const total = open.reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);
    return { debtBalance: total, openCount: open.length };
  }, [entityEvents]);

  if (!timeline) return null;

  const headerColor = timeline.color || getDefaultTimelineColor(timeline.type);
  const hasDebt = debtBalance > 0;
  const debtColor = hasDebt ? TimelineColor.DANGER : TimelineColor.SUCCESS;
  const entityName = selectedEntity?.name || String(selectedEntityId || '');

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed((prev) => !prev)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenClearance && (
            <button
              type="button"
              id="individual-get-clearance"
              className="btn btn-primary btn-sm"
              onClick={onOpenClearance}
              disabled={hasDebt}
              title={hasDebt ? t('individualHeader.getClearanceDisabled') : t('individualHeader.getClearance')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: hasDebt ? 0.5 : 1,
                cursor: hasDebt ? 'not-allowed' : 'pointer'
              }}
            >
              <FileCheck size={14} />
              <span>{t('individualHeader.getClearance')}</span>
            </button>
          )}
          <EntityViewSwitch
            selectedEntityId={selectedEntityId}
            isIndividualView={isIndividualView}
            onToggle={onToggleIndividualView}
          />
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', paddingTop: '12px' }}>
        {/* Saldo Devedor: sum of overdue + pending obligations for the selected entity */}
        <div
          style={{
            background: 'var(--bg-glass)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border-glass)',
            borderLeft: `3px solid ${debtColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {hasDebt
              ? <AlertCircle size={14} style={{ color: debtColor }} />
              : <CheckCircle2 size={14} style={{ color: debtColor }} />}
            <span>{t('individualHeader.debtBalance')}</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: debtColor, lineHeight: 1.1 }}>
            {formatCurrency(debtBalance)}
          </div>
          <div style={{ fontSize: '0.74rem', color: hasDebt ? 'var(--text-dim)' : debtColor, lineHeight: 1.3 }}>
            {hasDebt
              ? t('individualHeader.debtBalanceHint', { count: openCount })
              : t('individualHeader.noPendingObligations', { name: entityName })}
          </div>
        </div>
      </div>
    </HeaderShell>
  );
}
