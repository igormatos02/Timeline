import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { TimeboardType, TimelineType, TimelineStatus, EventAggregation } from '../../../shared/enums/index.js';

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

    const isFinancial = createdTimeboard.type === TimeboardType.FINANCIAL || createdTimeboard.type === 'financial';
    const isProjects = createdTimeboard.type === TimeboardType.PROJECTS || createdTimeboard.type === 'projects';
    const isReminders = createdTimeboard.type === TimeboardType.REMINDERS || createdTimeboard.type === 'reminders';
    const defaultTenantId = createdTimeboard.tenantId || '9e3c3070-d4db-43be-ab03-3f852a9a81da';

    let defaultTimelines = [];

    if (isFinancial) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: 'Balance',
          type: TimelineType.BALANCE,
          color: '#0ea5e9',
          description: 'Consolidated view of financial flow',
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: 'Inflow / Income',
          type: TimelineType.INCOME,
          color: '#10b981',
          description: 'Management of salaries, earnings, and revenues',
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: 'Expenses / Expenditures',
          type: TimelineType.EXPENSE,
          color: '#f43f5e',
          description: 'Management of fixed, recurring, and variable expenses',
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        },
        {
          timeboardId: createdTimeboard.id,
          name: 'Savings / Investments',
          type: TimelineType.INVESTMENT,
          color: '#6366f1',
          description: 'Management of savings, equity, and contributions',
          isSystemDefault: false,
          canDelete: true,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        }
      ];
    } else if (isProjects) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: 'My Projects',
          type: TimelineType.PROJECT || 'project',
          color: '#8b5cf6',
          description: 'Project planning, milestones and tasks timeline',
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: defaultTenantId
        }
      ];
    } else if (isReminders) {
      defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: 'My Reminders',
          type: TimelineType.REMINDER || 'reminder',
          color: '#f59e0b',
          description: 'Schedule reminders, alerts and notes',
          isSystemDefault: true,
          canDelete: false,
          status: TimelineStatus.ACTIVE,
          periodicity: EventAggregation.MONTHLY,
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
