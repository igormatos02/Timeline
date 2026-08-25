import { formatCurrency } from '../utils/loanCalculations.js';

// Categories for events
export const EVENT_CATEGORIES = [
  { id: 'entrada_recorrente', name: 'Entrada Recorrente (Salário)', icon: '💰', color: '#10b981' },
  { id: 'entrada_esporadica', name: 'Entrada Esporádica (Bónus / Extra)', icon: '🎁', color: '#06b6d4' },
  { id: 'parcela_emprestimo', name: 'Prestação / Parcela', icon: '💳', color: '#6366f1' },
  { id: 'amortizacao', name: 'Amortização Extraordinária', icon: '📉', color: '#10b981' }
];

export const TIMELINE_TYPES = [
  'Empréstimo',
  'Investimentos'
];

export const TIMELINE_STATUSES = [
  'Em Progresso',
  'Planeado',
  'Em Pausa',
  'Concluído'
];

export const DEFAULT_LABELS = [
  { id: 'salario', name: 'Salário', color: '#10b981' },
  { id: 'bonus', name: 'Bónus / Extra', color: '#06b6d4' },
  { id: 'habitacao', name: 'Crédito Habitação', color: '#10b981' },
  { id: 'automovel', name: 'Crédito Automóvel', color: '#6366f1' },
  { id: 'debito_direto', name: 'Débito Direto', color: '#06b6d4' }
];

// Helper to generate Crédito Automóvel - Jeep (Contrato 80004197726)
function createJeepLoanEvents() {
  const events = [];
  const totalDebt = 15456.60;
  const regularMonthly = 218.47;
  const totalMonths = 120; // 120 prestações (Maio 2024 a Abril 2034)

  let runningBalance = totalDebt;

  for (let i = 1; i <= totalMonths; i++) {
    const totalMonthOffset = i - 1; // 0 = Maio 2024
    const startYear = 2024;
    const startMonth = 5; // Maio

    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-15`;

    const isPastPaid = i < 28; // Prestações 1 a 27 (Maio 2024 a Julho 2026) estão pagas
    const isAugustDue = i === 28; // Prestação 28 (15 de Agosto de 2026)

    let status = 'Pendente';
    if (isPastPaid) {
      status = 'Pago';
    } else if (isAugustDue) {
      status = 'Atrasada';
    }

    let principalAmount;
    let interestPortion;

    if (i === 28) {
      principalAmount = 89.08;
      interestPortion = 129.39; // 124.41 + 4.98
    } else if (i < 28) {
      principalAmount = Math.round((70 + (i * 0.7)) * 100) / 100;
      interestPortion = Math.round((regularMonthly - principalAmount) * 100) / 100;
    } else {
      principalAmount = Math.min(runningBalance, Math.round((89.08 + (i - 28) * 1.15) * 100) / 100);
      interestPortion = Math.max(0, Math.round((regularMonthly - principalAmount) * 100) / 100);
    }

    if (i === 28) {
      runningBalance = 13259.93;
    } else {
      runningBalance = Math.max(0, Math.round((runningBalance - principalAmount) * 100) / 100);
    }

    events.push({
      id: `jeep-loan-inst-${i}`,
      timelineOriginId: 'tl-loan-jeep',
      timelineOriginName: 'Crédito Automóvel - Jeep',
      timelineOriginIcon: '🚙',
      date: dateStr,
      time: '08:30',
      title: `Prestação Jeep #${i} de ${totalMonths}`,
      description: i === 28
        ? `Débito Direto PT50002300004549878663394 (${formatCurrency(principalAmount)} capital + ${formatCurrency(124.41)} juros + ${formatCurrency(4.98)} imp. selo).`
        : `Débito Direto em conta (${formatCurrency(principalAmount)} capital + ${formatCurrency(interestPortion)} juros/selo).`,
      category: 'parcela_emprestimo',
      status: status,
      priority: isAugustDue ? 'Urgente' : 'Normal',
      amount: regularMonthly,
      principalAmount: principalAmount,
      interestPortion: interestPortion,
      interestAmount: 0,
      balanceAfter: runningBalance,
      installmentNumber: i,
      totalInstallments: totalMonths,
      isSystemLoanEvent: true,
      isCompleted: isPastPaid,
      labels: ['Jeep Renegade', isAugustDue ? 'Atrasada' : (isPastPaid ? 'Pago' : 'Pendente')]
    });
  }

  return events;
}

