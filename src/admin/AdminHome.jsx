import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, LogOut, RefreshCw, Loader2, Users } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PersonRole, TimeboardType, TimelineColor } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { PUBLIC_SITE_URL } from '../../shared/config/appConfig.js';
import * as mobileApi from '../mobile/mobileApi.js';
import MobileMoneySummary from '../mobile/MobileMoneySummary.jsx';
import styles from '../mobile/MobileApp.module.css';

const currentMonthKey = () => format(new Date(), 'yyyy-MM');

/**
 * CondoFlow Gestão home: a condominium the person administers, its month (income, outflows and result, same as the
 * web balance row), "where is my money" and who is overdue.
 */
export default function AdminHome({ user, preferredTimeboardId, notice, onClearNotice, onLogout, onSessionExpired }) {
  const { t, dateLocale } = useTranslation();
  const [timeboards, setTimeboards] = useState(null);
  const [selectedId, setSelectedId] = useState(() => preferredTimeboardId || mobileApi.getSelectedTimeboardId());
  const [month, setMonth] = useState(currentMonthKey);
  const [monthFlows, setMonthFlows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [entities, setEntities] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleError = useCallback((err) => {
    if (err instanceof mobileApi.SessionExpiredError) onSessionExpired();
    else setError(err.message || t('auth.errors.requestFailed'));
  }, [onSessionExpired, t]);

  // Condominiums (CondoFlow timeboards) the person administers
  useEffect(() => {
    mobileApi.getTimeboards()
      .then((result) => {
        const managed = (result?.all || []).filter((tb) => tb.type === TimeboardType.CONDOFLOW && tb.role === PersonRole.ADMIN);
        setTimeboards(managed);
        setSelectedId((current) => (managed.some((tb) => tb.id === current) ? current : (managed[0]?.id || null)));
      })
      .catch(handleError);
  }, [handleError]);

  const load = useCallback(() => {
    if (!selectedId) return;
    mobileApi.setSelectedTimeboardId(selectedId);
    setIsLoading(true);
    setError('');
    Promise.all([
      mobileApi.getMonthFlows(selectedId, month).then(setMonthFlows),
      mobileApi.getSummary(selectedId).then(setSummary),
      mobileApi.getEntities(selectedId).then(setEntities)
    ])
      .catch(handleError)
      .finally(() => setIsLoading(false));
  }, [selectedId, month, handleError]);

  useEffect(() => { load(); }, [load]);

  const selectedTimeboard = (timeboards || []).find((tb) => tb.id === selectedId);
  const overdue = (entities || [])
    .filter((entity) => entity.debtBalance > 0)
    .sort((a, b) => b.debtBalance - a.debtBalance);
  const shownError = error || notice;
  const realized = monthFlows?.realized;
  const projected = monthFlows?.projected;
  const resultColor = (realized?.result || 0) >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER;

  return (
    <div className={styles.screen}>
      {/* Header: condominium, user, refresh and logout */}
      <div className={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.headerTitle}>{selectedTimeboard?.name || t('admin.brand')}</div>
          <div className={styles.headerSub}>{user?.name || user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className={styles.iconButton} onClick={load} aria-label={t('mobile.refresh')} title={t('mobile.refresh')} disabled={!selectedId}>
            <RefreshCw size={18} className={isLoading ? styles.spin : undefined} />
          </button>
          <button type="button" className={styles.iconButton} onClick={onLogout} aria-label={t('mobile.logout')} title={t('mobile.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {shownError && (
        <div className={styles.error} role="alert" onClick={() => { setError(''); onClearNotice(); }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{shownError}</span>
        </div>
      )}

      {timeboards === null ? (
        <Loader2 size={28} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)', marginTop: '40px' }} />
      ) : timeboards.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>{t('admin.noManagedCondominiums')}</div>
      ) : (
        <>
          {timeboards.length > 1 && (
            <select className={styles.select} value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)} aria-label={t('mobile.timeboardLabel')}>
              {timeboards.map((tb) => <option key={tb.id} value={tb.id}>{tb.name}</option>)}
            </select>
          )}

          {/* Month: income, outflows and result of the condominium (money from / to the outside) */}
          <div className={styles.card}>
            <div className={styles.monthNav}>
              <button type="button" className={styles.iconButton} onClick={() => setMonth((m) => format(addMonths(parseISO(`${m}-01`), -1), 'yyyy-MM'))} aria-label={t('admin.previousMonth')}>
                <ChevronLeft size={18} />
              </button>
              <div className={styles.monthTitle}>{format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: dateLocale })}</div>
              <button type="button" className={styles.iconButton} onClick={() => setMonth((m) => format(addMonths(parseISO(`${m}-01`), 1), 'yyyy-MM'))} aria-label={t('admin.nextMonth')}>
                <ChevronRight size={18} />
              </button>
            </div>
            {!monthFlows ? (
              <Loader2 size={22} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
            ) : (
              <>
                <div className={styles.monthFigures}>
                  <div>
                    <div className={styles.monthLabel}>{t('monthFlows.incomeTitle')}</div>
                    <div className={styles.monthValue} style={{ color: TimelineColor.SUCCESS }}>+{formatCurrency(realized.income)}</div>
                  </div>
                  <div>
                    <div className={styles.monthLabel}>{t('monthFlows.outflowsTitle')}</div>
                    <div className={styles.monthValue} style={{ color: TimelineColor.DANGER }}>-{formatCurrency(realized.outflows)}</div>
                  </div>
                  <div>
                    <div className={styles.monthLabel}>{t('timeline.balance')}</div>
                    <div className={styles.monthValue} style={{ color: resultColor }}>{realized.result >= 0 ? '+' : ''}{formatCurrency(realized.result)}</div>
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  {t('admin.projectedLine', {
                    income: formatCurrency(projected.income),
                    outflows: formatCurrency(projected.outflows),
                    result: formatCurrency(projected.result)
                  })}
                </div>
              </>
            )}
          </div>

          <MobileMoneySummary summary={summary} t={t} />

          {/* Who is overdue: entities with open installments due up to the end of this month */}
          <div className={styles.card}>
            <div className={styles.noticeHeading}><Users size={16} />{t('admin.overdueTitle')}</div>
            {entities === null ? (
              <Loader2 size={22} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
            ) : overdue.length === 0 ? (
              <div className={styles.empty}>{t('admin.noOverdue')}</div>
            ) : overdue.map((entity) => (
              <div key={entity.id} className={styles.noticeItem} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.itemTitle}>{entity.name}</div>
                  {entity.overdueCount > 0 && <div className={styles.itemMeta}>{t('mobile.overdueCount', { count: entity.overdueCount })}</div>}
                </div>
                <div className={styles.itemAmount} style={{ color: TimelineColor.DANGER }}>{formatCurrency(entity.debtBalance)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.accountFooter}>
        <a className={styles.footerLink} href={`${PUBLIC_SITE_URL}/privacidade`} target="_blank" rel="noreferrer">{t('legal.privacyLink')}</a>
      </div>
    </div>
  );
}
