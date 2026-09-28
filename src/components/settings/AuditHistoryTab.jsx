import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, Undo2, Ban, Wrench, History, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { AuditAction, TimelineColor } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import * as api from '../../services/api.js';

// Icon and color of each audited action
const ACTION_STYLE = {
  [AuditAction.DELETE_EVENT]: { icon: Trash2, color: TimelineColor.DANGER },
  [AuditAction.DELETE_SERIES]: { icon: Trash2, color: TimelineColor.DANGER },
  [AuditAction.REVERT_TO_PENDING]: { icon: Undo2, color: TimelineColor.WARNING },
  [AuditAction.CANCEL]: { icon: Ban, color: TimelineColor.SLATE },
  [AuditAction.CORRECT]: { icon: Wrench, color: TimelineColor.PRIMARY }
};

/**
 * Change history of the timeboard (admins): deletions, reverts to pending, cancellations and corrections of
 * money already recorded, with who did it and when (GET /api/timeboards/:id/audit).
 */
export default function AuditHistoryTab({ timeboardId }) {
  const { t, dateLocale } = useTranslation();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!timeboardId) return undefined;
    let active = true;
    api.fetchAuditLog(timeboardId)
      .then((rows) => { if (active) { setEntries(rows); setError(''); } })
      .catch(() => { if (active) { setEntries([]); setError(t('auditLog.loadError')); } });
    return () => { active = false; };
  }, [timeboardId, t]);

  return (
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>{t('auditLog.title')}</h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('auditLog.subtitle')}</p>
      </div>

      {entries === null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Loader2 size={16} className="spin" /> {t('auditLog.loading')}
        </div>
      ) : error ? (
        <div style={{ fontSize: '0.85rem', color: TimelineColor.DANGER }}>{error}</div>
      ) : entries.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <History size={16} /> {t('auditLog.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((entry) => {
            const style = ACTION_STYLE[entry.action] || ACTION_STYLE[AuditAction.CANCEL];
            const Icon = style.icon;
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-glass)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: '8px', background: `${style.color}1f`, color: style.color, display: 'flex' }}>
                  <Icon size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {t(`auditLog.actions.${entry.action}`)} · {entry.entityName || t('auditLog.unnamed')}
                    </span>
                    {entry.amount != null && (
                      <span style={{ fontSize: '0.86rem', fontWeight: '800', color: style.color }}>{formatCurrency(entry.amount)}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {t('auditLog.byOn', {
                      user: entry.userName || t('auditLog.unknownUser'),
                      date: entry.createdAt ? format(parseISO(entry.createdAt), 'PPp', { locale: dateLocale }) : ''
                    })}
                    {entry.occurrenceDate ? ` · ${t('auditLog.occurrence', { date: format(parseISO(entry.occurrenceDate), 'PP', { locale: dateLocale }) })}` : ''}
                  </span>
                  {entry.details?.previousStatus && entry.details?.newStatus && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {t('auditLog.statusChange', { from: t(`status.${entry.details.previousStatus}`), to: t(`status.${entry.details.newStatus}`) })}
                    </span>
                  )}
                  {entry.details?.touchesEffective && (
                    <span style={{ fontSize: '0.72rem', color: TimelineColor.WARNING, fontWeight: '700' }}>{t('auditLog.hadEffective')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
