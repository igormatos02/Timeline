import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { initialTimelines } from '../../src/data/mockTimelines.js';

export async function runSeed() {
  console.log('🌱 Starting Database Seed to server/data/db/*.json...');

  // 1. Extract Timeboard
  const timeboardsData = [
    {
      id: 'tb-principal',
      name: 'Timeboard Principal',
      description: 'Gestão e controle financeiro consolidado.',
      tenant: 'default',
      type: null,
      createdAt: '2026-08-24T17:55:00.000Z',
      updatedAt: '2026-08-24T17:55:00.000Z'
    }
  ];

  // 2. Extract Timelines (Only tl-income as the active financial timeline under tb-principal)
  const filteredTimelines = initialTimelines.filter((tl) => tl.id !== 'tl-principal');
  const timelinesData = filteredTimelines.map((tl) => ({
    id: tl.id,
    timeboardId: 'tb-principal',
    name: tl.name,
    type: tl.type,
    color: tl.color,
    description: tl.description || '',
    startDate: tl.startDate,
    endDate: tl.endDate,
    status: tl.status,
    periodicity: tl.periodicity || 'mensal',
    monthlySalary: tl.monthlySalary || 3349.60
  }));

  // 3. Extract Loan Contracts
  const loanContractsData = [];
  filteredTimelines.forEach((tl) => {
    if (Array.isArray(tl.carLoans)) {
      tl.carLoans.forEach((loan) => {
        loanContractsData.push({
          ...loan,
          timelineId: tl.id
        });
      });
    }
  });

  // 4. Extract Events & Breakdown items
  const allEventsData = [];
  filteredTimelines.forEach((tl) => {
    if (Array.isArray(tl.events)) {
      tl.events.forEach((ev) => {
        allEventsData.push({
          ...ev,
          timelineOriginId: ev.timelineOriginId || tl.id
        });
      });
    }
  });

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