// Helper to generate Crédito Automóvel - DACIA SANDERO II (Contrato CRD19605103001)
function createDaciaLoanEvents() {
  const events = [];
  const totalDebt = 9584.45;
  const regularMonthly = 180.08;
  const totalMonths = 96; // 96 prestações (Maio 2019 a Maio 2027)
  const monthlyRate = 0.054 / 12; // TAN 5.40%

  let runningBalance = totalDebt;

  for (let i = 1; i <= totalMonths; i++) {
    const totalMonthOffset = i - 1; // 0 = Junho 2019
    const startYear = 2019;
    const startMonth = 6; // Junho

    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-28`;

    // Hoje é Agosto de 2026 (Prestações 1 a 86 estão Pagas, 87 em diante Pendentes)
    const isPastPaid = i < 87;
    const isAugustDue = i === 87; // Prestação 87 (Agosto 2026)

    let status = 'Pendente';
    if (isPastPaid) {
      status = 'Pago';
    }

    let interestPortion = Math.max(0, Math.round(runningBalance * monthlyRate * 100) / 100);
    let taxPortion = Math.round(interestPortion * 0.04 * 100) / 100;
    let servicesPortion = 55.89; // Seguro (42.41) + Veic. Substituição (9.00) + Garantia (3.00) + Carta Verde (2.16) + Assistência (1.50)
    let principalAmount = Math.min(runningBalance, Math.round((regularMonthly - servicesPortion - interestPortion - taxPortion) * 100) / 100);

    if (i === 80) {
      principalAmount = 114.69;
      interestPortion = 9.12;
      taxPortion = 0.36;
      servicesPortion = 55.91;
    } else if (i === 81) {
      principalAmount = 115.23;
      interestPortion = 8.60;
      taxPortion = 0.36;
      servicesPortion = 55.89;
    }

    runningBalance = Math.max(0, Math.round((runningBalance - principalAmount) * 100) / 100);

    events.push({
      id: `dacia-loan-inst-${i}`,
      timelineOriginId: 'tl-loan-dacia',
      timelineOriginName: 'Crédito Automóvel - Dacia Sandero',
      timelineOriginIcon: '🚗',
      date: dateStr,
      time: '08:30',
      title: `Prestação Dacia #${i} de ${totalMonths}`,
      description: `Débito Direto PT50002300004549878663394 (${formatCurrency(principalAmount)} capital + ${formatCurrency(interestPortion)} juros + ${formatCurrency(taxPortion)} imp. selo + ${formatCurrency(servicesPortion)} seguros/serviços).`,
      category: 'parcela_emprestimo',
      status: status,
      priority: 'Normal',
      amount: regularMonthly,
      principalAmount: principalAmount,
      interestPortion: interestPortion,
      interestAmount: taxPortion,
      servicesAmount: servicesPortion,
      balanceAfter: runningBalance,
      installmentNumber: i,
      totalInstallments: totalMonths,
      isSystemLoanEvent: true,
      isCompleted: isPastPaid,
      labels: ['Dacia Sandero II', isPastPaid ? 'Pago' : 'Pendente']
    });
  }

  return events;
}

// Helper to generate Crédito Hipotecário - CASA 1 (Contrato 02012642)
function createCasa1LoanEvents() {
  const events = [];
  const regularMonthly = 288.01;
  const totalMonths = 432; // 36 anos (94 pagas + 338 remanescentes)

  // Base: Novembro de 2018 (Prestação 1) até Outubro de 2054 (Prestação 432)
  for (let i = 1; i <= totalMonths; i++) {
    const totalMonthOffset = i - 1; // 0 = Novembro 2018
    const startYear = 2018;
    const startMonth = 11; // Novembro

    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-01`;

    const isPastPaid = i <= 94; // Prestações 1 a 94 pagas (até Agosto 2026)
    const status = isPastPaid ? 'Pago' : 'Pendente';
    const balanceAfter = Math.max(0, Math.round((58006.90 - (i - 94) * 115.61) * 100) / 100);

    events.push({
      id: `casa1-loan-inst-${i}`,
      timelineOriginId: 'tl-loan-casa1',
      timelineOriginName: 'Crédito Hipotecário - Casa 1',
      timelineOriginIcon: '🏠',
      date: dateStr,
      time: '08:00',
      title: `Prestação Casa 1 #${i} de ${totalMonths}`,
      description: `Crédito Hipotecário Nº 02012642 (TAN 2.690%). Capital: 115,61 € | Juros: 130,29 € | Seguro de Vida: 42,11 €`,
      category: 'parcela_emprestimo',
      status: status,
      priority: 'Normal',
      amount: regularMonthly,
      principalAmount: 115.61,
      interestPortion: 130.29,
      interestAmount: 0,
      balanceAfter: balanceAfter,
      installmentNumber: i,
      totalInstallments: totalMonths,
      isSystemLoanEvent: true,
      isCompleted: isPastPaid,
      labels: ['Casa 1', '02012642', isPastPaid ? 'Pago' : 'Pendente'],
      breakdownItems: [
        { id: `c1-cap-${i}`, name: 'Capital', amount: 115.61 },
        { id: `c1-jur-${i}`, name: 'Juros', amount: 130.29 },
        { id: `c1-selo-${i}`, name: 'Imposto do Selo', amount: 0.00 },
        { id: `c1-seg-${i}`, name: 'Seguro de Vida', amount: 42.11 }
      ]
    });
  }

  return events;
}

