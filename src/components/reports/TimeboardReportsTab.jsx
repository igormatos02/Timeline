import React, { useEffect, useMemo, useState } from 'react';
import { FileWarning, Printer, Check, CalendarCheck } from 'lucide-react';
import { format, parseISO, subMonths, addMonths, endOfMonth, setMonth } from 'date-fns';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  EventType,
  EventStatus,
  HistoryPeriod,
  HISTORY_PERIOD_MONTHS,
  ReportType,
  ReportGroupBy,
  ClosingPeriod,
  TimeboardType,
  TimelineType,
  isWalletTimelineType,
  AccountMovementType,
  getAccountMovementType,
  normalizeTimelineType,
  getDefaultTimelineColor,
  isCancelledStatus,
  isPositiveStatus,
  isLoanTimelineType
} from '../../enums/index.js';
import { buildDebtorsReportHtml, buildClosingReportHtml } from '../../utils/receiptGenerator.js';
import { computeClosingReport } from '../../utils/closingReport.js';
import { getLoanMetrics } from '../../utils/loanCalculations.js';
import { computeMoneySummary } from '../../../shared/finance/moneySummary.js';
import ReceiptModal from '../modals/ReceiptModal.jsx';

const REPORTS = [
  { id: ReportType.DEBTORS, icon: FileWarning },
  { id: ReportType.CLOSINGS, icon: CalendarCheck }
];

const CLOSING_PERIOD_OPTIONS = [ClosingPeriod.MONTH, ClosingPeriod.YEAR, ClosingPeriod.GENERAL];
const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

const PERIOD_OPTIONS = [
  HistoryPeriod.LAST_6_MONTHS,
  HistoryPeriod.LAST_YEAR,
  HistoryPeriod.LAST_2_YEARS,
  HistoryPeriod.LAST_5_YEARS
];

const GROUP_BY_OPTIONS = [ReportGroupBy.TIMELINE, ReportGroupBy.DEBTOR, ReportGroupBy.DATE];

// Timelines that can have debtors: income and account (owners' deposits into the account)
const DEBTOR_TIMELINE_TYPES = [TimelineType.INCOME, TimelineType.WALLET, TimelineType.INVESTMENT];

