import { Router } from 'express';
import { planService } from '../../../application/services/PlanService.js';
import { PlanFeature } from '../../../../shared/config/plans.js';
import { timeboardService } from '../../../application/services/TimeboardService.js';
import { firstStepsService } from '../../../application/services/FirstStepsService.js';
import { dataExportService } from '../../../application/services/DataExportService.js';
import { condoNotificationService } from '../../../application/services/CondoNotificationService.js';
import { receiptCodeRepository } from '../../../infrastructure/database/supabase/SupabaseReceiptCodeRepository.js';
import { unitFeeService } from '../../../application/services/UnitFeeService.js';
import { unitImportService } from '../../../application/services/UnitImportService.js';
import { timeboardInvitationRepository } from '../../../infrastructure/database/supabase/SupabaseTimeboardInvitationRepository.js';
import { timeboardAccessFromParam } from '../middleware/timeboardAccess.js';
import { createT } from '../../../../shared/i18n/index.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { rateLimit, RateLimitRule } from '../middleware/rateLimit.js';
import { auditService } from '../../../application/services/AuditService.js';
import { Capability } from '../../../../shared/permissions.js';

const t = createT('en');

// Invitations send e-mails: limited per account
const sendInviteLimit = rateLimit({ ...RateLimitRule.SEND_INVITE, message: t('backend.validation.tooManyAttempts'), keyOf: (req) => req.user?.id });

export const timeboardsRouter = Router();

// Routes with a timeboard `:id` require access to that timeboard (except accepting an invitation,
// done before the user is a member)
timeboardsRouter.param('id', (req, res, next, id) => {
  if (req.path.endsWith('/accept-invite')) return next();
  return timeboardAccessFromParam(req, res, next, id);
});

