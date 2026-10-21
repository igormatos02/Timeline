import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { PLANS, PLAN_ORDER, PlanFeature, PlanId } from '../../../shared/config/plans.js';
import * as api from '../../services/api.js';

/**
 * Plans of a product (/condoflow/planos): the plans with their prices, limits and features, the account's current
 * one highlighted, and "Request this plan" (an e-mail to the provider until online payments exist).
 */
export default function ProductPlansPage({ product, onBack }) {
  const { t, dateLocale } = useTranslation();
  const [license, setLicense] = useState(null);
  const [requestPlanId, setRequestPlanId] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentPlanId, setSentPlanId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    api.fetchMyLicense(product.id).then((result) => { if (isActive) setLicense(result); }).catch(() => {});
    return () => { isActive = false; };
  }, [product.id]);

  const handleSend = async () => {
    setIsSending(true);
    setError('');
    try {
      await api.requestPlanUpgrade(product.id, { planId: requestPlanId, message });
      setSentPlanId(requestPlanId);
      setRequestPlanId(null);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const currentPlanId = license?.effectivePlanId;
  const card = { display: 'flex', flexDirection: 'column', gap: '10px', padding: '18px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)' };
  const button = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' };
  const primaryButton = { ...button, background: product.color, borderColor: product.color, color: 'var(--text-white)' };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button type="button" onClick={onBack} style={{ ...button, alignSelf: 'flex-start' }}><ArrowLeft size={16} />{t('plans.page.back')}</button>

        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('plans.page.title', { product: product.name })}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
            {product.isLicensed ? t('plans.page.subtitle') : t('plans.page.notLicensed', { product: product.name })}
          </p>
          {license && product.isLicensed && (
            <p style={{ margin: '6px 0 0', color: 'var(--text-main)', fontSize: '0.88rem' }}>
              {t('plans.license', { product: product.name, plan: t(`plans.names.${license.effectivePlanId}`) })}
              {license.expiresAt && !license.isExpired && ` · ${t('plans.trialUntil', { date: format(parseISO(license.expiresAt), 'dd MMM yyyy', { locale: dateLocale }) })}`}
              {' · '}{t('plans.page.usage', { used: license.usage.condominiums, max: license.limits.maxCondominiums ?? t('plans.unlimited') })}
            </p>
          )}
        </div>

        {sentPlanId && (
          <div role="status" style={{ ...card, borderColor: TimelineColor.SUCCESS, color: 'var(--text-main)' }}>{t('plans.page.sent')}</div>
        )}

        {product.isLicensed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isCurrent = planId === currentPlanId;
              return (
                <div key={planId} style={{ ...card, borderColor: isCurrent ? product.color : 'var(--border-glass)', boxShadow: isCurrent ? `0 0 0 1px ${product.color}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{t(`plans.names.${planId}`)}</strong>
                    {isCurrent && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: product.color }}>{t('plans.page.current')}</span>}
                  </div>
                  <div style={{ color: 'var(--text-main)' }}>
                    {plan.monthlyPrice === 0 ? (
                      <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t('plans.page.free')}</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{plan.monthlyPrice}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> {t('plans.page.perMonth')}</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('plans.page.perYear', { price: plan.yearlyPrice })}</div>
                      </>
                    )}
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    <li>{t('plans.page.units', { count: plan.maxUnits })}</li>
                    <li>{plan.maxAdmins === Infinity ? t('plans.page.adminsUnlimited') : t('plans.page.admins', { count: plan.maxAdmins })}</li>
                    {plan.maxCondominiums > 1 && <li>{t('plans.page.condominiums', { count: plan.maxCondominiums, extra: plan.extraCondominiumMonthlyPrice })}</li>}
                    {Object.values(PlanFeature).map((feature) => {
                      const has = plan.features.includes(feature);
                      return (
                        <li key={feature} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: has ? 'var(--text-main)' : 'var(--text-dim)', textDecoration: has ? 'none' : 'line-through' }}>
                          <Check size={14} style={{ color: has ? TimelineColor.SUCCESS : 'var(--text-dim)', flexShrink: 0 }} />
                          {t(`plans.page.features.${feature}`)}
                        </li>
                      );
                    })}
                  </ul>
                  {!isCurrent && planId !== PlanId.FREE && (
                    <button type="button" onClick={() => { setRequestPlanId(planId); setSentPlanId(null); }} style={{ ...primaryButton, marginTop: 'auto' }}>
                      {t('plans.page.request')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {requestPlanId && (
          <div style={card}>
            <strong style={{ color: 'var(--text-main)' }}>{t('plans.page.requestTitle', { plan: t(`plans.names.${requestPlanId}`) })}</strong>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('plans.page.requestMessage')}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-main)', font: 'inherit' }}
            />
            {error && <span role="alert" style={{ color: TimelineColor.DANGER, fontSize: '0.82rem' }}>{error}</span>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setRequestPlanId(null)} style={button}>{t('plans.page.cancel')}</button>
              <button type="button" onClick={handleSend} disabled={isSending} style={primaryButton}>
                {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{t('plans.page.send')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
