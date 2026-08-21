import { formatCurrency } from '../utils/loanCalculations';

// Mock dataset for vertical timelines with advanced event categories, labels and Loan (Empréstimo) support

export const EVENT_CATEGORIES = [
  { id: 'parcela_emprestimo', name: 'Prestação / Parcela', icon: '💳', color: '#6366f1' },
  { id: 'amortizacao', name: 'Amortização Extraordinária', icon: '📉', color: '#10b981' },
  { id: 'agendamento', name: 'Agendamento', icon: '📅', color: '#06b6d4' },
  { id: 'repetitivo', name: 'Repetitivo / Aniversário', icon: '🔁', color: '#ec4899' },
  { id: 'tarefa', name: 'Pilha de Tarefas (Flutuante)', icon: '📌', color: '#f59e0b' },
  { id: 'memoria', name: 'Memória / Nota', icon: '📝', color: '#10b981' }
];

export const TIMELINE_TYPES = [
  'Empréstimo',
  'Tecnologia',
  'Pessoal',
  'Marketing',
  'Educação',
  'Outro'
];

export const TIMELINE_STATUSES = [
  'Em Progresso',
  'Planeado',
  'Em Pausa',
  'Concluído'
];

export const DEFAULT_LABELS = [
  { id: 'emprestimo', name: 'Crédito Automóvel', color: '#6366f1' },
  { id: 'amortizacao', name: 'Amortização', color: '#10b981' },
  { id: 'debito_direto', name: 'Débito Direto', color: '#06b6d4' },
  { id: 'trabalho', name: 'Trabalho', color: '#6366f1' },
  { id: 'pessoal', name: 'Pessoal', color: '#ec4899' },
  { id: 'urgente', name: 'Urgente', color: '#ef4444' },
  { id: 'financas', name: 'Finanças', color: '#10b981' }
];

// Helper to generate the exact Real Contract Crédito Automóvel Nº 80004197726
function createRealCarLoanEvents() {
  const events = [];
  const totalDebt = 15456.60;
  const regularMonthly = 218.47;
  const totalMonths = 120; // 120 prestações (Maio 2024 a Abril 2034)
  
  // Saldo devedor inicial
  let runningBalance = totalDebt;

  // Início em 2024-05-15 (Prestação #1) até 2034-04-15 (Prestação #120)
  for (let i = 1; i <= totalMonths; i++) {
    // Calcular data da prestação
    const totalMonthOffset = i - 1; // 0 = Maio 2024
    const startYear = 2024;
    const startMonth = 5; // Maio
    
    const absoluteMonth = startMonth + totalMonthOffset;
    const year = startYear + Math.floor((absoluteMonth - 1) / 12);
    const monthNumber = ((absoluteMonth - 1) % 12) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-15`;

    const isPastPaid = i < 28; // Prestações 1 a 27 (Maio 2024 a Julho 2026) estão pagas
    const isAugustDue = i === 28; // Prestação 28 (15 de Agosto de 2026 - atrasada face a 21 de Agosto de 2026)

    let status = 'Pendente';
    if (isPastPaid) {
      status = 'Pago';
    } else if (isAugustDue) {
      status = 'Atrasada';
    }

    // Decomposição real do extrato:
    // Prestação #28: Capital = 89.08€, Juros = 124.41€, Imposto Selo = 4.98€ (Juros totais = 129.39€)
    let principalAmount;
    let interestPortion;

    if (i === 28) {
      principalAmount = 89.08;
      interestPortion = 129.39; // 124.41 + 4.98
    } else if (i < 28) {
      // Amortização progressiva anterior somando os 2.107,59€
      principalAmount = Math.round((70 + (i * 0.7)) * 100) / 100;
      interestPortion = Math.round((regularMonthly - principalAmount) * 100) / 100;
    } else {
      // Prestações futuras (capital vai subindo ligeiramente à medida que o saldo reduz)
      principalAmount = Math.min(runningBalance, Math.round((89.08 + (i - 28) * 1.15) * 100) / 100);
      interestPortion = Math.max(0, Math.round((regularMonthly - principalAmount) * 100) / 100);
    }

    if (i === 28) {
      // Ajustar saldo exato do extrato
      runningBalance = 13259.93;
    } else {
      runningBalance = Math.max(0, Math.round((runningBalance - principalAmount) * 100) / 100);
    }

    events.push({
      id: `loan-inst-${i}`,
      date: dateStr,
      time: '08:30',
      title: `Prestação #${i} de ${totalMonths}`,
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
      labels: ['Crédito Automóvel', 'Débito Direto', isAugustDue ? 'Atrasada' : (isPastPaid ? 'Pago' : 'Pendente')]
    });
  }

  // Tarefa flutuante na pilha
  events.push({
    id: 'ev-loan-task-real',
    date: '2026-08-21',
    time: '',
    title: 'Validar Débito Direto PT50...663394 da Prestação #28 (218,47 €)',
    description: 'Verificar saldo e débito da prestação #28 de 15 de Agosto no extrato bancário.',
    status: 'Em Progresso',
    category: 'tarefa',
    priority: 'Urgente',
    author: 'Igor Matos',
    labels: ['Finanças', 'Débito Direto', 'Urgente'],
    isCompleted: false,
    tasks: [
      { text: 'Confirmar saldo na conta associada ao IBAN PT50002300004549878663394', completed: true },
      { text: 'Validar cobrança ADC ativa de 218,47 €', completed: false },
      { text: 'Arquivar extrato 2026/07 (TAN 11.183%)', completed: true }
    ]
  });

  return events;
}