// GET /api/timeboards — timeboards of the logged-in user (own and shared)
timeboardsRouter.get('/', async (req, res) => {
  try {
    const result = await timeboardService.getTimeboardsForUser(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error fetching timeboards:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/members
timeboardsRouter.get('/:id/members', async (req, res) => {
  try {
    const members = await timeboardService.getMembers(req.params.id);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/plan — CondoFlow license of the condominium: plan in force, end date, limits and usage
timeboardsRouter.get('/:id/plan', async (req, res) => {
  try {
    const info = await planService.getPlanInfo(req.params.id);
    if (!info) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    // The hub also asks for the condominium's first steps
    const firstSteps = req.query.withFirstSteps && info.isLicensed ? await firstStepsService.getFirstSteps(req.params.id, info) : undefined;
    res.json({ ...info, firstSteps, limits: { maxUnits: info.limits.maxUnits === Infinity ? null : info.limits.maxUnits, maxAdmins: info.limits.maxAdmins === Infinity ? null : info.limits.maxAdmins } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/export — every record of the timeboard in a ZIP (CSV sheets + data.json), in every plan
timeboardsRouter.get('/:id/export', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const result = await dataExportService.exportTimeboard(req.params.id, { language: req.query.language });
    if (!result) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/units/:personId/fee — the unit's monthly fee (value in force, parts, where it is received)
timeboardsRouter.get('/:id/units/:personId/fee', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const fee = await unitFeeService.getUnitFee(req.params.id, req.params.personId);
    if (!fee) return res.status(404).json({ error: t('backend.validation.unitNotFound') });
    res.json(fee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/units/:personId/fee { amount, parts, channel, language } — "Atualizar lançamentos":
// creates the fee from the start date, or changes it from next month on
timeboardsRouter.post('/:id/units/:personId/fee', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const { amount, parts, channel, language } = req.body || {};
    res.json(await unitFeeService.applyUnitFee(req.params.id, req.params.personId, { amount, parts, channel }, language));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

// GET /api/timeboards/:id/receipt-codes?from&to — valid receipt codes of the timeboard (register of receipts report)
timeboardsRouter.get('/:id/receipt-codes', async (req, res) => {
  try {
    const codes = await receiptCodeRepository.listActive(req.params.id, { fromDate: req.query.from || null, toDate: req.query.to || null });
    res.json(codes.map(({ code, eventId, occurrenceDate }) => ({ code, eventId, occurrenceDate })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/notifications — owners' notices of the condominium: e-mails sent this month
timeboardsRouter.get('/:id/notifications', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    res.json(await condoNotificationService.monthStats(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/import-units — creates the condominium's units (frações) and monthly fees from a spreadsheet
timeboardsRouter.post('/:id/import-units', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const { rows, feeStartDate, feeChannel, language } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: t('backend.import.noRows') });
    res.json(await unitImportService.importUnits(req.params.id, { rows, feeStartDate, feeChannel, language }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

// POST /api/timeboards/:id/members
timeboardsRouter.post('/:id/members', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const { userId, user_id } = req.body;
    const targetUserId = userId || user_id;
    if (!targetUserId) return res.status(400).json({ error: t('backend.validation.userIdRequired') });

    const member = await timeboardService.addMember(req.params.id, targetUserId);
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timeboards/:id/members/:userId
timeboardsRouter.delete('/:id/members/:userId', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const deleted = await timeboardService.removeMember(req.params.id, req.params.userId);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/invitations
timeboardsRouter.get('/:id/invitations', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const invitations = await timeboardService.getInvitations(req.params.id);
    res.json(invitations);
  } catch (err) {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/invitations/:invitationId/revoke
timeboardsRouter.post('/:id/invitations/:invitationId/revoke', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const result = await timeboardService.revokeInvitation(req.params.id, req.params.invitationId);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error revoking invitation:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/persons/:personId/unlink
timeboardsRouter.post('/:id/persons/:personId/unlink', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const result = await timeboardService.unlinkPersonMember(req.params.id, req.params.personId);
    res.json(result);
  } catch (err) {
    console.error('Error unlinking person member:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/invite
timeboardsRouter.post('/:id/invite', requireCapability(Capability.MANAGE), sendInviteLimit, async (req, res) => {
  try {
    const { personId, email, role, inviterName, invitedBy, invited_by } = req.body;
    const originUrl = req.headers.origin || req.headers.referer;
    // Inviting people needs a plan with invites (CondoFlow)
    await planService.assertFeature(req.params.id, PlanFeature.INVITES);
    const result = await timeboardService.sendInvitation({
      timeboardId: req.params.id,
      personId,
      email,
      role,
      inviterName,
      invitedBy: invitedBy || invited_by,
      originUrl
    });
    res.json(result);
  } catch (err) {
    console.error('Error sending invitation:', err);
    res.status(err.status || 400).json({ error: err.message, code: err.code });
  }
});

// POST /api/timeboards/:id/accept-invite
timeboardsRouter.post('/:id/accept-invite', async (req, res) => {
  try {
    // Accepts with the logged-in account, only when a pending invitation exists for its e-mail
    // (invitations for another e-mail are accepted by code: POST /api/invitations/accept)
    const pending = await timeboardInvitationRepository.findPendingByTimeboardAndEmail(req.params.id, req.user.email);
    if (!pending) return res.status(403).json({ error: t('backend.validation.forbidden') });
    const result = await timeboardService.acceptInvite(req.params.id, req.user.id, req.user.email);
    res.json(result);
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/audit — admins: audit log of the changes to recorded money (newest first)
timeboardsRouter.get('/:id/audit', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    res.json(await auditService.list(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id
timeboardsRouter.get('/:id', async (req, res) => {
  try {
    const timeboard = await timeboardService.getTimeboardById(req.params.id);
    if (!timeboard) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    res.json(timeboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards
timeboardsRouter.post('/', async (req, res) => {
  try {
    // The logged-in user owns the new timeboard
    const newTimeboard = await timeboardService.createTimeboard({ ...req.body, ownerId: req.user.id, userId: req.user.id }, req.body.locale);
    res.status(201).json(newTimeboard);
  } catch (err) {
    // A license that covers no more condominiums: 403 PLAN_LIMIT
    res.status(err.status || 400).json({ error: err.message, code: err.code });
  }
});

// PUT /api/timeboards/:id
timeboardsRouter.put('/:id', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const updated = await timeboardService.updateTimeboard(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timeboards/:id
timeboardsRouter.delete('/:id', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const deleted = await timeboardService.deleteTimeboard(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
