import React, { useState } from 'react';
import {
  Bell,
  Sparkles,
  Plus,
  Trash2,
  Settings,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Cake,
  Wrench,
  Tag
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import {
  TimelineColor,
  ReminderEventCategory,
  ReminderEventStatus,
  EventStatus,
  isPositiveStatus,
  isCancelledStatus
} from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export const REMINDER_CATEGORY_COLORS = {
  [ReminderEventCategory.BIRTHDAY]: TimelineColor.PINK,
  [ReminderEventCategory.MAINTENANCE]: TimelineColor.WARNING,
  [ReminderEventCategory.RANDOM_EVENT]: TimelineColor.CYAN,
  [ReminderEventCategory.APPOINTMENT]: TimelineColor.LOAN,
  [ReminderEventCategory.OTHER]: TimelineColor.SLATE
};

export const REMINDER_CATEGORY_ICONS = {
  [ReminderEventCategory.BIRTHDAY]: Cake,
  [ReminderEventCategory.MAINTENANCE]: Wrench,
  [ReminderEventCategory.RANDOM_EVENT]: Calendar,
  [ReminderEventCategory.APPOINTMENT]: Clock,
  [ReminderEventCategory.OTHER]: Tag
};

export default function ReminderTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset
}) {
  const { t, language, dateLocale } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.REMINDER;
  const rawEventsList = timeline.events || events || [];
  const eventsList = rawEventsList.filter((ev) => {
    if (!ev || !ev.date || ev.isDeleted) return false;
    const evTimelineId = ev.timelineId || ev.timeline_id;
    if (evTimelineId && timeline?.id && String(evTimelineId) !== String(timeline.id)) {
      return false;
    }
    return true;
  });

  const validCategories = Object.values(ReminderEventCategory);
  const getCategoryLabel = (cat) => {
    return t(`reminderCategories.${cat}`) || cat;
  };

  const isClosedEvent = (ev) => {
    if (!ev) return false;
    return Boolean(ev.isCompleted || ev.isSeen || ev.seen || isPositiveStatus(ev.status));
  };

  const isCancelledEvent = (ev) => {
    if (!ev) return false;
    return Boolean(ev.isDeleted || isCancelledStatus(ev.status));
  };

  // 1. LEMBRETES POR CATEGORIA
  const categoryCounts = {};
  let totalActiveReminders = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    totalActiveReminders += 1;

    let cat = (ev.category || '').toLowerCase();
    if (!validCategories.includes(cat)) {
      cat = ReminderEventCategory.OTHER;
    }
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryList = Object.entries(categoryCounts)
    .map(([cat, count]) => ({
      rawCat: cat,
      name: getCategoryLabel(cat),
      amount: count,
      count,
      percent: totalActiveReminders > 0 ? Math.round((count / totalActiveReminders) * 100) : 0,
      color: REMINDER_CATEGORY_COLORS[cat] || TimelineColor.SLATE
    }))
    .sort((a, b) => b.count - a.count);

  // 2. LEMBRETES ANUAIS (Janela de 12 meses a partir do mês atual)
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;

  let annualTotalReminders = 0;
  let annualClosedReminders = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      annualTotalReminders += 1;
      if (isClosedEvent(ev)) {
        annualClosedReminders += 1;
      }
    }
  });

  const annualCompletionPercent = annualTotalReminders > 0
    ? Math.round((annualClosedReminders / annualTotalReminders) * 100)
    : 0;

  // 3. NÃO VISTOS VS VISTOS (Status Ratio - Janela de 12 meses: Mês Atual + 12 Meses)
  let totalSeenClosed = 0;
  let totalUnseenOpen = 0;
  let totalRolling12MonthsReminders = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      totalRolling12MonthsReminders += 1;
      if (isClosedEvent(ev)) {
        totalSeenClosed += 1;
      } else {
        totalUnseenOpen += 1;
      }
    }
  });

  const seenPercent = totalRolling12MonthsReminders > 0
    ? Math.round((totalSeenClosed / totalRolling12MonthsReminders) * 100)
    : 0;

  // 4. PRÓXIMOS 30 DIAS
  const todayStart = startOfDay(now);
  const thirtyDaysLater = addDays(todayStart, 30);

  let next30DaysTotal = 0;
  let next30DaysOpen = 0;
  let next30DaysClosed = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    try {
      const evDate = parseISO(ev.date);
      if (!isBefore(evDate, todayStart) && !isAfter(evDate, thirtyDaysLater)) {
        next30DaysTotal += 1;
        if (isClosedEvent(ev)) {
          next30DaysClosed += 1;
        } else {
          next30DaysOpen += 1;
        }
      }
    } catch {
      // Ignore invalid date format
    }
  });

  const next30DaysCompletionPercent = next30DaysTotal > 0
    ? Math.round((next30DaysClosed / next30DaysTotal) * 100)
    : 0;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          icon={<Bell size={18} />}
          name={timeline.name}
          badge={t('reminderHeader.badge') || 'Lembretes & Alertas'}
          iconBackground="rgba(245, 158, 11, 0.12)"
          badgeBackground="rgba(245, 158, 11, 0.12)"
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: headerColor,
                borderColor: headerColor
              }}
            >
              <Plus size={14} />
              <span>{t('reminderHeader.addReminder') || 'Novo Lembrete'}</span>
            </button>
          )}

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title={t('reminderHeader.resetTitle') || 'Limpar todos os movimentos desta timeline'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <RotateCcw size={13} />
              <span>{t('common.reset') || 'Reset'}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('reminderHeader.settingsTitle') || 'Definições da Timeline'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={15} />
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete && onDelete(timeline)}
              title={t('reminderHeader.deleteTitle')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Trash2 size={13} />
              <span>{t('common.delete') || 'Delete'}</span>
            </button>
          )}
        </div>
      }
    >
      {/* Conteúdo Expandido */}
      {!collapsed && (
        <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Grid Principal 4 Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: REMINDERS POR CATEGORIA (PieDonut & Legenda) */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {t('reminderHeader.categoriesTitle') || 'LEMBRETES POR CATEGORIA'}
              </div>

              {categoryList.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                  <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                    <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-glass)',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: 'var(--text-dim)'
                      }}
                    >
                      0
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                      {t('reminderHeader.noReminders') || 'Sem lembretes registados'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                      {t('reminderHeader.noRemindersHint') || 'Adicione lembretes para ver a distribuição por categoria.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                  <PieDonut items={categoryList} centerLabel={String(totalActiveReminders)} />
                  <DonutLegend
                    items={categoryList}
                    nameFormatter={(item) => item.name}
                  />
                </div>
              )}
            </div>

            {/* Quadrante 2: NÃO VISTOS VS VISTOS */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {t('reminderHeader.statusRatioTitle') || 'NÃO VISTOS VS VISTOS'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                <DonutChart
                  percent={seenPercent}
                  sliceColor={TimelineColor.SUCCESS}
                  remainingColor="rgba(245, 158, 11, 0.25)"
                  title={t('reminderHeader.seenRatioTitleDonut', { percent: seenPercent })}
                  label={`${seenPercent}%`}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('reminderHeader.seenLabel')}</span>
                    <strong style={{ color: TimelineColor.SUCCESS, fontSize: '0.9rem' }}>{totalSeenClosed}</strong>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('reminderHeader.unseenLabel')}</span>
                    <strong style={{ color: TimelineColor.WARNING, fontSize: '0.9rem' }}>{totalUnseenOpen}</strong>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {t('reminderHeader.seenPercentage', { percent: seenPercent })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quadrante 4: PRÓXIMOS 30 DIAS */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {t('reminderHeader.next30DaysTitle')}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                <DonutChart
                  percent={next30DaysCompletionPercent}
                  sliceColor={TimelineColor.CYAN}
                  remainingColor="rgba(6, 182, 212, 0.15)"
                  title={t('reminderHeader.next30DaysTitleDonut', { count: next30DaysTotal })}
                  label={`${next30DaysTotal}`}
                  centerFontSize="0.82rem"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                    {t('reminderHeader.next30DaysDesc')}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.CYAN }}>
                    {next30DaysTotal === 1
                      ? t('reminderHeader.remindersCountOne', { count: next30DaysTotal })
                      : t('reminderHeader.remindersCountOther', { count: next30DaysTotal })}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {t('reminderHeader.statusPendingAndClosed', { open: next30DaysOpen, closed: next30DaysClosed })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé com Gráfico de Colunas: VOLUME EVOLUTION (LAST 6 MONTHS + CURRENT MONTH) */}
          {(() => {
            const currentDateObj = new Date();
            const last7Months = [];

            for (let i = 6; i >= 0; i--) {
              const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
              const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
              const monthStr = String(month).padStart(2, '0');
              const key = `${year}-${monthStr}`;

              const d = new Date(year, month - 1, 1);
              const label = format(d, 'MMM', { locale: dateLocale }).replace('.', '').toUpperCase();
              last7Months.push({ key, label, total: 0 });
            }

            eventsList.forEach((ev) => {
              if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
              const evKey = ev.date.substring(0, 7);
              const foundMonth = last7Months.find((m) => m.key === evKey);
              if (foundMonth) {
                foundMonth.total += 1;
              }
            });

            const { diffPercentStr, isDiffPositive } = computeMonthDiff(last7Months);

            return (
              <BarChart7Months
                months={last7Months}
                chartTitle={t('reminderHeader.chartTitle')}
                monthVsPrevLabel={t('reminderHeader.monthVsPrevMonth')}
                diffPercentStr={diffPercentStr}
                isGoodChange={isDiffPositive}
                goodColor={TimelineColor.WARNING}
                sparklesLabel={t('reminderHeader.annualProjectionLabel')}
                projection={annualTotalReminders}
                sparklesColor={TimelineColor.WARNING}
                projectionColor={TimelineColor.WARNING}
                currentGradient="linear-gradient(180deg, rgba(245, 158, 11, 1) 0%, rgba(217, 119, 6, 1) 100%)"
                mutedGradientTop="rgba(245, 158, 11, 0.6)"
                mutedGradientBottom="rgba(245, 158, 11, 0.25)"
                currentTextColor={TimelineColor.WARNING}
                formatValue={(val) => String(val)}
                formatProjection={(val) => (
                  val === 1
                    ? t('reminderHeader.remindersCountOne', { count: val })
                    : t('reminderHeader.remindersCountOther', { count: val })
                )}
              />
            );
          })()}
        </div>
      )}
    </HeaderShell>
  );
}
