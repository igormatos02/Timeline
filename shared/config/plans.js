/**
 * CondoFlow plans: the limits and features of each license, the single source the server enforces and the web
 * shows. A plan belongs to one condominium (CondoFlow timeboard); other timeboard types are not licensed.
 * Prices are in euros with VAT included (annual = 2 months free).
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
    features: Object.freeze([])
  }),
  [PlanId.BASIC]: Object.freeze({
    id: PlanId.BASIC,
    monthlyPrice: 9,
    yearlyPrice: 90,
    maxUnits: 15,
    maxAdmins: 1,
    features: Object.freeze([PlanFeature.NOTICES, PlanFeature.INVITES, PlanFeature.MEMBER_APP, PlanFeature.REPORTS])
  }),
  [PlanId.PROFESSIONAL]: Object.freeze({
    id: PlanId.PROFESSIONAL,
    monthlyPrice: 24,
    yearlyPrice: 240,
    maxUnits: 60,
    maxAdmins: 3,
    features: Object.freeze(Object.values(PlanFeature))
  }),
  [PlanId.MANAGER]: Object.freeze({
    id: PlanId.MANAGER,
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxUnits: 60,
    maxAdmins: UNLIMITED,
    // A manager license covers up to 10 condominiums; each extra one costs extraCondominiumMonthlyPrice
    includedCondominiums: 10,
    extraCondominiumMonthlyPrice: 8,
    features: Object.freeze(Object.values(PlanFeature))
  })
});

// A new condominium starts with a Profissional trial of this many days, then falls back to Free
export const TRIAL_PLAN_ID = PlanId.PROFESSIONAL;
export const TRIAL_DAYS = 30;

/**
 * Plan in force for a timeboard: its plan while not expired, Free once expired (data is never removed, what goes
 * beyond the plan only becomes read-only).
 * @param {{ plan?: string, planExpiresAt?: string|null }} timeboard
 * @param {Date} [now]
 */
export function effectivePlanOf(timeboard, now = new Date()) {
  const plan = PLANS[timeboard?.plan] || PLANS[PlanId.FREE];
  const expiresAt = timeboard?.planExpiresAt ? new Date(timeboard.planExpiresAt) : null;
  if (expiresAt && expiresAt < now) return PLANS[PlanId.FREE];
  return plan;
}

export const planHasFeature = (plan, feature) => Boolean(plan?.features?.includes(feature));
