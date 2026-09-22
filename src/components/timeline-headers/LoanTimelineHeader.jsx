import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Settings,
  Sparkles,
  Building2,
  FileText,
  Calendar,
  Percent,
  CheckCircle2,
  Clock,
  ChevronDown,
  Wallet,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { LoanAmortizationSystem, TimelineColor, TimelineStatus } from '../../enums/index.js';
import { getPaletteTheme } from '../../../shared/config/colorPalettes.js';
import { DonutChart } from '../ui/DonutChart.jsx';
import CopyIdButton from '../ui/CopyIdButton.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';

export default function LoanTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onToggleStatus,
  onDelete,
  onAddEvent,
  onOpenAmortizationModal
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  const paletteTheme = useMemo(() => {
    return getPaletteTheme(timeline?.color, TimelineColor.PRIMARY);
  }, [timeline?.color]);

  if (!timeline) return null;

  const isInactive =
    timeline.status === TimelineStatus.INACTIVE ||
    timeline.status === 'inactive';

  const headerColor = isInactive
    ? TimelineColor.SLATE
    : paletteTheme.primary;

  /*
   * getLoanMetrics() is responsible for reading the TimelineEvent
   * properties:
   *
   *   installmentAmount
   *   installmentCapital
   *   installmentInterest
   *   installmentFee
   *
   * This component only consumes the calculated metrics and never
   * accesses legacy event properties such as:
   *
   *   amount
   *   principalAmount
   *   interestPortion
   *   taxAmount
   *   interestAmount
   */
  const loanMetrics =
    timeline.loanHeaderResult ||
    timeline.procedureMetrics ||
    timeline.metrics ||
    {};

  const contractNumber =
    timeline.contractNumber ||
    timeline.contract_number ||
    timeline.loanContract?.contractNumber ||
    timeline.loanContract?.contract_number ||
    loanMetrics.contractNumber ||
    loanMetrics.contract_number ||
    '';

  const bankName =
    timeline.bankName ||
    timeline.bank_name ||
    timeline.loanContract?.bankName ||
    timeline.loanContract?.bank_name ||
    timeline.institution ||
    timeline.loanContract?.institution ||
    loanMetrics.bankName ||
    loanMetrics.bank_name ||
    '';

  const formatDateShort = (dateStr) => {
    try {
      if (!dateStr) return '';

      return format(
        parseISO(dateStr),
        'dd/MM/yyyy',
        { locale: pt }
      );
    } catch {
      return dateStr;
    }
  };

  const totalDays = (() => {
    try {
      if (
        !timeline.startDate ||
        !timeline.endDate
      ) {
        return 0;
      }

      return differenceInCalendarDays(
        parseISO(timeline.endDate),
        parseISO(timeline.startDate)
      );
    } catch {
      return 0;
    }
  })();

  const progressPercent =
    loanMetrics.progressPercent ?? 0;

  // Annual Commitment — monthly installment × 12 vs projected annual income
  const annualLoanCost = (() => {
    // 1. Try loanMetrics (computed by getLoanMetrics)
    const fromMetrics = Number(
      loanMetrics.currentInstallmentAmount ??
      loanMetrics.nextInstallment?.installmentAmount ??
      loanMetrics.installmentAmount ?? 0
    );
    if (fromMetrics > 0) return fromMetrics * 12;

    // 2. Try loanContract stored on timeline
    const fromContract = Number(
      timeline.loanContract?.installmentAmount ??
      timeline.installmentAmount ?? 0
    );
    if (fromContract > 0) return fromContract * 12;

    // 3. Scan timeline.events for any loan installment
    const evList = timeline.events || [];
    const sample = evList.find(
      (ev) => ev && (ev.eventType === 'loan_installment' || ev.isSystemLoanEvent) &&
        ev.eventType !== 'amortization'
    );
    const fromEvent = Number(sample?.installmentAmount || sample?.amount || 0);
    return fromEvent > 0 ? fromEvent * 12 : 0;
  })();

  const annualIncomeProjected = (() => {
    // timeline.events contains ALL computed events (income, expense, loan installments etc.)
    // set by App.jsx: { ...currentSelected, events: computedEvents }
    const evList = timeline.events || [];
    const now = new Date();
    const sy = now.getFullYear();
    const sm = now.getMonth();
    const startMK = `${sy}-${String(sm + 1).padStart(2, '0')}`;
    const etm = sm + 12;
    const ey = sy + Math.floor(etm / 12);
    const em = etm % 12;
    const endMK = `${ey}-${String(em + 1).padStart(2, '0')}`;
    let total = 0;
    evList.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
      const mk = ev.date.substring(0, 7);
      if (mk < startMK || mk >= endMK) return;
      if (ev.eventType === 'income' || ev.isIncome) total += Number(ev.amount || 0);
    });
    return total;
  })();

  const annualCommitmentPct = annualIncomeProjected > 0
    ? Math.round((annualLoanCost / annualIncomeProjected) * 100)
    : 0;

  // Visual text colors
  const textColorMain = isInactive
    ? TimelineColor.SLATE
    : 'var(--text-main)';

  const textColorLight = isInactive
    ? TimelineColor.SLATE
    : paletteTheme.primary;

  const textColorGreen = isInactive
    ? TimelineColor.SLATE
    : TimelineColor.SUCCESS;

  const textColorOrange = isInactive
    ? TimelineColor.SLATE
    : TimelineColor.WARNING;

  const textColorDim = isInactive
    ? TimelineColor.SLATE
    : 'var(--text-dim)';

  const textColorMuted = isInactive
    ? TimelineColor.SLATE
    : 'var(--text-muted)';

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      toggleColor={textColorMain}
      containerStyle={{
        transition: 'filter 0.3s ease',
        filter: isInactive
          ? 'grayscale(85%) opacity(0.85)'
          : 'none'
      }}
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: '800',
                color: textColorMain,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{timeline.name}</span>
              {timeline.id && <CopyIdButton id={timeline.id} />}
            </h1>

            {/* Active / inactive */}
            {(onToggleStatus || onEdit) && (
              <div
                title={
                  isInactive
                    ? t('loanHeader.activateTitle')
                    : t('loanHeader.deactivateTitle')
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '4px'
                }}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isInactive}
                  onClick={() => {
                    const newStatus =
                      isInactive
                        ? 'active'
                        : 'inactive';

                    if (onToggleStatus) {
                      onToggleStatus(
                        timeline,
                        newStatus
                      );
                    } else if (onEdit) {
                      onEdit({
                        ...timeline,
                        status: newStatus
                      });
                    }
                  }}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '9999px',
                    background: isInactive
                      ? 'rgba(148, 163, 184, 0.3)'
                      : `linear-gradient(135deg, ${TimelineColor.SUCCESS} 0%, rgba(5, 150, 105, 1) 100%)`,
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition:
                      'background 0.25s ease, box-shadow 0.25s ease',
                    padding: 0,
                    boxShadow: isInactive
                      ? 'none'
                      : '0 0 8px rgba(16, 185, 129, 0.4)',
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: TimelineColor.WHITE,
                      position: 'absolute',
                      top: '3px',
                      left: isInactive
                        ? '3px'
                        : '19px',
                      transition:
                        'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow:
                        '0 1px 3px rgba(0,0,0,0.3)'
                    }}
                  />
                </button>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: isInactive
                      ? 'var(--text-muted)'
                      : TimelineColor.SUCCESS,
                    userSelect: 'none'
                  }}
                >
                  {isInactive
                    ? t('loanHeader.statusInactive')
                    : t('loanHeader.statusActive')}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              margin: '3px 0 0',
              fontSize: '0.78rem',
              color: textColorMuted,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {timeline.description && (
              <span>
                {timeline.description}
              </span>
            )}

            {bankName && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isInactive
                    ? 'rgba(148, 163, 184, 0.1)'
                    : 'rgba(99, 102, 241, 0.09)',
                  border: isInactive
                    ? '1px solid rgba(148, 163, 184, 0.2)'
                    : `1px solid ${headerColor}33`,
                  color: isInactive ? 'var(--text-muted)' : headerColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={t('loanModal.bankNameLabel')}
              >
                <Building2 size={12} style={{ flexShrink: 0 }} />
                <span>{bankName}</span>
              </span>
            )}

            {contractNumber && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  color: textColorMain,
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={t('loanModal.contractNumberLabel')}
              >
                <FileText size={12} style={{ color: headerColor, flexShrink: 0 }} />
                <span>{t('loanHeader.contractNumberShort')}: {contractNumber}</span>
              </span>
            )}
          </div>
        </div>
      }
      right={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('common.edit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
            >
              <Settings size={14} />
              <span>{t('common.edit')}</span>
            </button>
          )}
        </div>
      }
    >
      {/* =========================================================
          METRICS
          ========================================================= */}

      {!collapsed && (
        <div
          style={{
            paddingTop: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* =====================================================
              SECTION 1 — DEBT / AMORTIZED
              ===================================================== */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px'
            }}
          >
            {/* 1. SALDO DEVEDOR card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  letterSpacing: '0.5px'
                }}
              >
                {t('loanHeader.remainingDebt') ||
                  'Saldo Devedor'}
              </div>

              {(() => {
                const remDebt = loanMetrics.remainingDebt ?? loanMetrics.remainingBalance ?? 0;
                const futureTotalInstallments = loanMetrics.futureTotal ?? (remDebt + (loanMetrics.futureInterest ?? 0) + (loanMetrics.futureFee ?? 0));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          color: isInactive ? 'var(--text-dim)' : textColorLight,
                          lineHeight: 1.1
                        }}
                      >
                        {formatCurrency(remDebt)}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: textColorMuted,
                          marginTop: '2px'
                        }}
                      >
                        {t('loanHeader.capitalStillDue')}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '6px' }}>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          color: isInactive ? 'var(--text-dim)' : textColorMain,
                          lineHeight: 1.1
                        }}
                      >
                        {formatCurrency(futureTotalInstallments)}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: textColorMuted,
                          marginTop: '2px'
                        }}
                      >
                        {t('loanHeader.installmentStillDue')}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. ANNUAL COMMITMENT Donut card */}
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
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  letterSpacing: '0.5px'
                }}
              >
                {t('loanHeader.annualCommitmentTitle')}
              </div>

              {(() => {
                if (annualLoanCost === 0 && annualIncomeProjected === 0) {
                  return (
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
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {t('loanHeader.noAnnualCommitment')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('loanHeader.noAnnualCommitmentHint')}
                        </span>
                      </div>
                    </div>
                  );
                }

                const sliceColor = isInactive ? TimelineColor.SLATE : annualCommitmentPct >= 80 ? TimelineColor.DANGER : TimelineColor.WARNING;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={annualCommitmentPct}
                      sliceColor={sliceColor}
                      remainingColor="rgba(255, 255, 255, 0.08)"
                      title={`${t('loanHeader.annualCommitmentLabel')} ${annualCommitmentPct}%`}
                      label={`${annualCommitmentPct}%`}
                    />

                    {/* Informações Numéricas de Dívidas vs Entradas Anuais */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('loanHeader.annualCommitmentLabel')}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: isInactive ? 'var(--text-dim)' : 'var(--text-main)' }}>
                        {formatCurrency(annualLoanCost)}
                      </div>
                      {annualIncomeProjected > 0 ? (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('loanHeader.ofAnnualTotal', { amount: formatCurrency(annualIncomeProjected) })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('loanHeader.projectedNext12Months')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. CAPITAL AMORTIZADO Donut card */}
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
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  letterSpacing: '0.5px'
                }}
              >
                {t('loanHeader.amortizedCapital') ||
                  'Capital Amortizado'}
              </div>

              {(() => {
                const amortizedCap = loanMetrics.amortizedCapital ?? 0;
                const origCapital = loanMetrics.originalCapital ?? timeline.loanContract?.financedAmount ?? 0;

                if (amortizedCap === 0 && origCapital === 0) {
                  return (
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
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {formatCurrency(0)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('loanHeader.ofOriginalCapital', { percent: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                }

                const sliceColor = isInactive ? TimelineColor.SLATE : textColorGreen;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={progressPercent}
                      sliceColor={sliceColor}
                      remainingColor="rgba(255, 255, 255, 0.08)"
                      title={`${t('loanHeader.amortizedCapital')} ${progressPercent}%`}
                      label={`${progressPercent}%`}
                    />

                    {/* Informações Numéricas de Capital Amortizado */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('loanHeader.amortizedCapital')}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: isInactive ? 'var(--text-dim)' : textColorGreen }}>
                        {formatCurrency(amortizedCap)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {origCapital > 0
                          ? t('loanHeader.ofOriginalCapitalAmount', { amount: formatCurrency(origCapital) })
                          : t('loanHeader.ofOriginalCapital', { percent: progressPercent })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>


          {/* Progress */}
          <div className="timeline-progress-container">
            <div
              className="progress-header"
              style={{
                fontSize: '0.72rem',
                marginBottom: '3px',
                color: textColorMuted
              }}
            >
              <span>
                {t(
                  'loanHeader.progressTitle'
                ) ||
                  'Progresso de Amortização do Capital'}
              </span>

              <span>
                {(
                  t(
                    'loanHeader.percentAmortized'
                  ) ||
                  '{percent}% amortizado'
                ).replace(
                  '{percent}',
                  progressPercent
                )}
              </span>
            </div>

            <div
              className="progress-track"
              style={{ height: '6px' }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: isInactive
                    ? TimelineColor.SLATE
                    : `linear-gradient(90deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`,
                  boxShadow: isInactive ? 'none' : `0 0 10px ${paletteTheme.primary}45`
                }}
              />
            </div>
          </div>

          {/* =====================================================
              SECTION 2 — INSTALLMENTS
              ===================================================== */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              borderTop:
                '1px solid var(--border-glass)',
              paddingTop: '12px'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '700'
                }}
              >
                {t('loanHeader.installments') ||
                  'Parcelas'}
              </div>

              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: textColorMain
                }}
              >
                {loanMetrics.paidInstallments ?? 0}{' '}
                /{' '}
                {timeline.totalInstallments || timeline.loanContract?.totalInstallments || loanMetrics.totalInstallments || 0}
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: textColorMuted
                }}
              >
                {(
                  t(
                    'loanHeader.installmentsRemaining'
                  ) ||
                  '{count} restantes'
                ).replace(
                  '{count}',
                  Math.max(0, (timeline.totalInstallments || timeline.loanContract?.totalInstallments || loanMetrics.totalInstallments || 0) - (loanMetrics.paidInstallments || 0))
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '700'
                }}
              >
                {t(
                  'loanHeader.estimatedPayoff'
                ) ||
                  'Quitação Prevista'}
              </div>

              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: textColorMain
                }}
              >
                {formatDateShort(
                  loanMetrics.estimatedPayoffDate
                ) || '-'}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '700'
                }}
              >
                {t(
                  'loanHeader.currentInstallment'
                ) ||
                  'Prestação Atual'}
              </div>

              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: textColorLight
                }}
              >
                {formatCurrency(
                  loanMetrics.currentInstallmentAmount ??
                  0
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: textColorDim,
                  textTransform: 'uppercase',
                  fontWeight: '700'
                }}
              >
                {t(
                  'loanHeader.nextDueDate'
                ) ||
                  'Próximo Vencimento'}
              </div>

              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: textColorMain
                }}
              >
                {formatDateShort(
                  loanMetrics.nextDueDate
                ) || '-'}
              </div>
            </div>
          </div>

          {/* =====================================================
              SECTION 3 — FINANCIAL SUMMARY
              ===================================================== */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '14px',
              borderTop:
                '1px solid var(--border-glass)',
              paddingTop: '12px'
            }}
          >
            {/* ===================================================
                DEBT COMPOSITION
                =================================================== */}

            <div
              style={{
                background:
                  'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: '8px',
                border:
                  '1px solid var(--border-glass)'
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  color: textColorLight,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Wallet
                  size={14}
                  style={{
                    color: textColorLight
                  }}
                />

                <span>
                  {t('loanHeader.debtCompositionTitle')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.78rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.capitalStillDueLabel'
                    ) ||
                      'CAPITAL AINDA DEVIDO'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.futureCapital ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.estimatedFutureInterest'
                    ) ||
                      'JUROS FUTUROS ESTIMADOS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.futureInterest ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.estimatedFutureFees'
                    ) ||
                      'IMPOSTOS / TAXAS FUTURAS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.futureFee ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    borderTop:
                      '1px dashed var(--border-glass)',
                    paddingTop: '4px',
                    marginTop: '2px',
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    fontWeight: '800'
                  }}
                >
                  <span
                    style={{
                      color: textColorMain
                    }}
                  >
                    {t(
                      'loanHeader.totalFutureToPay'
                    ) ||
                      'TOTAL FUTURO A PAGAR'}
                  </span>

                  <span
                    style={{
                      color: textColorLight
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.futureTotal ??
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ===================================================
                WHAT I PAID
                =================================================== */}

            <div
              style={{
                background:
                  'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: '8px',
                border:
                  '1px solid var(--border-glass)'
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  color: textColorGreen,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PieChart
                  size={14}
                  style={{
                    color: textColorGreen
                  }}
                />

                <span>
                  {t('loanHeader.whatIPaidTitle')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.78rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.amortizedCapitalLabel'
                    ) ||
                      'CAPITAL AMORTIZADO'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.amortizedCapital ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.interestPaid'
                    ) ||
                      'JUROS PAGOS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalInterestPaid ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.feesPaid'
                    ) ||
                      'IMPOSTOS / TAXAS PAGAS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalFeePaid ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    borderTop:
                      '1px dashed var(--border-glass)',
                    paddingTop: '4px',
                    marginTop: '2px',
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    fontWeight: '800'
                  }}
                >
                  <span
                    style={{
                      color: textColorMain
                    }}
                  >
                    {t(
                      'loanHeader.totalAlreadyPaid'
                    ) ||
                      'TOTAL JÁ PAGO'}
                  </span>

                  <span
                    style={{
                      color: textColorGreen
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalPaid ??
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ===================================================
                LOAN COST
                =================================================== */}

            <div
              style={{
                background:
                  'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: '8px',
                border:
                  '1px solid var(--border-glass)'
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  color: textColorOrange,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <TrendingUp
                  size={14}
                  style={{
                    color: textColorOrange
                  }}
                />

                <span>
                  {t('loanHeader.loanCostTitle')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.78rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.originalCapital'
                    ) ||
                      'CAPITAL ORIGINAL'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.originalCapital ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.totalEstimatedInterest'
                    ) ||
                      'JUROS TOTAIS ESTIMADOS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalEstimatedInterest ??
                      loanMetrics.futureInterest ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <span
                    style={{
                      color: textColorDim
                    }}
                  >
                    {t(
                      'loanHeader.totalEstimatedFees'
                    ) ||
                      'IMPOSTOS / TAXAS TOTAIS'}
                  </span>

                  <span
                    style={{
                      fontWeight: '700',
                      color: textColorMain
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalEstimatedFee ??
                      0
                    )}
                  </span>
                </div>

                <div
                  style={{
                    borderTop:
                      '1px dashed var(--border-glass)',
                    paddingTop: '4px',
                    marginTop: '2px',
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    fontWeight: '800'
                  }}
                >
                  <span
                    style={{
                      color: textColorMain
                    }}
                  >
                    {t(
                      'loanHeader.totalLoanCost'
                    ) ||
                      'CUSTO TOTAL DO EMPRÉSTIMO'}
                  </span>

                  <span
                    style={{
                      color: textColorOrange
                    }}
                  >
                    {formatCurrency(
                      loanMetrics.totalLoanCost ??
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </HeaderShell>
  );
}