import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { initialTimelines } from '../../src/data/mockTimelines.js';

export async function runSeed() {
  console.log('🌱 Starting Database Seed to server/data/db/*.json...');

  // 1. Timeboard Principal (tipo financeiro)
  const timeboardsData = [
    {
      id: 'tb-principal',
      name: 'Timeboard Principal',
      description: 'Gestão e controle financeiro consolidado.',
      tenant: 'default',
      type: 'financeiro',
      createdAt: '2026-08-24T17:55:00.000Z',
      updatedAt: '2026-08-24T17:55:00.000Z'
    }
  ];

  // 2. Timelines estruturadas dentro do Timeboard
  const timelinesData = [
    {
      id: 'tl-entradas',
      timeboardId: 'tb-principal',
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
      id: 'tl-gastos',
      timeboardId: 'tb-principal',
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
      id: 'tl-investimentos',
      timeboardId: 'tb-principal',
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
      id: 'tl-loan-jeep',
      timeboardId: 'tb-principal',
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
      id: 'tl-loan-dacia',
      timeboardId: 'tb-principal',
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
      id: 'tl-loan-casa1',
      timeboardId: 'tb-principal',
      name: 'Crédito Casa 1',
      type: 'emprestimo',
      color: '#0ea5e9',
      description: 'Crédito Hipotecário Nº 02012642 (TAN 2.690%).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: '02012642',
      startDate: '2018-11-01',
      endDate: '2054-10-01',
      status: 'Em Progresso',
      totalDebt: 67884.39,
      remainingDebt: 58006.90,
      amortizedCapital: 9877.49,
      installmentAmount: 288.01,
      tan: 2.690,
      totalInstallments: 432,
      currentInstallmentNumber: 94,
      remainingMonths: 338,
      dueDay: 1
    },
    {
      id: 'tl-loan-casa2',
      timeboardId: 'tb-principal',
      name: 'Crédito Casa 2',
      type: 'emprestimo',
      color: '#14b8a6',
      description: 'Crédito Hipotecário Nº 02015122 (TAN 3.990%).',
      isSystemDefault: false,
      canDelete: true,
      contractNumber: '02015122',
      startDate: '2025-04-01',
      endDate: '2054-03-01',
      status: 'Em Progresso',
      totalDebt: 51417.00,
      remainingDebt: 50137.21,
      amortizedCapital: 1279.79,
      installmentAmount: 293.05,
      tan: 3.990,
      totalInstallments: 348,
      currentInstallmentNumber: 17,
      remainingMonths: 331,
      dueDay: 1
    }
  ];

  // 3. Extract Loan Contracts
  const loanContractsData = [];
  const baseTimeline = initialTimelines.find((tl) => tl.id === 'tl-income') || initialTimelines[0];
  if (baseTimeline && Array.isArray(baseTimeline.carLoans)) {
    baseTimeline.carLoans.forEach((loan) => {
      loanContractsData.push({
        ...loan,
        timelineId: loan.id
      });
    });
  }

  // 4. Extract Events and map to exact timeline IDs
  const allEventsData = [];
  if (baseTimeline && Array.isArray(baseTimeline.events)) {
    baseTimeline.events.forEach((ev) => {
      let targetTimelineId = 'tl-gastos';
      if (ev.isIncome || ev.financialType === 'entrada' || ev.category?.includes('entrada')) {
        targetTimelineId = 'tl-entradas';
      } else if (ev.isInvestment || ev.financialType === 'investimento' || ev.category?.includes('investimento')) {
        targetTimelineId = 'tl-investimentos';
      } else if (ev.timelineOriginId?.startsWith('tl-loan-')) {
        targetTimelineId = ev.timelineOriginId;
      }

      allEventsData.push({
        ...ev,
        timelineOriginId: targetTimelineId
      });
    });
  }

  // Write to repositories
  await timeboardRepository.deleteMany(() => true);
  await timeboardRepository.createMany(timeboardsData);
  console.log(`✅ Seeded ${timeboardsData.length} timeboards into timeboards.json`);

  await timelineRepository.deleteMany(() => true);
  await timelineRepository.createMany(timelinesData);
  console.log(`✅ Seeded ${timelinesData.length} timelines into timelines.json`);

  await loanContractRepository.deleteMany(() => true);
  await loanContractRepository.createMany(loanContractsData);
  console.log(`✅ Seeded ${loanContractsData.length} loan contracts into loan_contracts.json`);

  await eventRepository.deleteMany(() => true);
  await eventRepository.createMany(allEventsData);
  console.log(`✅ Seeded ${allEventsData.length} events into events.json`);

  console.log('🎉 Database Seed Complete!');
}

// Run directly if called from CLI
if (process.argv[1].endsWith('seedData.js')) {
  runSeed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}