// An obligation is owed when it is overdue and not settled, cancelled or deleted:
// income events and account inflows (not withdrawals, costs or expenses of the account)
const isOwedEvent = (ev, todayStr) => {
  if (!ev || !ev.date || ev.isDeleted || ev.isVirtual || ev.isSharedNotice) return false;
  if (ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return false;
  if (isPositiveStatus(ev.status) || ev.isCompleted) return false;
  const isIncome = ev.eventType === EventType.INCOME || Boolean(ev.isIncome);
  const isAccountInflow = ev.eventType === EventType.INVESTMENT && getAccountMovementType(ev) === AccountMovementType.INFLOW;
  if (!isIncome && !isAccountInflow) return false;
  return ev.date < todayStr;
};

const getPersonName = (person) => person?.personName || person?.person_name || person?.name || '';

/**
 * Reports tab of the timeboard settings: list of reports; the selected one shows its filter ribbon
 * and prints through the shared print preview modal.
 */
export default function TimeboardReportsTab({ timeboard, timelines = [], events = [], pockets = [], persons = [], currentUser }) {
  const { t, language, dateLocale } = useTranslation();
  const [selectedReport, setSelectedReport] = useState(null);
  const [period, setPeriod] = useState(HistoryPeriod.LAST_6_MONTHS);
  const [groupBy, setGroupBy] = useState(ReportGroupBy.TIMELINE);
  const [printHtml, setPrintHtml] = useState('');
  // Closings: month (month + year), year (year) or general (up to a date, default)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [closingPeriod, setClosingPeriod] = useState(ClosingPeriod.GENERAL);
  const [closingMonth, setClosingMonth] = useState(new Date().getMonth());
  const [closingYear, setClosingYear] = useState(new Date().getFullYear());
  const [closingUntilDate, setClosingUntilDate] = useState(todayStr);

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

  // Years offered by the closing pickers: from the first event of the timeboard up to next year
  const closingYears = useMemo(() => {
    const boardIds = new Set(boardTimelines.map((tl) => String(tl.id)));
    let firstYear = new Date().getFullYear();
    events.forEach((ev) => {
      if (!ev?.date || !boardIds.has(String(ev.timelineId || ev.timeline_id || ''))) return;
      firstYear = Math.min(firstYear, Number(ev.date.substring(0, 4)));
    });
    const lastYear = new Date().getFullYear() + 1;
    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index);
  }, [events, boardTimelines]);

  // "Where is my money" of a closing (shared engine): positions at the end of the period (available, savings,
  // debts, from the calculation start) and flows during the period (received, spent, transferred...)
  const buildMoneySummary = (fromDate, toDate) => {
    const timelineTypeMap = new Map(boardTimelines.map((tl) => [String(tl.id), tl.type]));
    const incomeTimeline = boardTimelines.find((tl) => isWalletTimelineType(tl.type));
    const rawComputeFrom = String(timeboard?.computeFrom || timeboard?.compute_from || '');
    const computeFromMonth = rawComputeFrom && !rawComputeFrom.startsWith('1900-01') ? rawComputeFrom.substring(0, 7) : null;
    const asOfMonth = toDate.substring(0, 7);
    const eventsUpToDate = events.filter((ev) => ev?.date && ev.date <= toDate);
    const loans = boardTimelines
      .filter((tl) => isLoanTimelineType(tl.type))
      .map((loanTimeline) => getLoanMetrics(loanTimeline, eventsUpToDate));
    const common = {
      events,
      timelineTypeMap,
      pockets,
      asOfMonth,
      horizonMonth: format(addMonths(parseISO(toDate), 12), 'yyyy-MM'),
      loans
    };
    const positions = computeMoneySummary({
      ...common,
      fromMonth: computeFromMonth,
      initialAvailable: Number(incomeTimeline?.initialValue ?? incomeTimeline?.initial_value ?? 0)
    });
    const flows = computeMoneySummary({ ...common, fromMonth: fromDate ? fromDate.substring(0, 7) : computeFromMonth });
    return {
      ...positions,
      received: flows.received,
      spentFromAvailable: flows.spentFromAvailable,
      spentViaSavings: flows.spentViaSavings,
      transferred: flows.transferred,
      withdrawn: flows.withdrawn,
      putIntoSavingsInternal: flows.putIntoSavingsInternal,
      putIntoSavingsExternal: flows.putIntoSavingsExternal,
      loanPaid: flows.loanPaid
    };
  };

  const buildClosingsHtml = () => {
    let fromDate;
    let toDate;
    let periodLabel;
    if (closingPeriod === ClosingPeriod.MONTH) {
      const monthStart = new Date(closingYear, closingMonth, 1);
      fromDate = format(monthStart, 'yyyy-MM-dd');
      toDate = format(endOfMonth(monthStart), 'yyyy-MM-dd');
      periodLabel = t('timeboardSettings.reports.closings.periodMonth', { month: format(monthStart, 'MMMM yyyy', { locale: dateLocale }) });
    } else if (closingPeriod === ClosingPeriod.YEAR) {
      fromDate = `${closingYear}-01-01`;
      toDate = `${closingYear}-12-31`;
      periodLabel = t('timeboardSettings.reports.closings.periodYear', { year: closingYear });
    } else {
      // General: from the timeboard's calculation start up to the chosen date
      const rawComputeFrom = String(timeboard?.computeFrom || timeboard?.compute_from || '');
      fromDate = rawComputeFrom && !rawComputeFrom.startsWith('1900-01') ? `${rawComputeFrom.substring(0, 7)}-01` : null;
      toDate = closingUntilDate || todayStr;
      periodLabel = t('timeboardSettings.reports.closings.periodGeneral', { date: format(parseISO(toDate), 'dd/MM/yyyy') });
    }

    const report = computeClosingReport({
      events,
      timelines: boardTimelines,
      pockets,
      fromDate,
      toDate,
      isCondoflow: timeboard?.type === TimeboardType.CONDOFLOW,
      t
    });
    return buildClosingReportHtml({ timeboard, currentUser, periodLabel, report, moneySummary: buildMoneySummary(fromDate, toDate), language, t });
  };

  const debtorTimelines = useMemo(
    () => boardTimelines.filter((tl) => DEBTOR_TIMELINE_TYPES.includes(normalizeTimelineType(tl.type))),
    [boardTimelines]
  );
  // Timelines excluded from the debtors report (all included by default)
  const [excludedDebtorTimelineIds, setExcludedDebtorTimelineIds] = useState([]);
  const selectedDebtorTimelineIds = debtorTimelines
    .map((tl) => String(tl.id))
    .filter((id) => !excludedDebtorTimelineIds.includes(id));
  const toggleDebtorTimeline = (timelineId) => {
    setExcludedDebtorTimelineIds((prev) => (
      prev.includes(timelineId) ? prev.filter((id) => id !== timelineId) : [...prev, timelineId]
    ));
  };

  const buildDebtorsHtml = () => {
    const months = HISTORY_PERIOD_MONTHS[period] || HISTORY_PERIOD_MONTHS[HistoryPeriod.LAST_6_MONTHS];
    const fromDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
    const reportTimelines = debtorTimelines.filter((tl) => selectedDebtorTimelineIds.includes(String(tl.id)));
    const timelineById = new Map(reportTimelines.map((tl) => [String(tl.id), tl]));
    const timelineOrder = new Map(reportTimelines.map((tl, index) => [String(tl.id), index]));
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
    if (selectedReport === ReportType.CLOSINGS) setPrintHtml(buildClosingsHtml());
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

  const renderPicker = (label, control) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      {control}
    </label>
  );
  const pickerStyle = { width: 'auto', padding: '5px 10px', fontSize: '0.78rem', background: 'var(--bg-card)' };

  // Debtors report: choose which timelines appear in the report
  const renderTimelinePicker = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {t('timeboardSettings.reports.timelinesLabel')}
      </span>
      <div role="group" aria-label={t('timeboardSettings.reports.timelinesLabel')} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {debtorTimelines.map((tl) => {
          const tlId = String(tl.id);
          const isSelected = selectedDebtorTimelineIds.includes(tlId);
          const color = tl.color || getDefaultTimelineColor(normalizeTimelineType(tl.type));
          return (
            <button
              key={tlId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleDebtorTimeline(tlId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isSelected ? color : 'var(--border-glass)'}`,
                background: isSelected ? `${color}1f` : 'var(--bg-glass)',
                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              {isSelected ? <Check size={12} style={{ color }} /> : <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, opacity: 0.5 }} />}
              <span>{tl.name}</span>
            </button>
          );
        })}
        {debtorTimelines.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('timeboardSettings.reports.noTimelines')}</span>
        )}
      </div>
    </div>
  );

  const renderClosingFilters = () => (
    <>
      {renderSegmented(t('timeboardSettings.reports.closings.typeLabel'), CLOSING_PERIOD_OPTIONS, closingPeriod, setClosingPeriod, (opt) => t(`timeboardSettings.reports.closings.periods.${opt}`))}
      {closingPeriod === ClosingPeriod.MONTH && renderPicker(
        t('timeboardSettings.reports.closings.monthLabel'),
        <select className="form-input" style={pickerStyle} value={closingMonth} onChange={(e) => setClosingMonth(Number(e.target.value))}>
          {MONTH_INDEXES.map((index) => (
            <option key={index} value={index}>{format(setMonth(new Date(2000, 0, 1), index), 'MMMM', { locale: dateLocale })}</option>
          ))}
        </select>
      )}
      {closingPeriod !== ClosingPeriod.GENERAL && renderPicker(
        t('timeboardSettings.reports.closings.yearLabel'),
        <select className="form-input" style={pickerStyle} value={closingYear} onChange={(e) => setClosingYear(Number(e.target.value))}>
          {closingYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      )}
      {closingPeriod === ClosingPeriod.GENERAL && renderPicker(
        t('timeboardSettings.reports.closings.untilDateLabel'),
        <input type="date" className="form-input" style={pickerStyle} value={closingUntilDate} onChange={(e) => setClosingUntilDate(e.target.value)} />
      )}
    </>
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
                  {id === ReportType.DEBTORS && (
                    <>
                      {renderSegmented(t('timeboardSettings.reports.periodLabel'), PERIOD_OPTIONS, period, setPeriod, (opt) => t(`history.periods.${opt}`))}
                      {renderSegmented(t('timeboardSettings.reports.groupByLabel'), GROUP_BY_OPTIONS, groupBy, setGroupBy, (opt) => t(`timeboardSettings.reports.groupBy.${opt}`))}
                      {renderTimelinePicker()}
                    </>
                  )}
                  {id === ReportType.CLOSINGS && renderClosingFilters()}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handlePrint}
                    disabled={
                      (id === ReportType.CLOSINGS && closingPeriod === ClosingPeriod.GENERAL && !closingUntilDate) ||
                      (id === ReportType.DEBTORS && selectedDebtorTimelineIds.length === 0)
                    }
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
