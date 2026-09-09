import React, { useState } from 'react';
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  Wallet,
  PieChart,
  TrendingUp,
  Settings,
  Trash2,
  Copy,
  Check,
  Building2,
  FileText
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/loanCalculations';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

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
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e) => {
    e.stopPropagation();
    if (timeline?.id) {
      navigator.clipboard.writeText(String(timeline.id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    }
  };

  if (!timeline) return null;

  const isInactive =
    timeline.status === 'inactive' ||
    timeline.status === 'INACTIVE';

  const headerColor = isInactive
    ? '#94a3b8'
    : (timeline.color || '#6366f1');

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
    ? '#94a3b8'
    : 'var(--text-main)';

  const textColorLight = isInactive
    ? '#64748b'
    : 'var(--primary-light)';

  const textColorGreen = isInactive
    ? '#64748b'
    : '#10b981';

  const textColorOrange = isInactive
    ? '#64748b'
    : '#f59e0b';

  const textColorDim = isInactive
    ? '#64748b'
    : 'var(--text-dim)';

  const textColorMuted = isInactive
    ? '#64748b'
    : 'var(--text-muted)';

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''
        }`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed
          ? '12px 18px'
          : '16px 20px',
        marginBottom: '10px',
        transition:
          'padding 0.2s ease, box-shadow 0.2s ease, filter 0.3s ease',
        boxShadow: 'var(--shadow-sm)',
        filter: isInactive
          ? 'grayscale(85%) opacity(0.85)'
          : 'none'
      }}
    >
      {/* =========================================================
          HEADER
          ========================================================= */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: collapsed
            ? '0'
            : '12px',
          borderBottom: collapsed
            ? 'none'
            : '1px solid var(--border-glass)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {/* Collapse */}
          <button
            type="button"
            onClick={() =>
              setIsCollapsed(!collapsed)
            }
            aria-label={
              collapsed
                ? 'Expandir cabeçalho'
                : 'Recolher cabeçalho'
            }
            title={
              collapsed
                ? 'Expandir cabeçalho'
                : 'Recolher cabeçalho'
            }
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border:
                '1px solid var(--border-glass)',
              color: textColorMain,
              cursor: 'pointer',
              transition:
                'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? (
              <ChevronDown size={17} />
            ) : (
              <ChevronUp size={17} />
            )}
          </button>

          {/* Loan icon */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: isInactive
                ? 'rgba(148, 163, 184, 0.12)'
                : 'rgba(99, 102, 241, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <CreditCard size={18} />
          </div>

          {/* Title */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: textColorMain
                }}
              >
                {timeline.name}
              </h1>

              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isInactive
                    ? 'rgba(148, 163, 184, 0.15)'
                    : 'rgba(99, 102, 241, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                {t('loanHeader.loanBadge') ||
                  'Empréstimo'}
              </span>

              {/* Active / inactive */}
              {(onToggleStatus || onEdit) && (
                <div
                  title={
                    isInactive
                      ? (
                        t(
                          'loanHeader.activateTitle'
                        ) ||
                        'Ativar empréstimo (inclui-o nos totais do balanço)'
                      )
                      : (
                        t(
                          'loanHeader.deactivateTitle'
                        ) ||
                        'Desativar empréstimo (remover temporariamente dos totais do balanço)'
                      )
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
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                        background: '#ffffff',
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
                        : '#10b981',
                      userSelect: 'none'
                    }}
                  >
                    {isInactive
                      ? (
                        t(
                          'loanHeader.statusInactive'
                        ) ||
                        'Inativo'
                      )
                      : (
                        t(
                          'loanHeader.statusActive'
                        ) ||
                        'Ativo'
                      )}
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
                  title={t('loanModal.bankNameLabel') || 'Instituição Financeira'}
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
                  title={t('loanModal.contractNumberLabel') || 'Número do Contrato'}
                >
                  <FileText size={12} style={{ color: headerColor, flexShrink: 0 }} />
                  <span>{t('loanHeader.contractNumberShort') || 'Nº Contrato'}: {contractNumber}</span>
                </span>
              )}

              {timeline.id && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background:
                      'rgba(255, 255, 255, 0.06)',
                    border:
                      '1px solid var(--border-glass)',
                    color: textColorDim,
                    fontFamily: 'monospace',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ userSelect: 'all' }}>ID: {timeline.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title={copiedId ? 'Copiado!' : 'Copiar ID'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '1px 2px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: copiedId ? '#10b981' : 'var(--text-muted)',
                      borderRadius: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedId ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
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
              title={
                t(
                  'loanHeader.editContractTitle'
                ) ||
                'Timeline Settings'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'rgba(99, 102, 241, 0.1)',
                border:
                  '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition:
                  'all 0.15s ease'
              }}
            >
              <Settings size={15} />
            </button>
          )}

          {onDelete &&
            !timeline.isSystemDefault && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={onDelete}
                title={
                  t(
                    'loanHeader.deleteContractTitle'
                  ) ||
                  'Eliminar este contrato de empréstimo e todas as suas prestações associadas'
                }
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

                <span>
                  {t(
                    'loanHeader.deleteContract'
                  ) || 'Excluir'}
                </span>
              </button>
            )}
        </div>
      </div>

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
                        {t('loanHeader.capitalStillDue') || 'Capital ainda devido'}
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
                        {t('loanHeader.installmentStillDue') || 'Instalment still due'}
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
                {t('loanHeader.annualCommitmentTitle') || 'COMPROMETIMENTO ANUAL'}
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
                            background: 'var(--bg-card, #0f172a)',
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
                          {t('loanHeader.noAnnualCommitment') || 'Sem compromisso anual'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('loanHeader.noAnnualCommitmentHint') || 'Sem dados anuais projetados.'}
                        </span>
                      </div>
                    </div>
                  );
                }

                const usedFraction = Math.min(1, Math.max(0, annualCommitmentPct / 100));
                const sliceX = Math.cos(2 * Math.PI * usedFraction);
                const sliceY = Math.sin(2 * Math.PI * usedFraction);
                const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                const sliceColor = isInactive ? '#94a3b8' : annualCommitmentPct >= 80 ? '#f43f5e' : '#f59e0b';
                const remainingColor = 'rgba(255, 255, 255, 0.08)';

                const pathData = usedFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    {/* PieChart Donut SVG para % Anual */}
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Fundo (Restante / Livre) */}
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {/* Fatia Comprometida */}
                        {usedFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`${t('loanHeader.annualCommitmentLabel') || 'Comprometimento Anual'} ${annualCommitmentPct}%`}</title>
                          </path>
                        )}
                      </svg>
                      {/* Miolo Donut com % Anual */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'var(--bg-card, #0f172a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-glass)',
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: sliceColor
                        }}
                      >
                        {annualCommitmentPct}%
                      </div>
                    </div>

                    {/* Informações Numéricas de Dívidas vs Entradas Anuais */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('loanHeader.annualCommitmentLabel') || 'Comprometimento Anual'}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: isInactive ? 'var(--text-dim)' : 'var(--text-main)' }}>
                        {formatCurrency(annualLoanCost)}
                      </div>
                      {annualIncomeProjected > 0 ? (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('loanHeader.ofAnnualTotal', { amount: formatCurrency(annualIncomeProjected) }) || `de ${formatCurrency(annualIncomeProjected)} total anual`}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('loanHeader.projectedNext12Months') || 'projetado nos próximos 12 meses'}
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
                            background: 'var(--bg-card, #0f172a)',
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
                          {(t('loanHeader.ofOriginalCapital') || '0% do capital original').replace('{percent}', 0)}
                        </span>
                      </div>
                    </div>
                  );
                }

                const usedFraction = Math.min(1, Math.max(0, progressPercent / 100));
                const sliceX = Math.cos(2 * Math.PI * usedFraction);
                const sliceY = Math.sin(2 * Math.PI * usedFraction);
                const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                const sliceColor = isInactive ? '#94a3b8' : textColorGreen;
                const remainingColor = 'rgba(255, 255, 255, 0.08)';

                const pathData = usedFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    {/* PieChart Donut SVG para % Amortizado */}
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Fundo (Restante / Devido) */}
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {/* Fatia Amortizada */}
                        {usedFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`${t('loanHeader.amortizedCapital') || 'Capital Amortizado'} ${progressPercent}%`}</title>
                          </path>
                        )}
                      </svg>
                      {/* Miolo Donut com % */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'var(--bg-card, #0f172a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-glass)',
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: sliceColor
                        }}
                      >
                        {progressPercent}%
                      </div>
                    </div>

                    {/* Informações Numéricas de Capital Amortizado */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('loanHeader.amortizedCapital') || 'Capital Amortizado'}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: isInactive ? 'var(--text-dim)' : textColorGreen }}>
                        {formatCurrency(amortizedCap)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {origCapital > 0
                          ? (t('loanHeader.ofOriginalCapitalAmount', { amount: formatCurrency(origCapital) }) || `de ${formatCurrency(origCapital)} capital original`)
                          : (t('loanHeader.ofOriginalCapital') || '{percent}% do capital original').replace('{percent}', progressPercent)}
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
                    ? '#94a3b8'
                    : 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
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
                {loanMetrics.paidInstallments ??
                  0}{' '}
                /{' '}
                {loanMetrics.totalInstallments ??
                  0}
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
                  loanMetrics.remainingInstallments ??
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
                  {t(
                    'loanHeader.debtCompositionTitle'
                  ) ||
                    'COMPOSIÇÃO DA DÍVIDA'}
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
                  {t(
                    'loanHeader.whatIPaidTitle'
                  ) ||
                    'O QUE JÁ PAGUEI'}
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
                  {t(
                    'loanHeader.loanCostTitle'
                  ) ||
                    'CUSTO DO EMPRÉSTIMO'}
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
    </div>
  );
}