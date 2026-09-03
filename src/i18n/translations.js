export const translations = {
  en: {
    // Header / Brand
    header: {
      brandSubtitle: "Financial Management & Timelines",
      selectTimeboard: "Select Timeboard",
      goToToday: "Go to Today",
      goToTodayTitle: "Return to today's date / current period",
      newTimeboard: "New Timeboard",
      createTimeboardTitle: "Create new Timeboard",
      toggleThemeDark: "Switch to dark theme",
      toggleThemeLight: "Switch to light theme"
    },

    // Buttons
    buttons: {
      addEvent: "Add Event",
      amortize: "Amortize",
      goToToday: "Go to Today",
      newTimeboard: "New Timeboard",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      all: "All",
      deselectAll: "Deselect",
      add: "Add"
    },

    // Toast Notifications
    toast: {
      eventSavedSuccess: "Event saved successfully to database!",
      eventCreatedSuccess: "Event created successfully in database!",
      eventUpdatedSuccess: "Event updated successfully in database!",
      eventDeletedSuccess: "Event deleted from database!",
      eventSaveError: "Error saving event to database.",
      eventDeleteError: "Error deleting event from database."
    },

    // Timeline Rows & Cards
    timeline: {
      eventsCount: "{count} event(s)",
      noEventsMonth: "No events recorded for this month",
      noEventsWeek: "No events recorded for this week",
      noEventsDay: "No events recorded for this day",
      addEventMonthTitle: "Add new event in {month}",
      currentBalance: "Current Balance",
      projectedBalance: "Projected Balance",
      income: "Income",
      expenses: "Expenses",
      investments: "Investments",
      net: "Net",
      total: "Total",
      realized: "Realized",
      forecast: "Forecast",
      today: "Today",
      monthProjection: "Month Projection:",
      monthIncomeTitle: "Total projected income for this month",
      monthExpenseTitle: "Total projected expenses for this month (includes loan installments)",
      monthInvestmentTitle: "Total projected contributions / investments for this month",
      monthBalanceTitle: "Projected monthly balance = Income - (Expenses + Investments)",
      balance: "Balance",
      noLoanMonth: "No installment or amortization this month",
      noTabRecords: "No records in this tab for this month"
    },

    // Sidebar Filters
    sidebar: {
      filtersNavigation: "Filters & Navigation",
      timelines: "Timelines",
      search: "Search",
      searchPlaceholder: "Search by title, desc or label...",
      focusCurrentMonth: "Focus Current Month",
      focusCurrentMonthTitle: "Focus and jump directly to current month",
      grouping: "Grouping",
      status: "Status",
      integratedTimelines: "Integrated Timelines",
      categoryType: "Category / Type",
      allStates: "All States",
      allCategories: "All Categories",
      allTypes: "All Types",
      day: "Day",
      week: "Week",
      month: "Month",
      year: "Year",
      hideEmpty: "Hide empty",
      showEmpty: "Show empty",
      visible: "Visible",
      hidden: "Hidden"
    },

    // Action Hints / Tooltips
    actionNotes: "View / Edit Notes",
    actionAddNote: "Add Note",
    actionBreakdown: "View / Edit Breakdown ({count} items)",
    actionSplitValue: "Breakdown Amount",
    actionAutoOn: "⚡ Automatic Mode Active: Automatically settles this series on due dates. Click to turn OFF for entire series.",
    actionAutoOff: "⚙️ Manual Mode: Click to enable automatic settlement for entire series.",
    actionEdit: "Edit Event",
    actionDelete: "Delete Event",
    actionToggleStatusPaid: "Mark as Pending",
    actionToggleStatusPending: "Mark as Settled / Paid",
    actionLock: "Event Locked",
    actionUnlock: "Event Unlocked",
    actionAmortize: "Simulate / Apply Extraordinary Amortization",
    actionSave: "Save",
    actionCancel: "Cancel",
    actionViewDetails: "View Details",

    // Financial Types
    financialType: {
      income: "Income",
      expense: "Expense",
      investment: "Investment",
      amortization: "Amortization"
    },

    // Categories
    category: {
      all: "All Categories",
      allTypes: "All Types",
      recurringIncome: "Salary / Income",
      sporadicIncome: "Bonus / Extras",
      fixedExpense: "Fixed Expenses",
      variableExpense: "Variable Expenses",
      savingsInvestment: "Savings",
      assetInvestment: "Assets / Wealth",
      otherInvestment: "Other Investments",
      loanInstallment: "Contract Installments",
      amortization: "Extra Amortizations",
      schedule: "Schedules",
      repetitive: "Recurring",
      task: "Tasks",
      note: "Notes"
    },

    // Statuses
    status: {
      all: "All",
      pending: "Pending",
      paid: "Paid",
      received: "Received",
      invested: "Invested",
      planned: "Planned",
      completed: "Completed",
      amortized: "Amortized",
      overdue: "Overdue",
      cancelled: "Cancelled",
      deleted: "Deleted",
      inProgress: "In Progress",
      settled: "Settled",
      abatida: "Abated",
      toReceive: "To Receive",
      toPay: "To Pay",
      receivedAt: "Received at {time}",
      paidAt: "Paid at {time}",
      investedAt: "Invested at {time}",
      settledAt: "Settled at {time}"
    },

    // Periodicities
    periodicity: {
      recurring: "Recurring",
      once: "One-time",
      period: "Period"
    },

    // Priorities
    priority: {
      normal: "Normal",
      high: "High",
      low: "Low",
      urgent: "Urgent"
    },

    // Modal Events
    modal: {
      editIncome: "Edit Income",
      newIncome: "New Income Event",
      titleLabel: "Income Title *",
      titlePlaceholder: "e.g., Monthly Salary, Bonus, Dividends...",
      amountLabel: "Amount to Receive (€) *",
      periodicity: "Periodicity",
      recurrent: "Recurrent",
      unique: "One-time",
      period: "Period",
      startMonth: "Start Month",
      endMonth: "End Month",
      periodExplanation: "The event will be generated every month from {start} to {end}.",
      dayOfMonth: "Day of Month",
      selectDueDay: "Select Due Day",
      subparts: "Subparts",
      splitIntoSubparts: "Split into Subparts",
      addSubpart: "Add Subpart",
      partNamePlaceholder: "Part {index} name",
      removeSubpart: "Remove subpart",
      status: "Status",
      statusPending: "Projected",
      statusReceived: "Received (Settled)",
      automatic: "Automatic",
      cancel: "Cancel",
      saveChanges: "Save Changes",
      addIncome: "Add Income",
      changeSubsequent: "Change subsequent events"
    }
  },

  pt: {
    // Header / Brand
    header: {
      brandSubtitle: "Gestão Financeira & Linhas Temporais",
      selectTimeboard: "Selecionar Timeboard",
      goToToday: "Ir para Hoje",
      goToTodayTitle: "Voltar à data de hoje / período atual",
      newTimeboard: "Novo Timeboard",
      createTimeboardTitle: "Criar novo Timeboard",
      toggleThemeDark: "Mudar para tema escuro",
      toggleThemeLight: "Mudar para tema claro"
    },

    // Buttons
    buttons: {
      addEvent: "Adicionar Evento",
      amortize: "Amortizar",
      goToToday: "Ir para Hoje",
      newTimeboard: "Novo Timeboard",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      all: "Todos",
      deselectAll: "Desmarcar",
      add: "Adicionar"
    },

    // Toast Notifications
    toast: {
      eventSavedSuccess: "Evento guardado com sucesso na base de dados!",
      eventCreatedSuccess: "Evento adicionado com sucesso na base de dados!",
      eventUpdatedSuccess: "Evento atualizado com sucesso na base de dados!",
      eventDeletedSuccess: "Evento eliminado da base de dados!",
      eventSaveError: "Erro ao guardar evento na base de dados.",
      eventDeleteError: "Erro ao eliminar evento da base de dados."
    },

    // Timeline Rows & Cards
    timeline: {
      eventsCount: "{count} evento(s)",
      noEventsMonth: "Sem eventos registados neste mês",
      noEventsWeek: "Sem eventos registados nesta semana",
      noEventsDay: "Sem eventos registados neste dia",
      addEventMonthTitle: "Adicionar novo evento em {month}",
      currentBalance: "Saldo Atual",
      projectedBalance: "Saldo Projetado",
      income: "Entradas",
      expenses: "Gastos",
      investments: "Investimentos",
      net: "Líquido",
      total: "Total",
      realized: "Realizado",
      forecast: "Previsão",
      today: "Hoje",
      monthProjection: "Projeção do Mês:",
      monthIncomeTitle: "Total de entradas projetadas para este mês",
      monthExpenseTitle: "Total de gastos projetados para este mês (inclui prestações de empréstimos)",
      monthInvestmentTitle: "Total de aportes / investimentos projetados para este mês",
      monthBalanceTitle: "Saldo Projetado do mês = Entradas - (Gastos + Investimentos)",
      balance: "Saldo",
      noLoanMonth: "Nenhuma parcela ou amortização neste mês",
      noTabRecords: "Sem registos nesta aba para este mês"
    },

    // Sidebar Filters
    sidebar: {
      filtersNavigation: "Filtros & Navegação",
      timelines: "Timelines",
      search: "Pesquisa",
      searchPlaceholder: "Procurar por título, desc ou etiqueta...",
      focusCurrentMonth: "Focar no Mês Atual",
      focusCurrentMonthTitle: "Focar e navegar diretamente para o mês atual",
      grouping: "Agrupamento",
      status: "Estado",
      integratedTimelines: "Linhas Integradas",
      categoryType: "Categoria / Tipo",
      allStates: "Todos os Estados",
      allCategories: "Todas as Categorias",
      allTypes: "Todos os Tipos",
      day: "Dia",
      week: "Semana",
      month: "Mês",
      year: "Ano",
      hideEmpty: "Ocultar vazios",
      showEmpty: "Mostrar vazios",
      visible: "Visível",
      hidden: "Oculto"
    },

    // Action Hints / Tooltips
    actionNotes: "Ver / Editar Notas",
    actionAddNote: "Adicionar Nota",
    actionBreakdown: "Ver / Editar Desmembramento ({count} subpartes)",
    actionSplitValue: "Desmembrar Valor",
    actionAutoOn: "⚡ Movimento Automático Ativo na Série: Liquida automaticamente na data de vencimento. Clique para desligar em toda a série.",
    actionAutoOff: "⚙️ Movimento Manual: Clique para ativar a liquidação automática em toda a série.",
    actionEdit: "Editar Evento",
    actionDelete: "Eliminar Evento",
    actionToggleStatusPaid: "Marcar como Pendente",
    actionToggleStatusPending: "Marcar como Pago / Recebido",
    actionLock: "Evento Bloqueado",
    actionUnlock: "Evento Desbloqueado",
    actionAmortize: "Simular / Aplicar Amortização Extraordinária",
    actionSave: "Guardar",
    actionCancel: "Cancelar",
    actionViewDetails: "Ver Detalhes",

    // Financial Types
    financialType: {
      income: "Entrada",
      expense: "Gasto",
      investment: "Investimento",
      amortization: "Amortização"
    },

    // Categories
    category: {
      all: "Todas as Categorias",
      allTypes: "Todos os Tipos",
      recurringIncome: "Salários / Rendas",
      sporadicIncome: "Bónus / Extras",
      fixedExpense: "Despesas Fixas",
      variableExpense: "Gastos Variáveis",
      savingsInvestment: "Poupança",
      assetInvestment: "Património",
      otherInvestment: "Outros Investimentos",
      loanInstallment: "Prestações Contratuais",
      amortization: "Amortizações Extras",
      schedule: "Agendamentos",
      repetitive: "Repetitivos",
      task: "Tarefas",
      note: "Notas"
    },

    // Statuses
    status: {
      all: "Todos",
      pending: "Pendente",
      paid: "Pago",
      received: "Recebido",
      invested: "Investido",
      planned: "Previsto",
      completed: "Concluído",
      amortized: "Amortizado",
      overdue: "Atrasada",
      cancelled: "Cancelado",
      deleted: "Excluído",
      inProgress: "Em Progresso",
      settled: "Liquidado",
      abatida: "Abatida",
      toReceive: "A Receber",
      toPay: "A Pagar",
      receivedAt: "Recebido às {time}",
      paidAt: "Pago às {time}",
      investedAt: "Investido às {time}",
      settledAt: "Liquidado às {time}"
    },

    // Periodicities
    periodicity: {
      recurring: "Recorrente",
      once: "Único",
      period: "Período"
    },

    // Priorities
    priority: {
      normal: "Normal",
      high: "Alta",
      low: "Baixa",
      urgent: "Urgente"
    },

    // Modal Events
    modal: {
      editIncome: "Editar Entrada",
      newIncome: "Nova Entrada de Rendimento",
      titleLabel: "Título do Rendimento *",
      titlePlaceholder: "Ex: Salário Mensal, Bónus, Dividendos...",
      amountLabel: "Valor a Receber (€) *",
      periodicity: "Periodicidade",
      recurrent: "Recorrente",
      unique: "Pontual",
      period: "Período",
      startMonth: "Mês de Início",
      endMonth: "Mês de Fim do Período",
      periodExplanation: "O evento será gerado todos os meses desde {start} até {end}.",
      dayOfMonth: "Dia do Mês",
      selectDueDay: "Selecione o Dia de Vencimento",
      subparts: "Subpartes",
      splitIntoSubparts: "Dividir em Subpartes",
      addSubpart: "Adicionar Subparte",
      partNamePlaceholder: "Nome da parte {index}",
      removeSubpart: "Remover subparte",
      status: "Estado",
      statusPending: "Previsto",
      statusReceived: "Recebido (Liquidado)",
      automatic: "Automático",
      cancel: "Cancelar",
      saveChanges: "Salvar Alterações",
      addIncome: "Adicionar Entrada",
      changeSubsequent: "Mudar subsequentes"
    }
  }
};

