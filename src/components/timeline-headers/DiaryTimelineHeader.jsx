import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Settings,
  Sparkles,
  Calendar,
  Smile,
  Meh,
  Frown,
  Heart
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DiaryMood,
  TimelineType,
  EventType,
  EventStatus,
  isCancelledStatus
} from '../../enums/index.js';
import { DIARY_MOOD_CONFIG } from '../event-modals/DiaryEventModal.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function DiaryTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset
}) {
  const { t, dateLocale } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.DIARY;
  const rawEventsList = timeline.events || events || [];
  const eventsList = rawEventsList.filter((ev) => {
    if (!ev || !ev.date || ev.isDeleted) return false;
    const evTimelineId = ev.timelineId || ev.timeline_id;
    if (evTimelineId && timeline?.id && String(evTimelineId) !== String(timeline.id)) {
      return false;
    }
    return true;
  });

  const validMoods = Object.values(DiaryMood);
  const isCancelledEvent = (ev) => {
    if (!ev) return false;
    return Boolean(ev.isDeleted || isCancelledStatus(ev.status));
  };

  // 1. MOOD DISTRIBUTION
  const moodCounts = {};
  let totalActiveEntries = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    totalActiveEntries += 1;

    let mood = (ev.category || '').toLowerCase();
    if (!validMoods.includes(mood)) {
      mood = DiaryMood.GOOD;
    }
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const moodList = Object.entries(moodCounts)
    .map(([moodKey, count]) => {
      const cfg = DIARY_MOOD_CONFIG[moodKey] || DIARY_MOOD_CONFIG[DiaryMood.GOOD];
      return {
        rawCat: moodKey,
        name: t(cfg.labelKey) || cfg.fallbackLabel,
        amount: count,
        count,
        percent: totalActiveEntries > 0 ? Math.round((count / totalActiveEntries) * 100) : 0,
        color: cfg.color
      };
    })
    .sort((a, b) => b.count - a.count);

  // 2. ANNUAL ENTRIES (Rolling 12 months)
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;

  let annualTotalEntries = 0;
  let currentMonthEntries = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledEvent(ev)) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      annualTotalEntries += 1;
    }
    if (evMonthKey === startMonthKey) {
      currentMonthEntries += 1;
    }
  });

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          icon={<BookOpen size={18} />}
          name={timeline.name}
          badge={t('diaryHeader.badge') || 'Diário Pessoal'}
          iconBackground="rgba(236, 72, 153, 0.12)"
          badgeBackground="rgba(236, 72, 153, 0.12)"
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
              <span>{t('diaryHeader.addEntry') || 'Novo Registro'}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('diaryHeader.settingsTitle') || 'Definições da Timeline'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                color: TimelineColor.DIARY,
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
              title={t('diaryHeader.deleteTitle')}
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
          {/* Grid Principal Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: DISTRIBUIÇÃO DE MOOD (PieDonut & Legenda) */}
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
                {t('diaryHeader.moodDistributionTitle') || 'DISTRIBUIÇÃO DE MOOD'}
              </div>

              {moodList.length === 0 ? (
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
                      {t('diaryHeader.noEntries') || 'Sem registros no diário'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                      {t('diaryHeader.noEntriesHint') || 'Adicione registros diários para acompanhar seu histórico emocional.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                  <PieDonut items={moodList} centerLabel={String(totalActiveEntries)} />
                  <DonutLegend
                    items={moodList}
                    nameFormatter={(item) => item.name}
                  />
                </div>
              )}
            </div>

            {/* Quadrante 2: REGISTROS NO ANO & MÊS ATUAL */}
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
                {t('diaryHeader.annualEntriesTitle') || 'REGISTROS NO ANO'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                <DonutChart
                  percent={annualTotalEntries > 0 ? Math.min(100, Math.round((annualTotalEntries / 365) * 100)) : 0}
                  sliceColor={TimelineColor.DIARY}
                  remainingColor="rgba(236, 72, 153, 0.15)"
                  label={`${annualTotalEntries}`}
                  centerFontSize="0.84rem"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                    {t('diaryHeader.annualEntriesDesc') || 'Registrados nos últimos 12 meses:'}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.DIARY }}>
                    {annualTotalEntries} {annualTotalEntries === 1 ? 'registro' : 'registros'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Este mês: <strong>{currentMonthEntries}</strong> dias registrados
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé com Gráfico de Colunas: VOLUME DE ENTRADAS NOS ÚLTIMOS 7 MESES */}
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
                chartTitle={t('diaryHeader.chartTitle') || 'HISTÓRICO DE REGISTROS (ÚLTIMOS 6 MESES + MÊS ATUAL)'}
                monthVsPrevLabel={t('diaryHeader.monthVsPrevMonth')}
                diffPercentStr={diffPercentStr}
                isGoodChange={isDiffPositive}
                goodColor={TimelineColor.DIARY}
                sparklesLabel={t('diaryHeader.annualProjectionLabel')}
                projection={annualTotalEntries}
                sparklesColor={TimelineColor.DIARY}
                projectionColor={TimelineColor.DIARY}
                currentGradient={`linear-gradient(180deg, ${TimelineColor.DIARY} 0%, rgba(219, 39, 119, 1) 100%)`}
                mutedGradientTop="rgba(236, 72, 153, 0.6)"
                mutedGradientBottom="rgba(236, 72, 153, 0.25)"
                currentTextColor={TimelineColor.DIARY}
                formatValue={(val) => String(val)}
                formatProjection={(val) => `${val} registros`}
              />
            );
          })()}
        </div>
      )}
    </HeaderShell>
  );
}