export const initialTimelines = [
  // 1. TIMELINE PADRÃO: CONTRATO CRÉDITO AUTOMÓVEL Nº 80004197726 (EXTRATO REAL)
  {
    id: "tl-loan-80004197726",
    name: "Crédito Automóvel Nº 80004197726",
    description: "Com reserva de propriedade (TAN 11.183000%). Débito Direto IBAN: PT50002300004549878663394.",
    startDate: "2024-05-15",
    endDate: "2034-04-15",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#6366f1",
    totalDebt: 15456.60,
    installmentAmount: 218.47,
    periodicity: "mensal",
    dueDay: 15,
    events: createRealCarLoanEvents()
  },

  // 2. TIMELINE PROJETO (CHRONO)
  {
    id: "tl-1",
    name: "Lançamento da Plataforma Chrono",
    description: "Planeamento executivo e execução do novo ecossistema de gestão temporal para equipas de alta performance.",
    startDate: "2026-08-01",
    endDate: "2026-09-15",
    status: "Em Progresso",
    type: "Tecnologia",
    color: "#06b6d4",
    events: [
      {
        id: "ev-today",
        date: "2026-08-21",
        time: "10:30",
        title: "Sincronização da Interface Vertical & Protótipo UI",
        description: "Apresentação da nova linha temporal vertical interativa com ordenação decrescente e nós diários em tempo real.",
        status: "Em Progresso",
        category: "agendamento",
        priority: "Alta",
        author: "Igor Matos",
        labels: ["Trabalho", "Urgente"],
        tasks: [
          { text: "Aprovação do layout visual", completed: true },
          { text: "Testes de responsividade mobile", completed: false },
          { text: "Integrar animações Framer Motion", completed: true }
        ]
      },
      {
        id: "ev-repeat-1",
        date: "2026-08-21",
        time: "09:00",
        title: "Aniversário da Empresa (Comemoração Anual)",
        description: "Data comemorativa recorrente do nascimento da equipa de desenvolvimento.",
        status: "Concluído",
        category: "repetitivo",
        priority: "Média",
        author: "RH Team",
        labels: ["Aniversário", "Pessoal"]
      },
      {
        id: "ev-mem-1",
        date: "2026-08-20",
        time: "18:00",
        title: "Memória: Insights sobre Usabilidade de Timelines",
        description: "Nota de reflexão: A ordenação decrescente com filtro de tarefas flutuantes aumenta imenso a clareza do roadmap diário.",
        status: "Concluído",
        category: "memoria",
        priority: "Baixa",
        author: "Igor Matos",
        labels: ["Ideia / Nota"]
      }
    ]
  }
];
