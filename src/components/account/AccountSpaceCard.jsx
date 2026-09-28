import React from 'react';
import { PiggyBank, Landmark, Pencil, Trash2, Plus, ArrowDownRight, Target } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

/**
 * One space of the account in a month of the account timeline: the General space or a pocket.
 * Shows its balance at the end of the month, the goal progress (pockets with a target), the actions
 * (add inflow / outflow, edit / delete pocket) and the month movements (rendered by the parent).
 *
 * Props:
 *   name, isGeneral, isClosed    - identity of the space
 *   subtitle                     - optional second line (e.g. the General space hint)
 *   balance                      - balance at the end of the month (planned for future months)
 *   target, initialValue         - goal of a pocket (target 0 = no goal bar)
 *   isFutureMonth                - future months show forecasts
 *   color, palette               - timeline color and palette theme ({ primary, secondary })
 *   onAddInflow, onAddOutflow    - add movement actions (hidden when missing or closed)
 *   onEdit, onDelete             - pocket actions (never on the General space)
 *   children                     - the month movements of the space (or nothing)
 *   t                            - translation function
 */
export default function AccountSpaceCard({
  name,
  isGeneral = false,
  isClosed = false,
  subtitle = null,
  balance = 0,
  target = 0,
  initialValue = 0,
  isFutureMonth = false,
  color = TimelineColor.INVESTMENT,
  palette,
  onAddInflow,
  onAddOutflow,
  onEdit,
  onDelete,
  children,
  t
}) {
  const SpaceIcon = isGeneral ? Landmark : PiggyBank;
  const hasChildren = React.Children.count(children) > 0;
  const percent = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: isClosed ? 0.75 : 1
      }}
    >
      {/* Name, balance, status and actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <SpaceIcon size={18} style={{ color, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>{name}</span>
            {subtitle && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{subtitle}</span>}
          </div>
          <span
            title={t(isFutureMonth ? 'account.monthEndBalanceForecast' : 'account.monthEndBalance')}
            style={{
              fontSize: '0.74rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '6px',
              background: `${color}1f`,
              color: balance < 0 ? TimelineColor.DANGER : color
            }}
          >
            {formatCurrency(balance)}
          </span>
          {isClosed && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                background: `${TimelineColor.DANGER}26`,
                color: TimelineColor.DANGER
              }}
            >
              {t('pocket.statusClosed')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isGeneral && onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="btn btn-ghost btn-xs"
              title={t('common.edit')}
              style={{ padding: '4px 7px', color: 'var(--text-muted)' }}
            >
              <Pencil size={13} />
            </button>
          )}
          {!isGeneral && onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="btn btn-ghost btn-xs"
              title={t('common.delete')}
              style={{ padding: '4px 7px', color: TimelineColor.DANGER }}
            >
              <Trash2 size={13} />
            </button>
          )}
          {!isClosed && onAddInflow && (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={(e) => { e.stopPropagation(); onAddInflow(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: '700',
                background: color,
                borderColor: color
              }}
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>{t('pocket.addInflow')}</span>
            </button>
          )}
          {!isClosed && onAddOutflow && (
            <button
              type="button"
              className="btn btn-xs"
              title={t('pocket.addOutflow')}
              onClick={(e) => { e.stopPropagation(); onAddOutflow(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: '700',
                background: `${TimelineColor.DANGER}1f`,
                color: TimelineColor.DANGER,
                border: `1px solid ${TimelineColor.DANGER}59`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowDownRight size={12} strokeWidth={2.4} />
              <span>{t('pocket.addOutflow')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Goal progress of a pocket with a target */}
      {target > 0 && (
        <div style={{ width: '100%', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid var(--border-glass)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: isFutureMonth ? TimelineColor.PRIMARY_LIGHT : palette.primary,
              marginBottom: '5px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Target size={12} />
              <span>
                {t(isFutureMonth ? 'pocket.goalProgressForecast' : 'pocket.goalProgress', {
                  accumulated: formatCurrency(balance),
                  target: formatCurrency(target)
                })}
              </span>
              {initialValue > 0 && (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '500', marginLeft: '4px' }}>
                  ({t('pocket.initialContributionNote', { amount: formatCurrency(initialValue) })})
                </span>
              )}
            </span>
            <span style={{ color: percent >= 100 ? TimelineColor.SUCCESS : (isFutureMonth ? TimelineColor.PRIMARY_LIGHT : palette.primary), fontWeight: '800' }}>
              {percent >= 100
                ? t(isFutureMonth ? 'pocket.goalReachedForecast' : 'pocket.goalReached')
                : t(isFutureMonth ? 'pocket.forecastPercent' : 'pocket.reachedPercent', { percent })}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-glass)', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background: percent >= 100
                  ? `linear-gradient(90deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.EMERALD} 100%)`
                  : `linear-gradient(90deg, ${palette.primary} 0%, ${palette.secondary} 100%)`,
                borderRadius: '9999px',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow-glow)'
              }}
            />
          </div>
        </div>
      )}

      {/* Month movements of the space */}
      {hasChildren ? (
        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
      ) : (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'var(--bg-glass)',
            border: '1px dashed var(--border-glass)',
            fontSize: '0.74rem',
            color: 'var(--text-dim)',
            textAlign: 'center',
            marginTop: '2px'
          }}
        >
          {t('timeline.noEventsMonth')}
        </div>
      )}
    </div>
  );
}
