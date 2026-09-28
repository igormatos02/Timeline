import React from 'react';
import { EventType, TimeboardType, TimelineColor, TimelineType } from '../../enums/index.js';
import { makeDiaryT } from '../../utils/diaryLabels.js';
import { PiggyBank, Plus } from 'lucide-react';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function AddEventButton({
  targetDayStr,
  title,
  activeFinancialTab,
  activeTimeboard,
  isBalancoView,
  isFinancialTimeline,
  isLoanTimelineOrTab,
  isReminders,
  onAddEventForDate,
  onOpenCreatePocket,
  paletteTheme,
  t,
  timeline
}) {
  if (!onAddEventForDate || isLoanTimelineOrTab || isBalancoView) return null;
  const isInvestment = timeline.type === TimelineType.INVESTMENT || activeFinancialTab === 'investimentos';
  const addLabel = isFinancialTimeline
    ? (activeFinancialTab === 'gastos' || timeline.type === TimelineType.EXPENSE
        ? t('expenseHeader.addExpenseButton')
        : isInvestment
          ? t('pocket.addPocket')
          : t('incomeHeader.addIncome'))
    : timeline.type === TimelineType.REMINDER
      ? t('reminderHeader.addReminder')
      : timeline.type === TimelineType.DIARY
        ? makeDiaryT(t, activeTimeboard?.type === TimeboardType.CONDOFLOW)('diaryHeader.addEntry')
        : timeline.type === TimelineType.TODO
          ? t('todoHeader.addTask')
          : timeline.type === TimelineType.FOLLOWUP
            ? t('followupHeader.addFollowup')
            : timeline.type === TimelineType.PROJECT
              ? t('projectHeader.newTaskMilestone')
              : t('buttons.addEvent');
  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    background: `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`,
    borderColor: paletteTheme.primary,
    color: TimelineColor.WHITE
  };

  return isInvestment ? (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      style={buttonStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenCreatePocket) onOpenCreatePocket({ defaultDate: targetDayStr });
      }}
      title={t('pocket.addPocket')}
    >
      <PiggyBank size={14} />
      <span>{addLabel}</span>
    </button>
  ) : (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      style={buttonStyle}
      onClick={(e) => {
        e.stopPropagation();
        onAddEventForDate?.(
          targetDayStr,
          timeline.type === TimelineType.EXPENSE || activeFinancialTab === 'gastos'
            ? EventType.EXPENSE
            : timeline.type === TimelineType.FOLLOWUP
              ? EventType.FOLLOWUP
              : isReminders
                ? EventType.REMINDER
                : EventType.INCOME
        );
      }}
      title={title}
    >
      <Plus size={14} />
      <span>{addLabel}</span>
    </button>
  );
  }
