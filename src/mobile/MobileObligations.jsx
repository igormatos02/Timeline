import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw, AlertCircle, CheckCircle2, Clock, Wallet, Loader2, Ticket } from 'lucide-react';
import { format, parseISO, setMonth } from 'date-fns';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import * as mobileApi from './mobileApi.js';
import styles from './MobileApp.module.css';

const ALL = 'all';
const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

// Visual state of an installment: paid, overdue (due date passed) or pending
const itemState = (item) => {
  if (item.isPaid) return { key: 'paid', color: TimelineColor.SUCCESS, Icon: CheckCircle2 };
  if (item.isOverdue) return { key: 'overdue', color: TimelineColor.DANGER, Icon: AlertCircle };
  return { key: 'pending', color: TimelineColor.WARNING, Icon: Clock };
};

/**
 * Home of the mobile app: debt balance of the person, year / month filter and the list of
 * paid and pending installments of the selected timeboard.
 */
export default function MobileObligations({ user, preferredTimeboardId, notice, onClearNotice, onLogout, onSessionExpired }) {
  const { t, dateLocale } = useTranslation();
  const [timeboards, setTimeboards] = useState(null);
  const [selectedId, setSelectedId] = useState(() => preferredTimeboardId || mobileApi.getSelectedTimeboardId());
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonthFilter] = useState(ALL);
  const [inviteCode, setInviteCode] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleError = useCallback((err) => {
    if (err instanceof mobileApi.SessionExpiredError) onSessionExpired();
    else setError(err.message || t('auth.errors.requestFailed'));
  }, [onSessionExpired, t]);

  // Timeboards where the user is linked to a person (the ones with installments)
  const loadTimeboards = useCallback((preferredId = null) => mobileApi.getTimeboards()
    .then((result) => {
      const linked = (result?.all || []).filter((tb) => tb.personId);
      setTimeboards(linked);
      setSelectedId((current) => {
        const wanted = preferredId || current;
        return linked.some((tb) => tb.id === wanted) ? wanted : (linked[0]?.id || null);
      });
    })
    .catch(handleError), [handleError]);

  useEffect(() => { loadTimeboards(); }, [loadTimeboards]);

  // Logged in but not linked yet: accept an invitation code here
  const handleAcceptCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return setError(t('auth.inviteCode.required'));
    setIsAccepting(true);
    setError('');
    try {
      const result = await mobileApi.acceptInviteByCode(inviteCode.trim());
      setInviteCode('');
      await loadTimeboards(result?.timeboard?.id || null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsAccepting(false);
    }
  };

  const loadObligations = useCallback(() => {
    if (!selectedId) return;
    mobileApi.setSelectedTimeboardId(selectedId);
    setIsLoading(true);
    setError('');
    mobileApi.getObligations(selectedId)
      .then(setData)
      .catch(handleError)
      .finally(() => setIsLoading(false));
  }, [selectedId, handleError]);

  useEffect(() => { loadObligations(); }, [loadObligations]);

  const items = useMemo(() => data?.items || [], [data]);
  const years = useMemo(() => {
    const set = new Set(items.map((item) => item.date.substring(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(() => items.filter((item) => {
    if (year !== ALL && !item.date.startsWith(year)) return false;
    if (month !== ALL && Number(item.date.substring(5, 7)) - 1 !== month) return false;
    return true;
  }), [items, year, month]);

  const paidTotal = filtered.filter((item) => item.isPaid).reduce((sum, item) => sum + item.amount, 0);
  const pendingTotal = filtered.filter((item) => !item.isPaid).reduce((sum, item) => sum + item.amount, 0);
  const overdueCount = items.filter((item) => item.isOverdue).length;
  const debt = data?.debtBalance || 0;
  const debtColor = debt > 0 ? TimelineColor.DANGER : TimelineColor.SUCCESS;
  const selectedTimeboard = (timeboards || []).find((tb) => tb.id === selectedId);
  const shownError = error || notice;

  return (
    <div className={styles.screen}>
      {/* Header: timeboard, user, refresh and logout */}
      <div className={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.headerTitle}>{selectedTimeboard?.name || t('mobile.title')}</div>
          <div className={styles.headerSub}>{user?.name || user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className={styles.iconButton} onClick={loadObligations} aria-label={t('mobile.refresh')} title={t('mobile.refresh')} disabled={!selectedId}>
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
        <div className={styles.card}>
          <div className={styles.empty} style={{ padding: '6px 4px 14px' }}>{t('mobile.noLinkedTimeboards')}</div>
          <form onSubmit={handleAcceptCode}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="mobile-home-code">{t('auth.inviteCode.label')}</label>
              <input
                id="mobile-home-code"
                className={`${styles.input} ${styles.codeInput}`}
                placeholder={t('auth.inviteCode.placeholder')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
              />
            </div>
            <button type="submit" className={styles.primaryButton} disabled={isAccepting}>
              {isAccepting ? <Loader2 size={18} className={styles.spin} /> : <Ticket size={18} />}
              <span>{t('mobile.acceptInvite')}</span>
            </button>
          </form>
        </div>
      ) : (
        <>
          {timeboards.length > 1 && (
            <select className={styles.select} value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)} aria-label={t('mobile.timeboardLabel')}>
              {timeboards.map((tb) => <option key={tb.id} value={tb.id}>{tb.name}</option>)}
            </select>
          )}

          {/* Debt balance */}
          <div className={styles.debtCard} style={{ background: `linear-gradient(135deg, ${debtColor} 0%, ${debtColor}cc 100%)` }}>
            <div className={styles.debtLabel}>
              <Wallet size={15} />
              <span>{t('mobile.debtBalance')}</span>
            </div>
            <div className={styles.debtValue}>{formatCurrency(debt)}</div>
            <div className={styles.debtHint}>
              {debt > 0 ? t('mobile.overdueCount', { count: overdueCount }) : t('mobile.upToDate')}
            </div>
          </div>

          {/* Year / month filter */}
          <div className={styles.filters}>
            <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)} aria-label={t('mobile.yearLabel')}>
              <option value={ALL}>{t('mobile.allYears')}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className={styles.monthChips} role="group" aria-label={t('mobile.monthLabel')}>
              <button type="button" className={`${styles.chip} ${month === ALL ? styles.chipActive : ''}`} onClick={() => setMonthFilter(ALL)}>
                {t('mobile.allMonths')}
              </button>
              {MONTH_INDEXES.map((index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.chip} ${month === index ? styles.chipActive : ''}`}
                  onClick={() => setMonthFilter(index)}
                >
                  {format(setMonth(new Date(2000, 0, 1), index), 'MMM', { locale: dateLocale }).replace('.', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Paid / pending totals of the filtered period */}
          <div className={styles.totals}>
            <div className={styles.card}>
              <div className={styles.totalLabel}>{t('mobile.paid')}</div>
              <div className={styles.totalValue} style={{ color: TimelineColor.SUCCESS }}>{formatCurrency(paidTotal)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.totalLabel}>{t('mobile.pending')}</div>
              <div className={styles.totalValue} style={{ color: pendingTotal > 0 ? TimelineColor.WARNING : 'var(--text-main)' }}>{formatCurrency(pendingTotal)}</div>
            </div>
          </div>

          {/* Installments */}
          <div className={styles.list}>
            {isLoading && !data ? (
              <Loader2 size={24} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
            ) : filtered.length === 0 ? (
              <div className={`${styles.card} ${styles.empty}`}>{t('mobile.noInstallments')}</div>
            ) : filtered.map((item) => {
              const state = itemState(item);
              const StateIcon = state.Icon;
              return (
                <div key={`${item.id}-${item.date}`} className={styles.item}>
                  <div className={styles.itemIcon} style={{ background: `${state.color}1f`, color: state.color }}>
                    <StateIcon size={18} />
                  </div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemMeta}>
                      {t('mobile.dueOn', { date: format(parseISO(item.date), 'dd MMM yyyy', { locale: dateLocale }) })}
                      {item.timelineName ? ` · ${item.timelineName}` : ''}
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <div className={styles.itemAmount}>{formatCurrency(item.amount)}</div>
                    <span className={styles.badge} style={{ background: `${state.color}1f`, color: state.color }}>
                      {t(`mobile.status.${state.key}`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
