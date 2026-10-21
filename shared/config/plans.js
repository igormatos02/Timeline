/**
 * CondoFlow plans: the limits and features of each license, the single source the server enforces and the web
 * shows. A license belongs to an account in a product (product_licenses): the account's condominiums use it,
 * people invited to them use the owner's. Other timeboard types are not licensed.
 * Prices are in euros with VAT included (annual = 2 months free), per condominium except the Gestora plan.
 */
export const PlanId = Object.freeze({
  FREE: 'free',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  MANAGER: 'manager'
});

// What a plan allows besides its limits
export const PlanFeature = Object.freeze({
  NOTICES: 'notices', // condominium posts and reminders
  INVITES: 'invites', // inviting people to the condominium
  MEMBER_APP: 'memberApp', // CondoFlow app for the owners
  ADMIN_APP: 'adminApp', // CondoFlow Gestão app
  PUSH: 'push', // push notifications
  REPORTS: 'reports' // closing report and exports
});

const UNLIMITED = Infinity;

export const PLANS = Object.freeze({
  [PlanId.FREE]: Object.freeze({
    id: PlanId.FREE,
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUnits: 8,
    maxAdmins: 1,
    maxCondominiums: 1,
    features: Object.freeze([])
  }),
  [PlanId.BASIC]: Object.freeze({
    id: PlanId.BASIC,
    monthlyPrice: 9,
    yearlyPrice: 90,
    maxUnits: 15,
    maxAdmins: 1,
    maxCondominiums: 1, // per licensed condominium (a license may cover more: product_licenses.condominiums)
    features: Object.freeze([PlanFeature.NOTICES, PlanFeature.INVITES, PlanFeature.MEMBER_APP, PlanFeature.REPORTS])
  }),
  [PlanId.PROFESSIONAL]: Object.freeze({
    id: PlanId.PROFESSIONAL,
    monthlyPrice: 24,
    yearlyPrice: 240,
    maxUnits: 60,
    maxAdmins: 3,
    maxCondominiums: 1, // per licensed condominium (a license may cover more: product_licenses.condominiums)
    features: Object.freeze(Object.values(PlanFeature))
  }),
  [PlanId.MANAGER]: Object.freeze({
    id: PlanId.MANAGER,
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxUnits: 60,
    maxAdmins: UNLIMITED,
    // A manager license covers up to 10 condominiums; each extra one costs extraCondominiumMonthlyPrice
    maxCondominiums: 10,
    extraCondominiumMonthlyPrice: 8,
    features: Object.freeze(Object.values(PlanFeature))
  })
});

// Plans in the order they are offered (the plans page, "available from plan X")
export const PLAN_ORDER = Object.freeze([PlanId.FREE, PlanId.BASIC, PlanId.PROFESSIONAL, PlanId.MANAGER]);

// An account's first condominium starts a Profissional trial of this many days, then falls back to Free
export const TRIAL_PLAN_ID = PlanId.PROFESSIONAL;
export const TRIAL_DAYS = 30;

/**
 * Plan in force of a license: its plan while not expired, Free once expired or without license (data is never
 * removed, what goes beyond the plan only becomes read-only).
 * @param {{ planId?: string, expiresAt?: string|null }|null} license
 * @param {Date} [now]
 */
export function effectivePlanOf(license, now = new Date()) {
  const plan = PLANS[license?.planId] || PLANS[PlanId.FREE];
  const expiresAt = license?.expiresAt ? new Date(license.expiresAt) : null;
  if (expiresAt && expiresAt < now) return PLANS[PlanId.FREE];
  return plan;
}

/** How many condominiums a license covers: its own number or the plan's (Free once expired). */
export function licensedCondominiumsOf(license, now = new Date()) {
  const plan = effectivePlanOf(license, now);
  if (plan.id === PlanId.FREE) return plan.maxCondominiums;
  return Math.max(plan.maxCondominiums, Number(license?.condominiums) || 0);
}

export const planHasFeature = (plan, feature) => Boolean(plan?.features?.includes(feature));
