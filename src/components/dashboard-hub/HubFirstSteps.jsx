import React from 'react';
import { ArrowRight, CheckCircle2, Circle, Lock } from 'lucide-react';
import { PLANS } from '../../../shared/config/plans.js';
import { FIRST_STEPS, FirstStep } from '../../../shared/config/firstSteps.js';
import { TimelineColor } from '../../enums/index.js';

// Steps done in the settings' entities tab (the others are done on the board)
const SETTINGS_STEPS = new Set([FirstStep.UNITS, FirstStep.FEES, FirstStep.INVITES]);

// Cheapest plan that includes a feature (to say which plan unlocks a step)
const planWithFeature = (feature) => Object.values(PLANS).find((plan) => plan.features.includes(feature));

/**
 * Hub: first steps of the condominiums the user manages, until each one is set up (units, monthly fees,
 * invitations, first notice). Steps the plan doesn't include show which plan unlocks them.
 */
export default function HubFirstSteps({ timeboards, statusById, t, onOpenSettings, onOpenBoard }) {
  const pending = timeboards.filter((tb) => {
    const steps = statusById[tb.id]?.firstSteps;
    return steps?.some((step) => step.available && !step.done);
  });
  if (pending.length === 0) return null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{t('timeboardsHub.firstSteps.title')}</h2>
      {pending.map((tb) => {
        const steps = statusById[tb.id].firstSteps;
        const doneCount = steps.filter((step) => step.done).length;
        return (
          <div key={tb.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', borderRadius: '14px', border: `1px solid ${TimelineColor.CONDOFLOW}4d`, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-main)' }}>{tb.name}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('timeboardsHub.firstSteps.progress', { done: doneCount, total: steps.length })}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {steps.map((step) => {
                const feature = FIRST_STEPS.find((s) => s.id === step.id)?.feature;
                const unlockPlan = !step.available && feature ? planWithFeature(feature) : null;
                const icon = step.done
                  ? <CheckCircle2 size={18} style={{ color: TimelineColor.SUCCESS, flexShrink: 0 }} />
                  : step.available
                    ? <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    : <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
                return (
                  <div key={step.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)', opacity: step.done ? 0.7 : 1 }}>
                    {icon}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: step.done ? 'line-through' : 'none' }}>
                        {t(`timeboardsHub.firstSteps.steps.${step.id}.title`)}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {unlockPlan
                          ? t('timeboardsHub.firstSteps.needsPlan', { plan: t(`plans.names.${unlockPlan.id}`) })
                          : t(`timeboardsHub.firstSteps.steps.${step.id}.desc`)}
                      </span>
                      {step.available && !step.done && (
                        <button
                          type="button"
                          onClick={() => (SETTINGS_STEPS.has(step.id) ? onOpenSettings(tb) : onOpenBoard(tb.id))}
                          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {t(`timeboardsHub.firstSteps.steps.${step.id}.action`)}<ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