// Helper to generate Crédito Hipotecário - CASA 2 (Contrato 02015122)
function createCasa2LoanEvents() {
  const events = [];
  const regularMonthly = 293.05;
  const totalMonths = 348; // 29 anos (17 pagas + 331 remanescentes)

  // Base: Abril de 2025 (Prestação 1) até Março de 2054 (Prestação 348)
  for (let i = 1; i <= totalMonths; i++) {
    const totalMonthOffset = i - 1; // 0 = Abril 2025
    const startYear = 2025;
    const startMonth = 4; // Abril

    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-01`;

    const isPastPaid = i <= 17; // Prestações 1 a 17 pagas (até Agosto 2026)
    const status = isPastPaid ? 'Pago' : 'Pendente';
    const balanceAfter = Math.max(0, Math.round((50137.21 - (i - 17) * 83.00) * 100) / 100);

    events.push({
      id: `casa2-loan-inst-${i}`,
      timelineOriginId: 'tl-loan-casa2',
      timelineOriginName: 'Crédito Hipotecário - Casa 2',
      timelineOriginIcon: '🏡',
      date: dateStr,
      time: '08:00',
      title: `Prestação Casa 2 #${i} de ${totalMonths}`,
      description: `Crédito Hipotecário Nº 02015122 (TAN 3.990%). Capital: 83,00 € | Juros: 166,98 € | Imposto Selo: 6,68 € | Seguro Vida: 36,39 €`,
      category: 'parcela_emprestimo',
      status: status,
      priority: 'Normal',
      amount: regularMonthly,
      principalAmount: 83.00,
      interestPortion: 166.98,
      interestAmount: 6.68,
      balanceAfter: balanceAfter,
      installmentNumber: i,
      totalInstallments: totalMonths,
      isSystemLoanEvent: true,
      isCompleted: isPastPaid,
      labels: ['Casa 2', '02015122', isPastPaid ? 'Pago' : 'Pendente'],
      breakdownItems: [
        { id: `c2-cap-${i}`, name: 'Capital', amount: 83.00 },
        { id: `c2-jur-${i}`, name: 'Juros', amount: 166.98 },
        { id: `c2-selo-${i}`, name: 'Imposto do Selo', amount: 6.68 },
        { id: `c2-seg-${i}`, name: 'Seguro de Vida', amount: 36.39 }
      ]
    });
  }

  return events;
}

