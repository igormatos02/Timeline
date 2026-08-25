import crypto from 'crypto';
import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { initialTimelines } from '../../src/data/mockTimelines.js';

export const GUIDS = {
  TIMEBOARD_PRINCIPAL: 'e7b8c2d1-9f3a-4a6c-8e5b-1d7f3a9e2c4b',
  TL_ENTRADAS: 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  TL_GASTOS: 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
  TL_INVESTIMENTOS: 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e',
  TL_LOAN_JEEP: 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f',
  TL_LOAN_DACIA: 'd5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a',
  TL_LOAN_CASA1: 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b',
  TL_LOAN_CASA2: 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c'
};

export async function runSeed() {
  console.log('🌱 Starting Database Seed with GUIDs to server/data/db/*.json...');

  // 1. Timeboard Principal (tipo financeiro)
  const timeboardsData = [
    {
      id: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Timeboard Principal',
      description: 'Gestão e controle financeiro consolidado.',
      tenant: 'default',
      type: 'financeiro',
      createdAt: '2026-08-24T17:55:00.000Z',
      updatedAt: '2026-08-24T17:55:00.000Z'
    }
  ];

  // 2. Timelines estruturadas dentro do Timeboard com GUIDs
  const timelinesData = [
    {
      id: GUIDS.TL_ENTRADAS,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Entradas e Rendimentos',
      type: 'entradas',
      color: '#10b981',
      description: 'Salários, receitas recorrentes e rendimentos.',
      isSystemDefault: true,
      canDelete: false,
      startDate: '2026-01-01',
      endDate: '2027-04-30',
      status: 'Em Progresso',
      periodicity: 'mensal',
      monthlySalary: 3349.60
    },
    {
      id: GUIDS.TL_GASTOS,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Gastos e Saídas',
      type: 'gastos',
      color: '#f43f5e',
      description: 'Despesas correntes e fixas.',
      isSystemDefault: true,
      canDelete: false,
      startDate: '2026-01-01',
      endDate: '2027-04-30',
      status: 'Em Progresso',
      periodicity: 'mensal'
    },
    {
      id: GUIDS.TL_INVESTIMENTOS,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Investimentos e Poupança',
      type: 'investimentos',
      color: '#6366f1',
      description: 'Aportes, reservas de emergência e fundos.',
      isSystemDefault: false,
      canDelete: true,
      startDate: '2026-01-01',
      endDate: '2027-04-30',
      status: 'Em Progresso',
      periodicity: 'mensal'
    },
    {
      id: GUIDS.TL_LOAN_JEEP,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Crédito Jeep',
      type: 'emprestimo',
      color: '#6366f1',
      description: 'Contrato Nº 80004197726 (TAN 11.183%).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: '80004197726',
      startDate: '2024-05-15',
      endDate: '2034-04-15',
      status: 'Em Progresso',
      totalDebt: 15456.60,
      remainingDebt: 13259.93,
      installmentAmount: 218.47,
      tan: 11.183,
      totalInstallments: 120,
      currentInstallmentNumber: 28,
      dueDay: 15
    },
    {
      id: GUIDS.TL_LOAN_DACIA,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Crédito Dacia',
      type: 'emprestimo',
      color: '#8b5cf6',
      description: 'Contrato CRD19605103001 (Matrícula: 46-XP-14).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: 'CRD19605103001',
      startDate: '2019-05-29',
      endDate: '2027-05-28',
      status: 'Em Progresso',
      totalDebt: 9584.45,
      remainingDebt: 972.74,
      installmentAmount: 180.08,
      totalInstallments: 96,
      currentInstallmentNumber: 87,
      dueDay: 28
    },
    {
      id: GUIDS.TL_LOAN_CASA1,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Crédito Egas Moniz',
      type: 'emprestimo',
      color: '#0ea5e9',
      description: 'Crédito Nº 02012642 (TAN 2.690%).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: '02012642',
      startDate: '2018-11-03',
      endDate: '2054-10-03',
      status: 'Em Progresso',
      totalDebt: 67884.39,
      remainingDebt: 58006.90,
      amortizedCapital: 9877.49,
      installmentAmount: 288.01,
      tan: 2.690,
      totalInstallments: 433,
      currentInstallmentNumber: 94,
      remainingMonths: 339,
      dueDay: 3
    },
    {
      id: GUIDS.TL_LOAN_CASA2,
      timeboardId: GUIDS.TIMEBOARD_PRINCIPAL,
      name: 'Hipoteca Egas Moniz',
      type: 'emprestimo',
      color: '#14b8a6',
      description: 'Hipoteca Nº 02015122 (TAN 3.990%).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: '02015122',
      startDate: '2025-04-03',
      endDate: '2054-04-03',
      status: 'Em Progresso',
      totalDebt: 51417.00,
      remainingDebt: 50137.21,
      amortizedCapital: 1279.79,
      installmentAmount: 293.05,
      tan: 3.990,
      totalInstallments: 349,
      currentInstallmentNumber: 17,
      remainingMonths: 332,
      dueDay: 3
    }
  ];

  // 3. Extract Loan Contracts with GUIDs
  const loanContractsData = [
    {
      id: GUIDS.TL_LOAN_JEEP,
      timelineId: GUIDS.TL_LOAN_JEEP,
      name: 'Crédito Automóvel - Jeep',
      contractNumber: '80004197726',
      type: 'automovel',
      category: 'automovel',
      color: '#6366f1',
      totalDebt: 15456.60,
      remainingDebt: 13259.93,
      installmentAmount: 218.47,
      tan: 11.183,
      totalInstallments: 120,
      currentInstallmentNumber: 28,
      dueDay: 15,
      startDate: '2024-05-15',
      endDate: '2034-04-15'
    },
    {
      id: GUIDS.TL_LOAN_DACIA,
      timelineId: GUIDS.TL_LOAN_DACIA,
      name: 'Crédito Automóvel - Dacia Sandero',
      contractNumber: 'CRD19605103001',
      type: 'automovel',
      category: 'automovel',
      color: '#8b5cf6',
      totalDebt: 9584.45,
      remainingDebt: 972.74,
      installmentAmount: 180.08,
      totalInstallments: 96,
      currentInstallmentNumber: 87,
      dueDay: 28,
      startDate: '2019-05-29',
      endDate: '2027-05-28'
    },
    {
      id: GUIDS.TL_LOAN_CASA1,
      timelineId: GUIDS.TL_LOAN_CASA1,
      name: 'Crédito Egas Moniz',
      contractNumber: '02012642',
      type: 'hipotecario',
      category: 'hipotecario',
      color: '#0ea5e9',
      totalDebt: 67884.39,
      remainingDebt: 58006.90,
      amortizedCapital: 9877.49,
      installmentAmount: 288.01,
      tan: 2.690,
      totalInstallments: 433,
      currentInstallmentNumber: 94,
      remainingMonths: 339,
      dueDay: 3,
      startDate: '2018-11-03',
      endDate: '2054-11-03'
    },
    {
      id: GUIDS.TL_LOAN_CASA2,
      timelineId: GUIDS.TL_LOAN_CASA2,
      name: 'Hipoteca Egas Moniz',
      contractNumber: '02015122',
      type: 'hipotecario',
      category: 'hipotecario',
      color: '#14b8a6',
      totalDebt: 51417.00,
      remainingDebt: 50137.21,
      amortizedCapital: 1279.79,
      installmentAmount: 293.05,
      tan: 3.990,
      totalInstallments: 349,
      currentInstallmentNumber: 17,
      remainingMonths: 332,
      dueDay: 3,
      startDate: '2025-04-03',
      endDate: '2054-04-03'
    }
  ];

  // 4. Extract Events and map to GUIDs
  const allEventsData = [];
  const baseTimeline = initialTimelines.find((tl) => tl.id === 'tl-income') || initialTimelines[0];
  if (baseTimeline && Array.isArray(baseTimeline.events)) {
    baseTimeline.events.forEach((ev) => {
      let targetTimelineId = GUIDS.TL_GASTOS;
      if (ev.isIncome || ev.financialType === 'entrada' || ev.category?.includes('entrada')) {
        targetTimelineId = GUIDS.TL_ENTRADAS;
      } else if (ev.isInvestment || ev.financialType === 'investimento' || ev.category?.includes('investimento')) {
        targetTimelineId = GUIDS.TL_INVESTIMENTOS;
      } else if (ev.timelineOriginId === 'tl-loan-jeep') {
        targetTimelineId = GUIDS.TL_LOAN_JEEP;
      } else if (ev.timelineOriginId === 'tl-loan-dacia') {
        targetTimelineId = GUIDS.TL_LOAN_DACIA;
      } else if (ev.timelineOriginId === 'tl-loan-casa1') {
        targetTimelineId = GUIDS.TL_LOAN_CASA1;
      } else if (ev.timelineOriginId === 'tl-loan-casa2') {
        targetTimelineId = GUIDS.TL_LOAN_CASA2;
      }

      // Ensure seriesId is a valid GUID
      let seriesGuid = ev.seriesId;
      if (seriesGuid) {
        if (seriesGuid === 'series-salary-main') seriesGuid = '550e8400-e29b-41d4-a716-446655440001';
        else if (seriesGuid === 'series-meal-allowance') seriesGuid = '550e8400-e29b-41d4-a716-446655440002';
        else if (seriesGuid.startsWith('series-exp-')) {
          const num = seriesGuid.replace('series-exp-', '');
          seriesGuid = `550e8400-e29b-41d4-a716-44665544001${num}`;
        } else if (!seriesGuid.includes('-')) {
          seriesGuid = crypto.randomUUID();
        }
      }

      // Convert breakdown item IDs to GUIDs
      const breakdownItems = (ev.breakdownItems || []).map((sub) => ({
        ...sub,
        id: crypto.randomUUID()
      }));

      allEventsData.push({
        ...ev,
        id: crypto.randomUUID(),
        seriesId: seriesGuid || null,
        timelineOriginId: targetTimelineId,
        breakdownItems
      });
    });
  }

  // Write to repositories
  await timeboardRepository.deleteMany(() => true);
  await timeboardRepository.createMany(timeboardsData);
  console.log(`✅ Seeded ${timeboardsData.length} timeboards with GUIDs into timeboards.json`);

  await timelineRepository.deleteMany(() => true);
  await timelineRepository.createMany(timelinesData);
  console.log(`✅ Seeded ${timelinesData.length} timelines with GUIDs into timelines.json`);

  await loanContractRepository.deleteMany(() => true);
  await loanContractRepository.createMany(loanContractsData);
  console.log(`✅ Seeded ${loanContractsData.length} loan contracts with GUIDs into loan_contracts.json`);

  await eventRepository.deleteMany(() => true);
  await eventRepository.createMany(allEventsData);
  console.log(`✅ Seeded ${allEventsData.length} events with GUIDs into events.json`);

  console.log('🎉 Database Seed with GUIDs Complete!');
}

// Run directly if called from CLI
if (process.argv[1].endsWith('seedData.js')) {
  runSeed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}
