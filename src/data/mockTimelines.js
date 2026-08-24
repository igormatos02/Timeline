import { formatCurrency } from '../utils/loanCalculations';

// Categories for events
export const EVENT_CATEGORIES = [
  { id: 'entrada_recorrente', name: 'Entrada Recorrente (Salário)', icon: '💰', color: '#10b981' },
  { id: 'entrada_esporadica', name: 'Entrada Esporádica (Bónus / Extra)', icon: '🎁', color: '#06b6d4' },
  { id: 'parcela_emprestimo', name: 'Prestação / Parcela', icon: '💳', color: '#6366f1' },
  { id: 'amortizacao', name: 'Amortização Extraordinária', icon: '📉', color: '#10b981' }
];

export const TIMELINE_TYPES = [
  'Principal',
  'Entradas',
  'Empréstimo'
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

// Helper to generate the 60.000 € / 34 Years / 2% Interest Home Loan (Crédito Habitação)
function createHomeLoanEvents() {
  const events = [];
  const totalDebt = 60000;
  const regularMonthly = 203.50;
  const totalMonths = 34 * 12; // 408 prestações (Janeiro 2018 a Dezembro 2051)
  const monthlyRate = 0.02 / 12; // 2% ao ano

  let runningBalance = totalDebt;

  for (let i = 1; i <= totalMonths; i++) {
    const totalMonthOffset = i - 1; // 0 = Janeiro 2018
    const startYear = 2018;
    const startMonth = 1; // Janeiro

    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-10`;

    const isPastPaid = i <= 104; // Janeiro 2018 a Agosto 2026
    let status = isPastPaid ? 'Pago' : 'Pendente';

    const interestPortion = Math.max(0, Math.round(runningBalance * monthlyRate * 100) / 100);
    const principalAmount = Math.min(runningBalance, Math.round((regularMonthly - interestPortion) * 100) / 100);
    runningBalance = Math.max(0, Math.round((runningBalance - principalAmount) * 100) / 100);

    events.push({
      id: `house-loan-inst-${i}`,
      timelineOriginId: 'tl-loan-house',
      timelineOriginName: 'Crédito Habitação',
      timelineOriginIcon: '🏠',
      date: dateStr,
      time: '09:00',
      title: `Prestação Casa #${i} de ${totalMonths}`,
      description: `Amortização de habitação própria (${formatCurrency(principalAmount)} capital + ${formatCurrency(interestPortion)} juros TAN 2%).`,
      category: 'parcela_emprestimo',
      status: status,
      priority: 'Normal',
      amount: regularMonthly,
      principalAmount: principalAmount,
      interestPortion: interestPortion,
      interestAmount: 0,
      balanceAfter: runningBalance,
      installmentNumber: i,
      totalInstallments: totalMonths,
      isSystemLoanEvent: true,
      isCompleted: isPastPaid,
      labels: ['Crédito Habitação', isPastPaid ? 'Pago' : 'Pendente']
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

  // Gerar movimentos mensais de 2024 a Agosto de 2027
  for (let year = 2024; year <= 2027; year++) {
    const maxMonth = year === 2027 ? 8 : 12;
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

export const initialTimelines = [
  // 1. TIMELINE PRINCIPAL (CONSOLIDADA - DEFAULT)
  {
    id: "tl-principal",
    name: "Timeline Principal (Consolidada)",
    description: "Visão executiva unificada com todos os compromissos, empréstimos e entradas consolidados até à data de hoje.",
    startDate: "2018-01-10",
    endDate: "2026-08-21",
    status: "Em Progresso",
    type: "Principal",
    color: "#8b5cf6",
    periodicity: "mensal",
    events: []
  },

  // 2. TIMELINE FINANCEIRO (ENTRADAS, GASTOS, INVESTIMENTOS, EMPRÉSTIMO CARRO E BALANÇO)
  {
    id: "tl-income",
    name: "Financeiro",
    description: "",
    startDate: "2024-01-01",
    endDate: "2027-08-31",
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
      }
    ],
    events: [...createFinancialEvents(), ...createJeepLoanEvents(), ...createDaciaLoanEvents()]
  },

  // 3. CRÉDITO HABITAÇÃO (CASA - 60.000€ / 34 ANOS / 2% TAN DESDE 2018)
  {
    id: "tl-loan-house",
    name: "Crédito Habitação - Casa",
    description: "Financiamento Imobiliário de 60.000,00 € a 34 anos (TAN 2.00%). Prestações pagas desde Janeiro de 2018.",
    startDate: "2018-01-10",
    endDate: "2052-01-10",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#059669",
    totalDebt: 60000.00,
    installmentAmount: 203.50,
    periodicity: "mensal",
    dueDay: 10,
    events: createHomeLoanEvents()
  }
];
