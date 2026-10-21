import { PlanFeature } from './plans.js';

// First steps of a new condominium, in order; `feature` = plan feature the step needs (null: every plan)
export const FirstStep = Object.freeze({
  UNITS: 'units',
  FEES: 'fees',
  INVITES: 'invites',
  NOTICE: 'notice'
});

export const FIRST_STEPS = Object.freeze([
  { id: FirstStep.UNITS, feature: null },
  { id: FirstStep.FEES, feature: null },
  { id: FirstStep.INVITES, feature: PlanFeature.INVITES },
  { id: FirstStep.NOTICE, feature: PlanFeature.NOTICES }
]);
