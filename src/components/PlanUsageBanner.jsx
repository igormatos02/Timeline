import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';
import * as api from '../services/api.js';

/**
 * CondoFlow license of a condominium (GET /api/timeboards/:id/plan): the plan in force, the trial / paid period end
 * and the usage of its limits (units and administrators). Hidden for timeboards that are not licensed.
 * `refreshKey` reloads it after the entities change.
 */
export default function PlanUsageBanner({ timeboardId, refreshKey }) {
  const { t, dateLocale } = useTranslation();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!timeboardId) return undefined;
    let isActive = true;
    api.fetchTimeboardPlan(timeboardId).then((result) => { if (isActive) setInfo(result); }).catch(() => {});
    return () => { isActive = false; };
  }, [timeboardId, refreshKey]);

  if (!info?.isLicensed) return null;

  const limitText = (value) => (value === null ? t('plans.unlimited') : String(value));
  const isNearLimit = info.limits.maxUnits !== null && info.usage.units >= info.limits.maxUnits;
  const formatDate = (date) => format(parseISO(date), 'dd MMM yyyy', { locale: dateLocale });
  const accent = info.isExpired || isNearLimit ? TimelineColor.WARNING : TimelineColor.PRIMARY;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        border: `1px solid ${accent}59`,
        background: `${accent}14`,
        fontSize: '0.82rem',
        color: 'var(--text-main)'
      }}
    >
      <BadgeCheck size={18} style={{ color: accent, flexShrink: 0, marginTop: '1px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <strong>{t('plans.planLabel', { plan: t(`plans.names.${info.effectivePlanId}`) })}</strong>
        <span>
          {t('plans.usage', {
            units: info.usage.units,
            maxUnits: limitText(info.limits.maxUnits),
            admins: info.usage.admins,
            maxAdmins: limitText(info.limits.maxAdmins)
          })}
        </span>
        {info.isExpired && info.expiresAt && (
          <span style={{ color: TimelineColor.WARNING }}>{t('plans.expired', { date: formatDate(info.expiresAt), plan: t(`plans.names.${info.planId}`) })}</span>
        )}
        {!info.isExpired && info.expiresAt && (
          <span style={{ color: 'var(--text-muted)' }}>{t('plans.endsOn', { date: formatDate(info.expiresAt) })}</span>
        )}
        {isNearLimit && <span style={{ color: TimelineColor.WARNING }}>{t('plans.unitsLimitReached')}</span>}
      </div>
    </div>
  );
}
