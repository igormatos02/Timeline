import {
  DollarSign,
  ShoppingCart,
  PiggyBank,
  Utensils,
  Home,
  Droplets,
  Flame,
  Wifi,
  Bus,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  Shirt,
  Wrench,
  Hammer,
  ShieldCheck,
  Dog,
  Plane,
  Sparkles,
  Pin,
  Zap,
  TrendingUp,
  Repeat,
  Tag,
  Layers,
  Landmark,
  Bell,
  Cake,
  Calendar,
  Clock
} from 'lucide-react';
import { EventStatus, EventType, IncomeEventCategory, ExpenseEventCategory, InvestmentEventCategory, ReminderEventCategory } from '../../../shared/enums/index.js';

export const INCOME_CATEGORY_META = {
  [IncomeEventCategory.SALARY]: { icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [IncomeEventCategory.MEAL_ALLOWANCE]: { icon: Utensils, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [IncomeEventCategory.BONUS]: { icon: Sparkles, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  [IncomeEventCategory.FREELANCE]: { icon: Zap, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  [IncomeEventCategory.INVESTMENT_RETURN]: { icon: TrendingUp, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  [IncomeEventCategory.RECURRING_INCOME]: { icon: Repeat, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
  [IncomeEventCategory.OTHER]: { icon: Tag, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export const EXPENSE_CATEGORY_META = {
  [ExpenseEventCategory.FOOD]: { icon: Utensils, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.RENT]: { icon: Home, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.ELECTRICITY]: { icon: Zap, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.WATER]: { icon: Droplets, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.GAS]: { icon: Flame, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.COMMUNICATIONS]: { icon: Wifi, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.TRANSPORTATION]: { icon: Bus, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.HEALTH]: { icon: HeartPulse, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.EDUCATION]: { icon: GraduationCap, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.ENTERTAINMENT]: { icon: Film, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.SHOPPING]: { icon: ShoppingBag, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.CLOTHING]: { icon: Shirt, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.CARMAINTENANCE]: { icon: Wrench, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.HOUSE]: { icon: Hammer, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.ENSURANCE]: { icon: ShieldCheck, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.PETS]: { icon: Dog, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.TRAVEL]: { icon: Plane, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.PERSONAL_CARE]: { icon: Sparkles, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.SERVICES]: { icon: Pin, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.CONDOMINIUM]: { icon: Landmark, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.RESERVE]: { icon: PiggyBank, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.OTHER]: { icon: Tag, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' }
};

export const INVESTMENT_CATEGORY_META = {
  [InvestmentEventCategory.SAVINGS]: { icon: PiggyBank, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  [InvestmentEventCategory.STOCKS]: { icon: TrendingUp, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  [InvestmentEventCategory.FUNDS]: { icon: Layers, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  [InvestmentEventCategory.REAL_ESTATE]: { icon: Landmark, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [InvestmentEventCategory.CRYPTO]: { icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [InvestmentEventCategory.ASSETS]: { icon: Sparkles, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  [InvestmentEventCategory.OTHER]: { icon: Tag, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export const REMINDER_CATEGORY_META = {
  [ReminderEventCategory.BIRTHDAY]: { icon: Cake, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  [ReminderEventCategory.MAINTENANCE]: { icon: Wrench, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  [ReminderEventCategory.RANDOM_EVENT]: { icon: Calendar, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  [ReminderEventCategory.APPOINTMENT]: { icon: Clock, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  [ReminderEventCategory.OTHER]: { icon: Tag, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

const incomeConfig = {
  accent: '#10b981',
  icon: DollarSign,
  eventType: EventType.INCOME,
  categoryMeta: INCOME_CATEGORY_META,
  categoryDefault: IncomeEventCategory.SALARY,
  categoryLegacyMap: null,
  defaultStatus: EventStatus.PENDING,
  useBreakdown: true,
  showAmount: true,
  showAutomatic: true,
  showInitialTarget: false,
  showIsExternal: false,
  includeSnakeObligation: true,
  subtitleKey: 'timeline.incomes',
  subtitleFallback: 'Entradas',
  titleKeys: {
    newKey: 'modal.newIncome', newFallback: 'Nova Entrada',
    editKey: 'modal.editIncome', editFallback: 'Editar Entrada',
    addKey: 'modal.addIncome', addFallback: 'Adicionar Entrada'
  },
  titleLabelKey: 'modal.incomeTitleLabel',
  titleLabelFallback: 'Título / Descrição *',
  titlePlaceholderKey: 'modal.incomeTitlePlaceholder',
  titlePlaceholderFallback: 'Ex: Salário Mensal, Freelance, Bónus, Dividendos...',
  translationPrefix: 'incomeCategories',
  amountLabelKey: 'modal.incomeAmountLabel',
  amountLabelFallback: 'Valor a Receber (€) *',
  amountBg: 'rgba(16, 185, 129, 0.08)',
  dayLabelFallback: 'Dia de Recebimento',
  automaticLabelFallback: 'Recebimento Automático',
  submitBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  submitBorder: '#10b981',
  submitShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
  submitText: '#ffffff'
};

const expenseConfig = {
  accent: '#f43f5e',
  icon: ShoppingCart,
  eventType: EventType.EXPENSE,
  categoryMeta: EXPENSE_CATEGORY_META,
  categoryDefault: ExpenseEventCategory.OTHER,
  categoryLegacyMap: null,
  defaultStatus: EventStatus.PENDING,
  useBreakdown: true,
  showAmount: true,
  showAutomatic: true,
  showInitialTarget: false,
  showIsExternal: false,
  includeSnakeObligation: false,
  subtitleKey: 'timeline.expenses',
  subtitleFallback: 'Despesas',
  titleKeys: {
    newKey: 'modal.newExpense', newFallback: 'Nova Despesa',
    editKey: 'modal.editExpense', editFallback: 'Editar Despesa',
    addKey: 'modal.addExpense', addFallback: 'Adicionar Despesa'
  },
  titleLabelKey: 'modal.expenseTitleLabel',
  titleLabelFallback: 'Descrição da Despesa *',
  titlePlaceholderKey: 'modal.expenseTitlePlaceholder',
  titlePlaceholderFallback: 'Ex: Renda / Aluguel, Supermercado, Eletricidade, Carro...',
  translationPrefix: 'expenseCategories',
  amountLabelKey: 'modal.expenseAmountLabel',
  amountLabelFallback: 'Valor da Despesa (€) *',
  amountBg: 'rgba(244, 63, 94, 0.08)',
  dayLabelFallback: 'Dia de Vencimento',
  automaticLabelFallback: 'Débito / Pagamento Automático',
  submitBg: '#f43f5e',
  submitBorder: '#f43f5e',
  submitShadow: undefined,
  submitText: undefined
};

const investmentConfig = {
  accent: '#8b5cf6',
  icon: PiggyBank,
  eventType: EventType.INVESTMENT,
  categoryMeta: INVESTMENT_CATEGORY_META,
  categoryDefault: InvestmentEventCategory.SAVINGS,
  categoryLegacyMap: {
    investimento_poupanca: InvestmentEventCategory.SAVINGS,
    investimento_patrimonio: InvestmentEventCategory.ASSETS,
    investimento_outros: InvestmentEventCategory.OTHER
  },
  defaultStatus: EventStatus.PLANNED,
  useBreakdown: false,
  showAmount: true,
  showAutomatic: true,
  showInitialTarget: true,
  showIsExternal: true,
  includeSnakeObligation: false,
  subtitleKey: 'timeline.investments',
  subtitleFallback: 'Investimentos',
  titleKeys: {
    newKey: 'modal.newInvestment', newFallback: 'Novo Investimento',
    editKey: 'modal.editInvestment', editFallback: 'Editar Investimento',
    addKey: 'modal.addInvestment', addFallback: 'Adicionar Investimento'
  },
  titleLabelKey: 'modal.investmentTitleLabel',
  titleLabelFallback: 'Título / Descrição *',
  titlePlaceholderKey: 'modal.investmentTitlePlaceholder',
  titlePlaceholderFallback: 'Ex: Poupança, Ações, Fundos ETF, Cripto...',
  translationPrefix: 'investmentCategories',
  amountLabelKey: 'modal.monthlyInvestmentAmount',
  amountLabelFallback: 'Aporte Mensal / Valor (€) *',
  amountBg: undefined,
  dayLabelFallback: 'Dia de Aplicação / Vencimento',
  automaticLabelFallback: 'Aporte / Débito Automático',
  submitBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  submitBorder: '#8b5cf6',
  submitShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
  submitText: '#ffffff'
};

const reminderConfig = {
  accent: '#f59e0b',
  icon: Bell,
  eventType: EventType.REMINDER,
  categoryMeta: REMINDER_CATEGORY_META,
  categoryDefault: ReminderEventCategory.APPOINTMENT,
  categoryLegacyMap: null,
  defaultStatus: EventStatus.OPEN,
  useBreakdown: false,
  showAmount: false,
  showAutomatic: false,
  showDescription: true,
  showObligations: true,
  showInitialTarget: false,
  showIsExternal: false,
  includeSnakeObligation: true,
  subtitleKey: 'timeline.reminders',
  subtitleFallback: 'Lembretes',
  titleKeys: {
    newKey: 'reminderModal.newTitle', newFallback: 'Novo Lembrete',
    editKey: 'reminderModal.editTitle', editFallback: 'Editar Lembrete',
    addKey: 'reminderModal.save', addFallback: 'Salvar Lembrete'
  },
  titleLabelKey: 'reminderModal.nameLabel',
  titleLabelFallback: 'Nome / Título *',
  titlePlaceholderKey: 'reminderModal.namePlaceholder',
  titlePlaceholderFallback: 'Ex: Consulta médica, Manutenção do carro, Aniversário...',
  descriptionLabelKey: 'reminderModal.descriptionLabel',
  descriptionLabelFallback: 'Descrição / Notas',
  descriptionPlaceholderKey: 'reminderModal.descriptionPlaceholder',
  descriptionPlaceholderFallback: 'Adicione informações adicionais ou contexto...',
  translationPrefix: 'reminderCategories',
  dayLabelFallback: 'Dia do Lembrete',
  submitBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  submitBorder: '#f59e0b',
  submitShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
  submitText: '#ffffff'
};

export const EVENT_MODAL_CONFIG = {
  [EventType.INCOME]: incomeConfig,
  [EventType.EXPENSE]: expenseConfig,
  [EventType.INVESTMENT]: investmentConfig,
  [EventType.REMINDER]: reminderConfig,
  // String key aliases for backwards compatibility
  income: incomeConfig,
  expense: expenseConfig,
  investment: investmentConfig,
  reminder: reminderConfig
};