// Helper to generate Financial Timeline events (Entradas, Gastos e Investimentos)
function createFinancialEvents() {
  const events = [];
  const salaryAmount = 3178.00;
  const mealAllowanceAmount = 171.60;
  const todayStr = '2026-08-21';

  // Gerar movimentos mensais de Janeiro de 2026 a Abril de 2027
  for (let year = 2026; year <= 2027; year++) {
    const maxMonth = year === 2027 ? 4 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const monthStr = month.toString().padStart(2, '0');
      
      // 1. ENTRADA: Salário Mensal (Dia 27)
      const salaryDateStr = `${year}-${monthStr}-27`;
      const isSalaryPast = salaryDateStr <= todayStr;
      events.push({
        id: `fin-salary-${year}-${monthStr}`,
        seriesId: 'series-salary-main',
        timelineOriginId: 'tl-income',
        timelineOriginName: 'Financeiro',
        timelineOriginIcon: '💰',
        date: salaryDateStr,
        time: '10:00',
        title: 'Salário',
        description: '',
        category: 'entrada_recorrente',
        financialType: 'entrada',
        periodicity: 'recorrente',
        status: isSalaryPast ? 'Recebido' : 'Pendente',
        priority: 'Normal',
        amount: salaryAmount,
        isIncome: true,
        isExpense: false,
        isRecurring: true,
        isCompleted: isSalaryPast,
        labels: ['Salário', isSalaryPast ? 'Recebido' : 'Pendente']
      });

      // 1.1 ENTRADA: Subsídio de Refeição (Dia 27)
      events.push({
        id: `fin-meal-${year}-${monthStr}`,
        seriesId: 'series-meal-allowance',
        timelineOriginId: 'tl-income',
        timelineOriginName: 'Financeiro',
        timelineOriginIcon: '💰',
        date: salaryDateStr,
        time: '10:05',
        title: 'Refeição',
        description: 'Subsídio de Alimentação',
        category: 'entrada_recorrente',
        financialType: 'entrada',
        periodicity: 'recorrente',
        status: isSalaryPast ? 'Recebido' : 'Pendente',
        priority: 'Normal',
        amount: mealAllowanceAmount,
        isIncome: true,
        isExpense: false,
        isRecurring: true,
        isCompleted: isSalaryPast,
        labels: ['Refeição', isSalaryPast ? 'Recebido' : 'Pendente']
      });

      // 2. GASTOS FIXOS RECORRENTES MENSAIS (Sem Carro 1 e Carro 2)
      const recurringExpenses = [
        { title: 'Condomínio', amount: 20.00, day: '02', priority: 'Alta' },
        { title: 'Luz', amount: 80.00, day: '08', priority: 'Alta' },
        { title: 'Água', amount: 50.00, day: '10', priority: 'Alta' },
        { title: 'Comida', amount: 300.00, day: '15', priority: 'Alta' },
        { title: 'Conctvida', amount: 150.00, day: '18', priority: 'Normal' },
        { title: 'Rafael', amount: 200.00, day: '20', priority: 'Normal' },
        { title: 'Gasolina', amount: 40.00, day: '25', priority: 'Normal' }
      ];

      recurringExpenses.forEach((exp, expIdx) => {
        const expDateStr = `${year}-${monthStr}-${exp.day}`;
        const isExpPast = expDateStr <= todayStr;
        events.push({
          id: `fin-exp-${expIdx}-${year}-${monthStr}`,
          seriesId: `series-exp-${expIdx}`,
          timelineOriginId: 'tl-income',
          timelineOriginName: 'Financeiro',
          timelineOriginIcon: '💰',
          date: expDateStr,
          time: '09:00',
          title: exp.title,
          description: '',
          category: 'saida_recorrente',
          financialType: 'gasto',
          periodicity: 'recorrente',
          status: isExpPast ? 'Pago' : 'Pendente',
          priority: exp.priority,
          amount: exp.amount,
          isIncome: false,
          isExpense: true,
          isRecurring: true,
          isCompleted: isExpPast,
          labels: [exp.title, isExpPast ? 'Pago' : 'Pendente']
        });
      });

      // 5. INVESTIMENTO: Aporte Poupança / Reserva (Dia 28)
      const savDateStr = `${year}-${monthStr}-28`;
      const isSavPast = savDateStr <= todayStr;
      events.push({
        id: `fin-sav-${year}-${monthStr}`,
        timelineOriginId: 'tl-income',
        timelineOriginName: 'Financeiro',
        timelineOriginIcon: '💰',
        date: savDateStr,
        time: '12:00',
        title: 'Reforço Reserva de Emergência',
        description: '',
        category: 'investimento_poupanca',
        financialType: 'investimento',
        status: isSavPast ? 'Investido' : 'Planeado',
        priority: 'Normal',
        amount: 350.00,
        isIncome: false,
        isInvestment: true,
        isCompleted: isSavPast,
        labels: ['Poupança', isSavPast ? 'Investido' : 'Planeado']
      });

      // 6. INVESTIMENTO: Aporte Fundos / ETF Global (Dia 28)
      events.push({
        id: `fin-etf-${year}-${monthStr}`,
        timelineOriginId: 'tl-income',
        timelineOriginName: 'Financeiro',
        timelineOriginIcon: '💰',
        date: savDateStr,
        time: '12:30',
        title: 'Aporte ETF Mundial (VWCE/IWDA)',
        description: '',
        category: 'investimento_etf',
        financialType: 'investimento',
        status: isSavPast ? 'Investido' : 'Planeado',
        priority: 'Normal',
        amount: 250.00,
        isIncome: false,
        isInvestment: true,
        isCompleted: isSavPast,
        labels: ['Investimentos', isSavPast ? 'Investido' : 'Planeado']
      });
    }
  }

  return events;
}

