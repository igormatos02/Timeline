import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { licenseRepository } from '../../infrastructure/database/supabase/SupabaseLicenseRepository.js';
import { PersonRole } from '../../../shared/enums/index.js';
import { PLANS, PlanId, effectivePlanOf, licensedCondominiumsOf, planHasFeature, TRIAL_PLAN_ID, TRIAL_DAYS } from '../../../shared/config/plans.js';
import { PRODUCTS, ProductId, productOfTimeboardType } from '../../../shared/config/products.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

// Error of an action the plan does not allow (HTTP 403, code PLAN_LIMIT)
export class PlanLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.code = 'PLAN_LIMIT';
    this.status = 403;
    this.details = details;
  }
}

// Before migration 0014 (no licenses table) every condominium keeps everything it uses today
const LEGACY_LICENSE = Object.freeze({ planId: PlanId.PROFESSIONAL, condominiums: Infinity, expiresAt: null, isLegacy: true });

// A unit (fração) is an entity with a unit identification; suppliers and other entities do not count
const isUnit = (person) => Boolean(String(person?.obligatorIdentification || '').trim());
const isAdmin = (person) => person?.role === PersonRole.ADMIN;
const byCreation = (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id));

/**
 * Licenses per account and product (shared/config/plans.js, product_licenses). A condominium uses the license of
 * its owner: the first condominiums the license covers (by creation) get its plan, the others work as Free.
 * Timeboards of products without paid plans are not licensed: every check passes for them.
 */
export class PlanService {
  /** The account's license in a product (Free when it has none). */
  async getLicense(userId, productId = ProductId.CONDOFLOW) {
    const stored = await licenseRepository.findByUserAndProduct(userId, productId);
    if (stored === undefined) return LEGACY_LICENSE;
    return stored || { planId: PlanId.FREE, condominiums: null, expiresAt: null };
  }

  /** Summary of an account's license in a product: plan in force, limits and how many condominiums it uses. */
  async getAccountLicense(userId, productId = ProductId.CONDOFLOW) {
    const product = PRODUCTS[productId];
    const license = await this.getLicense(userId, productId);
    const plan = effectivePlanOf(license);
    const owned = (await timeboardRepository.findByOwnerId(userId)).filter((tb) => product.timeboardTypes.includes(tb.type));
    const expiresAt = license.expiresAt || null;
    return {
      product: productId,
      isLicensed: product.isLicensed,
      planId: license.planId,
      effectivePlanId: plan.id,
      expiresAt,
      isExpired: Boolean(expiresAt && new Date(expiresAt) < new Date()),
      features: [...plan.features],
      limits: { maxCondominiums: licensedCondominiumsOf(license), maxUnits: plan.maxUnits, maxAdmins: plan.maxAdmins },
      usage: { condominiums: owned.length }
    };
  }

  /** Plan, usage and limits of a timeboard (null when it does not exist). */
  async getPlanInfo(timeboardId) {
    const timeboard = await timeboardRepository.getById(timeboardId);
    if (!timeboard) return null;
    const product = productOfTimeboardType(timeboard.type);
    const isLicensed = Boolean(product?.isLicensed);
    if (!isLicensed) {
      const plan = PLANS[PlanId.MANAGER];
      return { isLicensed, planId: plan.id, effectivePlanId: plan.id, expiresAt: null, isExpired: false, features: [...plan.features], limits: { maxUnits: Infinity, maxAdmins: Infinity }, usage: { units: 0, admins: 0 } };
    }

    const ownerId = timeboard.ownerId || timeboard.userId;
    const license = await this.getLicense(ownerId, product.id);
    // Within the condominiums the license covers (oldest first) the plan applies; beyond them, Free
    const owned = license.isLegacy ? [] : (await timeboardRepository.findByOwnerId(ownerId)).filter((tb) => product.timeboardTypes.includes(tb.type)).sort(byCreation);
    const position = owned.findIndex((tb) => tb.id === timeboard.id);
    const isCovered = license.isLegacy || position < licensedCondominiumsOf(license);
    const plan = isCovered ? effectivePlanOf(license) : PLANS[PlanId.FREE];
    const persons = await personRepository.getByTimeboardId(timeboardId);
    const expiresAt = license.expiresAt || null;
    return {
      isLicensed,
      product: product.id,
      ownerId,
      planId: license.planId,
      effectivePlanId: plan.id,
      expiresAt,
      isExpired: Boolean(expiresAt && new Date(expiresAt) < new Date()),
      isBeyondLicense: !isCovered,
      features: [...plan.features],
      limits: { maxUnits: plan.maxUnits, maxAdmins: plan.maxAdmins },
      usage: {
        units: (persons || []).filter(isUnit).length,
        admins: (persons || []).filter(isAdmin).length
      }
    };
  }

  /** Throws PlanLimitError when the timeboard's plan lacks the feature. */
  async assertFeature(timeboardId, feature) {
    const info = await this.getPlanInfo(timeboardId);
    if (!info || !info.isLicensed || info.features.includes(feature)) return;
    throw new PlanLimitError(t(`backend.plan.feature.${feature}`), { feature, planId: info.effectivePlanId });
  }

  /** Whether the timeboard's plan has the feature (timeboards of unlicensed products: always). */
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

  /**
   * Before an account creates a timeboard of a licensed product: its first one starts the trial (when it never had
   * a license); afterwards it must fit the condominiums its license covers.
   */
  async prepareNewTimeboard(userId, timeboardType, now = new Date()) {
    const product = productOfTimeboardType(timeboardType);
    if (!product?.isLicensed || !userId) return;
    const trialStarted = await licenseRepository.createIfMissing({
      userId,
      product: product.id,
      planId: TRIAL_PLAN_ID,
      expiresAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    }).catch(() => null);
    if (trialStarted) return;
    const account = await this.getAccountLicense(userId, product.id);
    if (account.usage.condominiums >= account.limits.maxCondominiums) {
      throw new PlanLimitError(t('backend.plan.condominiumsLimit', { max: account.limits.maxCondominiums }), { limit: 'condominiums', planId: account.effectivePlanId });
    }
  }

  /** License tools only (never exposed to the app): sets an account's license in a product. */
  async setLicense(userId, productId, { planId, condominiums = null, expiresAt = null }) {
    return licenseRepository.upsert({ userId, product: productId, planId, condominiums, expiresAt });
  }
}

export const planService = new PlanService();
export { planHasFeature };
