import React, { useEffect, useMemo, useState } from 'react';
import { FileWarning, Printer, Check } from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  EventType,
  EventStatus,
  HistoryPeriod,
  HISTORY_PERIOD_MONTHS,
  ReportType,
  ReportGroupBy,
  isCancelledStatus,
  isPositiveStatus
} from '../../enums/index.js';
import { buildDebtorsReportHtml } from '../../utils/receiptGenerator.js';
import ReceiptModal from '../modals/ReceiptModal.jsx';

const REPORTS = [
  { id: ReportType.DEBTORS, icon: FileWarning }
];

const PERIOD_OPTIONS = [
  HistoryPeriod.LAST_6_MONTHS,
  HistoryPeriod.LAST_YEAR,
  HistoryPeriod.LAST_2_YEARS,
  HistoryPeriod.LAST_5_YEARS
];

const GROUP_BY_OPTIONS = [ReportGroupBy.TIMELINE, ReportGroupBy.DEBTOR, ReportGroupBy.DATE];

// An income obligation is owed when it is overdue and not settled, cancelled or deleted
const isOwedEvent = (ev, todayStr) => {
  if (!ev || !ev.date || ev.isDeleted || ev.isVirtual || ev.isSharedNotice) return false;
  if (ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return false;
  if (isPositiveStatus(ev.status) || ev.isCompleted) return false;
  if (ev.eventType !== EventType.INCOME && !ev.isIncome) return false;
  return ev.date < todayStr;
};

const getPersonName = (person) => person?.personName || person?.person_name || person?.name || '';

/**
 * Reports tab of the timeboard settings: list of reports; the selected one shows its filter ribbon
 * and prints through the shared print preview modal.
 */
export default function TimeboardReportsTab({ timeboard, timelines = [], events = [], persons = [], currentUser }) {
  const { t, language, dateLocale } = useTranslation();
  const [selectedReport, setSelectedReport] = useState(null);
  const [period, setPeriod] = useState(HistoryPeriod.LAST_6_MONTHS);
  const [groupBy, setGroupBy] = useState(ReportGroupBy.TIMELINE);
  const [printHtml, setPrintHtml] = useState('');

  // Esc closes the print preview only (captured before the settings modal's own Esc handler)
  useEffect(() => {
    if (!printHtml) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setPrintHtml('');
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [printHtml]);

  const boardTimelines = useMemo(
    () => timelines.filter((tl) => (tl.timeboardId || tl.timeboard_id) === timeboard?.id),
    [timelines, timeboard?.id]
  );

  const buildDebtorsHtml = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const months = HISTORY_PERIOD_MONTHS[period] || HISTORY_PERIOD_MONTHS[HistoryPeriod.LAST_6_MONTHS];
    const fromDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
    const timelineById = new Map(boardTimelines.map((tl) => [String(tl.id), tl]));
    const timelineOrder = new Map(boardTimelines.map((tl, index) => [String(tl.id), index]));
    const personById = new Map(persons.map((p) => [String(p.id), p]));

    const rows = events
      .filter((ev) => isOwedEvent(ev, todayStr) && ev.date >= fromDate)
      .map((ev) => {
        const timelineId = String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '');
        const personId = ev.obligationPersonId || ev.obligation_person_id;
        const debtorName = getPersonName(personId ? personById.get(String(personId)) : null)
          || getPersonName(ev.obligationPerson)
          || ev.obligationPersonName
          || ev.obligation_person_name
          || '';
        return {
          timelineId,
          timelineName: timelineById.get(timelineId)?.name || '',
          date: ev.date,
          debtorName,
          eventName: ev.title || ev.name || '',
          amount: Math.abs(Number(ev.amount || 0))
        };
      })
      .filter((row) => timelineById.has(row.timelineId) && row.debtorName);

    // Group key / label / order for the selected grouping
    const groupOf = (row) => {
      if (groupBy === ReportGroupBy.DEBTOR) return { key: row.debtorName, label: row.debtorName };
      if (groupBy === ReportGroupBy.DATE) {
        const monthKey = row.date.substring(0, 7);
        return { key: monthKey, label: format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: dateLocale }) };
      }
      return { key: row.timelineId, label: row.timelineName };
    };
    const compareGroups = (a, b) => {
      if (groupBy === ReportGroupBy.DEBTOR) return a.key.localeCompare(b.key);
      if (groupBy === ReportGroupBy.DATE) return b.key.localeCompare(a.key);
      return (timelineOrder.get(a.key) ?? 0) - (timelineOrder.get(b.key) ?? 0);
    };

    const groupMap = new Map();
    rows.forEach((row) => {
      const { key, label } = groupOf(row);
      if (!groupMap.has(key)) groupMap.set(key, { key, label, rows: [], subtotal: 0 });
      const group = groupMap.get(key);
      group.rows.push(row);
      group.subtotal += row.amount;
    });

    const groups = [...groupMap.values()]
      .sort(compareGroups)
      .map((group) => ({ ...group, rows: group.rows.sort((a, b) => b.date.localeCompare(a.date)) }));
    const total = groups.reduce((sum, group) => sum + group.subtotal, 0);

    return buildDebtorsReportHtml({ timeboard, currentUser, fromDate, toDate: todayStr, groups, total, language, t });
  };

  const handlePrint = () => {
    if (selectedReport === ReportType.DEBTORS) setPrintHtml(buildDebtorsHtml());
  };

  const renderSegmented = (label, options, value, onChange, labelOf) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '3px' }}
      >
        {options.map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(opt)}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--text-white)' : 'var(--text-muted)'
              }}
            >
              {labelOf(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {t('timeboardSettings.reports.listLabel')}
      </span>

      <div role="listbox" aria-label={t('timeboardSettings.reports.listLabel')} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {REPORTS.map(({ id, icon: Icon }) => {
          const isSelected = selectedReport === id;
          return (
            <div key={id} style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelectedReport(isSelected ? null : id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: isSelected ? '10px 10px 0 0' : '10px',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-glass)'}`,
                  background: isSelected ? 'var(--primary-glow)' : 'var(--bg-glass)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: 'var(--primary-glow)',
                    color: 'var(--primary-light)'
                  }}
                >
                  <Icon size={18} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{t(`timeboardSettings.reports.types.${id}`)}</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{t(`timeboardSettings.reports.typesDesc.${id}`)}</span>
                </span>
                {isSelected && <Check size={16} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />}
              </button>

              {/* Filter ribbon of the selected report */}
              {isSelected && (
                <div
                  aria-label={t('timeboardSettings.reports.filtersLabel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexWrap: 'wrap',
                    padding: '10px 14px',
                    borderRadius: '0 0 10px 10px',
                    border: '1px solid var(--primary)',
                    borderTop: 'none',
                    background: 'var(--bg-card-hover)'
                  }}
                >
                  {renderSegmented(t('timeboardSettings.reports.periodLabel'), PERIOD_OPTIONS, period, setPeriod, (opt) => t(`history.periods.${opt}`))}
                  {renderSegmented(t('timeboardSettings.reports.groupByLabel'), GROUP_BY_OPTIONS, groupBy, setGroupBy, (opt) => t(`timeboardSettings.reports.groupBy.${opt}`))}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handlePrint}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                  >
                    <Printer size={14} />
                    <span>{t('timeboardSettings.reports.print')}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ReceiptModal
        isOpen={Boolean(printHtml)}
        onClose={() => setPrintHtml('')}
        htmlContent={printHtml}
        title={t(`timeboardSettings.reports.types.${selectedReport || ReportType.DEBTORS}`)}
      />
    </div>
  );
}