export const initialTimeboards = [
  {
    id: "tb-principal",
    name: "Timeboard Principal",
    description: "Gestão e controle financeiro consolidado.",
    tenant: "default",
    type: null,
    createdAt: "2026-08-24T17:55:00.000Z",
    updatedAt: "2026-08-24T17:55:00.000Z"
  }
];

export const initialTimelines = [
  // 1. TIMELINE FINANCEIRO (ENTRADAS, GASTOS, INVESTIMENTOS, EMPRÉSTIMOS E BALANÇO)
  {
    id: "tl-income",
    timeboardId: "tb-principal",
    name: "Financeiro",
    description: "",
    startDate: "2026-01-01",
    endDate: "2027-04-30",
    status: "Em Progresso",
    type: "Financeiro",
    color: "#10b981",
    periodicity: "mensal",
    monthlySalary: 3349.60,
    carLoans: [
      {
        id: "tl-loan-jeep",
        name: "Crédito Automóvel - Jeep",
        description: "Contrato Nº 80004197726 (TAN 11.183%). Débito Direto PT50002300004549878663394.",
        startDate: "2024-05-15",
        endDate: "2034-04-15",
        status: "Em Progresso",
        type: "Empréstimo",
        color: "#6366f1",
        totalDebt: 15456.60,
        installmentAmount: 218.47,
        periodicity: "mensal",
        dueDay: 15
      },
      {
        id: "tl-loan-dacia",
        name: "Crédito Automóvel - Dacia Sandero",
        description: "Contrato CRD19605103001 (Matrícula: 46-XP-14). RCI Banque / Mobilize FS (TAEG 5.40%). Débito Direto PT50002300004549878663394.",
        startDate: "2019-05-29",
        endDate: "2027-05-28",
        status: "Em Progresso",
        type: "Empréstimo",
        color: "#8b5cf6",
        totalDebt: 9584.45,
        remainingDebt: 972.74,
        installmentAmount: 180.08,
        financialPortion: 124.17,
        servicesPortion: 55.91,
        periodicity: "mensal",
        dueDay: 28
      },
      {
        id: "tl-loan-casa1",
        name: "Crédito Hipotecário - Casa 1",
        contractNumber: "02012642",
        description: "Crédito Hipotecário Nº 02012642 (TAN 2.690%). Prestação nº 94. Próximo débito 01/08/2026.",
        startDate: "2018-11-01",
        endDate: "2054-10-01",
        status: "Em Progresso",
        type: "Empréstimo",
        color: "#0ea5e9",
        totalDebt: 67884.39,
        remainingDebt: 58006.90,
        amortizedCapital: 9877.49,
        installmentAmount: 288.01,
        tan: 2.690,
        currentInstallmentNumber: 94,
        remainingMonths: 338,
        periodicity: "mensal",
        dueDay: 3
      },
      {
        id: "tl-loan-casa2",
        name: "Crédito Hipotecário - Casa 2",
        contractNumber: "02015122",
        description: "Crédito Hipotecário Nº 02015122 (TAN 3.990%). Prestação nº 17. Próximo débito 03/08/2026.",
        startDate: "2025-03-03",
        endDate: "2054-03-03",
        status: "Em Progresso",
        type: "Empréstimo",
        color: "#14b8a6",
        totalDebt: 51417.00,
        remainingDebt: 50137.21,
        amortizedCapital: 1279.79,
        installmentAmount: 293.05,
        tan: 3.990,
        currentInstallmentNumber: 17,
        remainingMonths: 331,
        periodicity: "mensal",
        dueDay: 3
      }
    ],
    events: [
      ...createFinancialEvents(),
      ...createJeepLoanEvents(),
      ...createDaciaLoanEvents(),
      ...createCasa1LoanEvents(),
      ...createCasa2LoanEvents()
    ]
  }
];
