import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { timeboardInvitationRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardInvitationRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { emailService } from './EmailService.js';
import { TimeboardType, TimelineType, TimelineStatus, EventPeriodicity, InvitationStatus } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class TimeboardService {
  async getAllTimeboards() {
    const timeboards = await timeboardRepository.getAll();
    const timelines = await timelineRepository.getAll();

    return timeboards.map((tb) => ({
      ...tb,
      timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
    }));
  }

  async getTimeboardsForUser(userId) {
    if (!userId) {
      return {
        myTimeboards: [],
        sharedTimeboards: [],
        all: []
      };
    }

    const timelines = await timelineRepository.getAll();

    // 1. My Timeboards: strictly filtered in Supabase query by owner_id = userId
    const myRaw = await timeboardRepository.findByOwnerId(userId);
    const myTimeboards = myRaw.map((tb) => ({
      ...tb,
      timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
    }));

    // 2. Shared Timeboards: from timeboard_members where user_id = userId
    const sharedRaw = await timeboardMemberRepository.getSharedTimeboardsForUser(userId);
    const myIds = new Set(myTimeboards.map((t) => t.id));
    const sharedTimeboards = sharedRaw
      .filter((tb) => !myIds.has(tb.id))
      .map((tb) => ({
        ...tb,
        isShared: true,
        timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
      }));

    return {
      myTimeboards,
      sharedTimeboards,
      all: [...myTimeboards, ...sharedTimeboards]
    };
  }

  async addMember(timeboardId, userId) {
    return timeboardMemberRepository.addMember(timeboardId, userId);
  }

  async removeMember(timeboardId, userId) {
    return timeboardMemberRepository.removeMember(timeboardId, userId);
  }

  async getMembers(timeboardId) {
    return timeboardMemberRepository.getByTimeboardId(timeboardId);
  }

  async getInvitations(timeboardId) {
    return timeboardInvitationRepository.getByTimeboardId(timeboardId);
  }

  async revokeInvitation(timeboardId, invitationId) {
    if (!invitationId) throw new Error(t('backend.validation.invitationIdRequired'));
    return timeboardInvitationRepository.revoke(invitationId);
  }

  async unlinkPersonMember(timeboardId, personId) {
    if (!personId) throw new Error(t('backend.validation.personIdRequired'));
    const person = await personRepository.getById(personId);
    if (!person) throw new Error(t('backend.validation.personNotFound'));

    const userId = person.userId || person.user_id;
    if (userId) {
      try {
        await timeboardMemberRepository.removeMember(timeboardId, userId);
      } catch (err) {
        console.warn(`[TimeboardService.unlinkPersonMember] removeMember warning: ${err.message}`);
      }
    }

    // Unset userId in persons table
    await personRepository.update(personId, { userId: null });

    // Cancel any pending invitation for this email
    if (person.email) {
      try {
        await timeboardInvitationRepository.revokeByEmail(timeboardId, person.email);
      } catch (e) { }
    }

    return { success: true };
  }

  async acceptInvite(timeboardId, userId, email = null) {
    if (!timeboardId || !userId) {
      throw new Error(t('backend.validation.timeboardIdAndUserIdRequired'));
    }

    const timeboard = await timeboardRepository.getById(timeboardId);
    const isOwner = timeboard && (timeboard.ownerId === userId || timeboard.userId === userId);

    // 1. Add to timeboard_members idempotently (unless already owner)
    let member = null;
    if (!isOwner) {
      try {
        member = await timeboardMemberRepository.addMember(timeboardId, userId);
      } catch (err) {
        console.log(`[TimeboardService.acceptInvite] Member might already exist: ${err.message}`);
      }
    }

    // 2. Fetch accepting user and email
    const acceptingUser = await userRepository.findById(userId);
    const effectiveEmail = email || acceptingUser?.email;

    if (effectiveEmail) {
      const cleanEmail = effectiveEmail.toLowerCase().trim();
      try {
        await timeboardInvitationRepository.markAsAccepted(timeboardId, cleanEmail);
      } catch (err) {
        console.warn(`[TimeboardService.acceptInvite] Could not update invitation status: ${err.message}`);
      }

      // 3. Link user to persons record only if the user is NOT the owner
      if (!isOwner) {
        try {
          const persons = await personRepository.getByTimeboardId(timeboardId);
          const matchingPerson = persons.find((p) => p.email && p.email.toLowerCase().trim() === cleanEmail);
          if (matchingPerson) {
            if (!matchingPerson.userId || matchingPerson.userId !== userId) {
              await personRepository.update(matchingPerson.id, { userId: userId });
            }
          } else {
            await personRepository.create({
              timeboardId: timeboardId,
              type: PersonType.MEMBER,
              name: acceptingUser?.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              userId: userId,
              role: PersonRole.CONTRIBUTOR
            });
          }
        } catch (err) {
          console.warn(`[TimeboardService.acceptInvite] Could not link person: ${err.message}`);
        }
      }
    }

    const updatedTimeboard = await this.getTimeboardById(timeboardId);
    return { success: true, member, timeboard: updatedTimeboard };
  }

  async sendInvitation({ timeboardId, personId, email, role, inviterName, invitedBy, originUrl }) {
    if (!timeboardId || !email) {
      throw new Error(t('backend.validation.timeboardIdAndEmailRequired'));
    }

    const timeboard = await timeboardRepository.getById(timeboardId);
    if (!timeboard) {
      throw new Error(t('backend.validation.timeboardNotFound'));
    }

    const cleanEmail = email.toLowerCase().trim();
    const finalRole = role || 'contributor';

    // 1. If personId provided, update person with email and role
    let personName = '';
    if (personId) {
      const existing = await personRepository.getById(personId);
      if (existing) {
        personName = existing.personName || '';
        await personRepository.update(personId, {
          email: cleanEmail,
          role: finalRole,
          timeboardId: timeboardId
        });
      }
    }

    // 2. Record invitation in timeboard_invitations table
    let invitationRecord = null;
    try {
      invitationRecord = await timeboardInvitationRepository.create({
        timeboardId: timeboardId,
        email: cleanEmail,
        role: finalRole,
        status: InvitationStatus.PENDING,
        invitedBy: invitedBy || null
      });
    } catch (err) {
      console.warn(`[TimeboardService.sendInvitation] Could not save invitation record: ${err.message}`);
    }

    // 3. Build accept invitation URL
    const cleanBaseUrl = getAppUrl(originUrl);
    const acceptUrl = `${cleanBaseUrl}/?inviteTimeboardId=${encodeURIComponent(timeboardId)}&email=${encodeURIComponent(cleanEmail)}`;

    // 4. Send via Brevo
    const emailResult = await emailService.sendTimeboardInvitation({
      toEmail: cleanEmail,
      toName: personName,
      timeboardName: timeboard.name,
      timeboardId: timeboardId,
      inviterName: inviterName || t('backend.service.timeboardAdmin'),
      role: finalRole,
      acceptUrl: acceptUrl
    });

    return {
      ...emailResult,
      invitation: invitationRecord
    };
  }

  async getTimeboardById(id) {
    const timeboard = await timeboardRepository.getById(id);
    if (!timeboard) return null;

    const timelines = await timelineRepository.getAll();
    return {
      ...timeboard,
      timelines: timelines.filter((tl) => tl.timeboardId === id)
    };
  }

  async createTimeboard(data) {
    const ownerId = data.ownerId || data.owner_id || data.userId || data.user_id || null;
    const createdTimeboard = await timeboardRepository.create({
      ...data,
      ownerId: ownerId,
      owner_id: ownerId,
      type: data.type || TimeboardType.FINANCIAL
    });

    const isFinancial = createdTimeboard.type === TimeboardType.FINANCIAL;
    const isProjects = createdTimeboard.type === TimeboardType.PROJECTS;
    const isReminders = createdTimeboard.type === TimeboardType.REMINDERS;
    const defaultTenantId = createdTimeboard.tenantId || '9e3c3070-d4db-43be-ab03-3f852a9a81da';

    let defaultTimelines = [];

    if (isFinancial) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.balance'),
          type: TimelineType.BALANCE,
          color: '#0ea5e9',
          description: t('backend.timeline.balanceDescription'),
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.income'),
          type: TimelineType.INCOME,
          color: '#10b981',
          description: t('backend.timeline.incomeDescription'),
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.expenses'),
          type: TimelineType.EXPENSE,
          color: '#f43f5e',
          description: t('backend.timeline.expensesDescription'),
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.savings'),
          type: TimelineType.INVESTMENT,
          color: '#6366f1',
          description: t('backend.timeline.savingsDescription'),
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        }
      ];
    } else if (isProjects) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.projects'),
          type: TimelineType.PROJECT || 'project',
          color: '#8b5cf6',
          description: t('backend.timeline.projectsDescription'),
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        }
      ];
    } else if (isReminders) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: t('backend.timeline.reminders'),
          type: TimelineType.REMINDER || 'reminder',
          color: '#f59e0b',
          description: t('backend.timeline.remindersDescription'),
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventPeriodicity.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        }
      ];
    }

    for (const tl of defaultTimelines) {
      await timelineRepository.create(tl);
    }

    return this.getTimeboardById(createdTimeboard.id);
  }

  async updateTimeboard(id, updates) {
    return timeboardRepository.update(id, updates);
  }

  async deleteTimeboard(id) {
    const timelines = await timelineRepository.findByTimeboardId(id);
    for (const tl of timelines) {
      if (financialEventStatusRepository.deleteByTimelineId) {
        await financialEventStatusRepository.deleteByTimelineId(tl.id);
      }
      await eventRepository.deleteByTimelineId(tl.id);
      await loanContractRepository.deleteByTimelineId(tl.id);
      await timelineRepository.delete(tl.id);
    }
    // Garante que qualquer evento registado diretamente no timeboard também seja removido
    await eventRepository.deleteMany((ev) => ev.timeboardId === id);
    return timeboardRepository.delete(id);
  }
}

export const timeboardService = new TimeboardService();
