import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { initialTimelines } from '../../src/data/mockTimelines.js';

export async function runSeed() {
  console.log('🌱 Starting Database Seed to server/data/db/*.json...');

  // 1. Extract Timelines
  const timelinesData = initialTimelines.map((tl) => ({
    id: tl.id,
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

  // 2. Extract Loan Contracts
  const loanContractsData = [];
  initialTimelines.forEach((tl) => {
    if (Array.isArray(tl.carLoans)) {
      tl.carLoans.forEach((loan) => {
        loanContractsData.push({
          ...loan,
          timelineId: tl.id
        });
      });
    }
  });

  // 3. Extract Events & Breakdown items
  const allEventsData = [];
  initialTimelines.forEach((tl) => {
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
