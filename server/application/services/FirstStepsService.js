import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { timeboardInvitationRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardInvitationRepository.js';
import { diaryRepository } from '../../infrastructure/database/supabase/SupabaseDiaryRepository.js';
import { FIRST_STEPS, FirstStep } from '../../../shared/config/firstSteps.js';

/**
 * First steps of a condominium for the hub: which are done, read from its data (units registered, monthly fees,
 * invitations sent, a notice published). A step whose plan feature is missing is reported as unavailable.
 */
export class FirstStepsService {
  async getFirstSteps(timeboardId, planInfo) {
    const [persons, events, invitations, diaries] = await Promise.all([
      personRepository.getByTimeboardId(timeboardId),
      financialEventRepository.getAll({ timeboardId }),
      timeboardInvitationRepository.getByTimeboardId(timeboardId).catch(() => []),
      diaryRepository.getByTimeboardId(timeboardId).catch(() => [])
    ]);
    const done = {
      [FirstStep.UNITS]: (persons || []).some((p) => String(p.obligatorIdentification || '').trim()),
      [FirstStep.FEES]: (events || []).some((e) => e.isObligation || e.is_obligation),
      [FirstStep.INVITES]: (invitations || []).length > 0 || (persons || []).some((p) => p.userId),
      [FirstStep.NOTICE]: (diaries || []).length > 0
    };
    const features = planInfo?.isLicensed ? planInfo.features : null;
    return FIRST_STEPS.map((step) => ({
      id: step.id,
      done: Boolean(done[step.id]),
      available: !step.feature || !features || features.includes(step.feature)
    }));
  }
}

export const firstStepsService = new FirstStepsService();
