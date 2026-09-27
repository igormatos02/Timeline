import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw, AlertCircle, CheckCircle2, Clock, Wallet, Loader2, Ticket, Crown, UserCheck } from 'lucide-react';
import { format, parseISO, setMonth } from 'date-fns';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor, PersonRole, EventStatus } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import * as mobileApi from './mobileApi.js';
import styles from './MobileApp.module.css';

const ALL = 'all';
// "All years" covers everything up to the end of the current month (no future installments)
const currentYear = String(new Date().getFullYear());
const endOfCurrentMonth = () => `${new Date().toISOString().substring(0, 7)}-31`;
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
  const [year, setYear] = useState(currentYear);
  const [month, setMonthFilter] = useState(ALL);
  // Status filter from the totals cards: all, paid or pending
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [inviteCode, setInviteCode] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  // Admins choose between their own (individual) view and the admin view of any entity
  const [viewModeChoice, setViewModeChoice] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  const handleError = useCallback((err) => {
    if (err instanceof mobileApi.SessionExpiredError) onSessionExpired();
    else setError(err.message || t('auth.errors.requestFailed'));
  }, [onSessionExpired, t]);

  // Timeboards where the user is linked to a person (the ones with installments) or is admin
  const loadTimeboards = useCallback((preferredId = null) => mobileApi.getTimeboards()
    .then((result) => {
      const linked = (result?.all || []).filter((tb) => tb.personId || tb.role === PersonRole.ADMIN);
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

  const selectedTimeboard = (timeboards || []).find((tb) => tb.id === selectedId);
  const isAdmin = selectedTimeboard?.role === PersonRole.ADMIN;
  const hasOwnEntity = Boolean(selectedTimeboard?.personId);
  // Individual members always see their own view; admins default to it when they have an entity
  const viewMode = isAdmin
    ? (viewModeChoice || (hasOwnEntity ? PersonRole.INDIVIDUAL : PersonRole.ADMIN))
    : PersonRole.INDIVIDUAL;
  const isAdminView = viewMode === PersonRole.ADMIN;

  const selectTimeboard = (id) => {
    setSelectedId(id);
    setViewModeChoice(null);
    setSelectedEntityId(null);
  };

  // Admin view: the timeboard's entities (with their debt balance)
  useEffect(() => {
    if (!isAdminView || !selectedId) return;
    mobileApi.getEntities(selectedId)
      .then((list) => {
        setEntities(list);
        setSelectedEntityId((current) => (list.some((e) => e.id === current) ? current : (list[0]?.id || null)));
      })
      .catch(handleError);
  }, [isAdminView, selectedId, handleError]);

  const loadObligations = useCallback(() => {
    if (!selectedId) return;
    mobileApi.setSelectedTimeboardId(selectedId);
    const personId = isAdminView ? selectedEntityId : null;
    // Nothing to show: admin view without an entity yet, or individual view without an own entity
    if ((isAdminView && !personId) || (!isAdminView && !hasOwnEntity)) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError('');
    mobileApi.getObligations(selectedId, personId)
      .then(setData)
      .catch(handleError)
      .finally(() => setIsLoading(false));
  }, [selectedId, isAdminView, selectedEntityId, hasOwnEntity, handleError]);

  useEffect(() => { loadObligations(); }, [loadObligations]);

  const items = useMemo(() => data?.items || [], [data]);
  // Year chips: the years with installments, up to the current year
  const years = useMemo(() => {
    const set = new Set(items.map((item) => item.date.substring(0, 4)).filter((y) => y <= currentYear));
    set.add(currentYear);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Period filter (year / month); the totals use it, the list also applies the status filter
  const inPeriod = useMemo(() => items.filter((item) => {
    if (year === ALL && item.date > endOfCurrentMonth()) return false;
    if (year !== ALL && !item.date.startsWith(year)) return false;
    if (month !== ALL && Number(item.date.substring(5, 7)) - 1 !== month) return false;
    return true;
  }), [items, year, month]);
  const filtered = useMemo(() => inPeriod.filter((item) => (
    statusFilter === ALL || (statusFilter === EventStatus.PAID ? item.isPaid : !item.isPaid)
  )), [inPeriod, statusFilter]);
  const toggleStatus = (status) => setStatusFilter((current) => (current === status ? ALL : status));

  const paidTotal = inPeriod.filter((item) => item.isPaid).reduce((sum, item) => sum + item.amount, 0);
  const pendingTotal = inPeriod.filter((item) => !item.isPaid).reduce((sum, item) => sum + item.amount, 0);
  const overdueCount = items.filter((item) => item.isOverdue).length;
  const debt = data?.debtBalance || 0;
  const debtColor = debt > 0 ? TimelineColor.DANGER : TimelineColor.SUCCESS;
  const shownError = error || notice;

  return (
    <div className={styles.screen}>
      {/* Header: timeboard, user, refresh and logout */}
      <div className={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.headerTitle}>{selectedTimeboard?.name || t('mobile.title')}</div>
          <div className={styles.headerSub}>
            {isAdminView
              ? (entities.find((entity) => entity.id === selectedEntityId)?.name || t('mobile.views.admin'))
              : (user?.name || user?.email)}
          </div>
          {selectedTimeboard && (
            <div className={styles.badgeRow}>
              <span className={styles.metaBadge}>
                {selectedTimeboard.isShared ? <UserCheck size={12} /> : <Crown size={12} />}
                {selectedTimeboard.isShared ? t('mobile.invited') : t('mobile.ownTimeboard')}
              </span>
              <span className={styles.metaBadge}>{t(`timeboardSettings.entities.roles.${selectedTimeboard.role || PersonRole.INDIVIDUAL}`)}</span>
            </div>
          )}
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
            <select className={styles.select} value={selectedId || ''} onChange={(e) => selectTimeboard(e.target.value)} aria-label={t('mobile.timeboardLabel')}>
              {timeboards.map((tb) => <option key={tb.id} value={tb.id}>{tb.name}</option>)}
            </select>
          )}

          {/* Admins: individual (own) view or admin view of any entity */}
          {isAdmin && (
            <div className={styles.tabs} role="tablist" aria-label={t('mobile.viewLabel')} style={{ marginBottom: 0 }}>
              {[PersonRole.INDIVIDUAL, PersonRole.ADMIN].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  className={`${styles.tab} ${viewMode === mode ? styles.tabActive : ''}`}
                  onClick={() => setViewModeChoice(mode)}
                >
                  {t(`mobile.views.${mode}`)}
                </button>
              ))}
            </div>
          )}

          {isAdminView && entities.length > 0 && (
            <select className={styles.select} value={selectedEntityId || ''} onChange={(e) => setSelectedEntityId(e.target.value)} aria-label={t('mobile.entityLabel')}>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.debtBalance > 0 ? `${entity.name} · ${formatCurrency(entity.debtBalance)}` : entity.name}
                </option>
              ))}
            </select>
          )}

          {!isAdminView && !hasOwnEntity ? (
            <div className={`${styles.card} ${styles.empty}`}>{t('mobile.noOwnEntity')}</div>
          ) : isAdminView && entities.length === 0 ? (
            <div className={`${styles.card} ${styles.empty}`}>{t('mobile.noEntities')}</div>
          ) : (
          <>

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
            <div className={styles.monthChips} role="group" aria-label={t('mobile.yearLabel')}>
              <button type="button" className={`${styles.chip} ${year === ALL ? styles.chipActive : ''}`} onClick={() => setYear(ALL)}>
                {t('mobile.allYears')}
              </button>
              {years.map((y) => (
                <button key={y} type="button" className={`${styles.chip} ${year === y ? styles.chipActive : ''}`} onClick={() => setYear(y)}>
                  {y}
                </button>
              ))}
            </div>
            <div className={styles.monthChips} role="group" aria-label={t('mobile.monthLabel')}>
              <button type="button" className={`${styles.chip} ${month === ALL ? styles.chipActive : ''}`} onClick={() => setMonthFilter(ALL)}>
                {t('mobile.allMonths')}
              </button>
              {MONTH_INDEXES.map((index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.chip} ${styles.monthChip} ${month === index ? styles.chipActive : ''}`}
                  onClick={() => setMonthFilter(index)}
                >
                  {format(setMonth(new Date(2000, 0, 1), index), 'MMM', { locale: dateLocale }).replace('.', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Paid / pending totals of the period — tap to show only those installments (tap again: all) */}
          <div className={styles.totals}>
            <button
              type="button"
              aria-pressed={statusFilter === EventStatus.PAID}
              className={`${styles.card} ${styles.totalButton} ${statusFilter === EventStatus.PAID ? styles.totalActive : ''}`}
              onClick={() => toggleStatus(EventStatus.PAID)}
            >
              <div className={styles.totalLabel}>{t('mobile.paid')}</div>
              <div className={styles.totalValue} style={{ color: TimelineColor.SUCCESS }}>{formatCurrency(paidTotal)}</div>
            </button>
            <button
              type="button"
              aria-pressed={statusFilter === EventStatus.PENDING}
              className={`${styles.card} ${styles.totalButton} ${statusFilter === EventStatus.PENDING ? styles.totalActive : ''}`}
              onClick={() => toggleStatus(EventStatus.PENDING)}
            >
              <div className={styles.totalLabel}>{t('mobile.pending')}</div>
              <div className={styles.totalValue} style={{ color: pendingTotal > 0 ? TimelineColor.WARNING : 'var(--text-main)' }}>{formatCurrency(pendingTotal)}</div>
            </button>
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
        </>
      )}
    </div>
  );
}
