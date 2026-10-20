import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { PersonRole, TimeboardType } from '../../../shared/enums/index.js';
import { PLANS, PlanId, effectivePlanOf, planHasFeature, TRIAL_PLAN_ID, TRIAL_DAYS } from '../../../shared/config/plans.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

// Error of an action the condominium's plan does not allow (HTTP 403, code PLAN_LIMIT)
export class PlanLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.code = 'PLAN_LIMIT';
    this.status = 403;
    this.details = details;
  }
}

// A unit (fração) is an entity with a unit identification; suppliers and other entities do not count
// A timeboard without a stored plan predates the licenses (or migration 0014 is not applied yet): it keeps
// everything it uses today, like the migration sets it
const LEGACY_PLAN_ID = PlanId.PROFESSIONAL;

const isUnit = (person) => Boolean(String(person?.obligatorIdentification || '').trim());
const isAdmin = (person) => person?.role === PersonRole.ADMIN;

/**
 * CondoFlow licenses (shared/config/plans.js): the plan in force of a condominium, its usage and the checks of
 * what it allows. Timeboards that are not condominiums are not licensed: every check passes for them.
 */
export class PlanService {
  /** Plan, usage and limits of a timeboard (null when it does not exist). */
  async getPlanInfo(timeboardId) {
    const timeboard = await timeboardRepository.getById(timeboardId);
    if (!timeboard) return null;
    const isLicensed = timeboard.type === TimeboardType.CONDOFLOW;
    const stored = { plan: timeboard.plan || LEGACY_PLAN_ID, planExpiresAt: timeboard.planExpiresAt || null };
    const plan = isLicensed ? effectivePlanOf(stored) : PLANS[PlanId.MANAGER];
    const persons = isLicensed ? await personRepository.getByTimeboardId(timeboardId) : [];
    const expiresAt = timeboard.planExpiresAt || null;
    return {
      isLicensed,
      planId: stored.plan,
      effectivePlanId: plan.id,
      expiresAt,
      isExpired: Boolean(isLicensed && expiresAt && new Date(expiresAt) < new Date()),
      features: [...plan.features],
      limits: { maxUnits: plan.maxUnits, maxAdmins: plan.maxAdmins },
      usage: {
        units: (persons || []).filter(isUnit).length,
        admins: (persons || []).filter(isAdmin).length
      }
    };
  }

  /** Throws PlanLimitError when the condominium's plan lacks the feature. */
  async assertFeature(timeboardId, feature) {
    const info = await this.getPlanInfo(timeboardId);
    if (!info || !info.isLicensed || info.features.includes(feature)) return;
    throw new PlanLimitError(t(`backend.plan.feature.${feature}`), { feature, planId: info.effectivePlanId });
  }

  /** Whether the condominium's plan has the feature (non-condominium timeboards: always). */
  async hasFeature(timeboardId, feature) {
    const info = await this.getPlanInfo(timeboardId);
    return !info || !info.isLicensed || info.features.includes(feature);
  }

  /**
   * Checks a person about to be saved: a new unit (fração) or a new administrator must fit the plan. `previous` is
   * the stored person when editing (a person that already counted does not count again).
   */
  async assertPersonFits(timeboardId, person, previous = null) {
    const info = await this.getPlanInfo(timeboardId);
    if (!info || !info.isLicensed) return;
    if (isUnit(person) && !isUnit(previous) && info.usage.units >= info.limits.maxUnits) {
      throw new PlanLimitError(t('backend.plan.unitsLimit', { max: info.limits.maxUnits }), { limit: 'units', planId: info.effectivePlanId });
    }
    if (isAdmin(person) && !isAdmin(previous) && info.usage.admins >= info.limits.maxAdmins) {
      throw new PlanLimitError(t('backend.plan.adminsLimit', { max: info.limits.maxAdmins }), { limit: 'admins', planId: info.effectivePlanId });
    }
  }

  /** Plan of a condominium created now: the Profissional trial (TRIAL_DAYS days). */
  trialPlan(now = new Date()) {
    return { plan: TRIAL_PLAN_ID, planExpiresAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString() };
  }
}

export const planService = new PlanService();
export { planHasFeature };
