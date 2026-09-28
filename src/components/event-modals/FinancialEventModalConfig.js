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
  Clock,
  Undo2,
  SprayCan,
  Receipt
} from 'lucide-react';
import { EventStatus, EventType, IncomeEventCategory, ExpenseEventCategory, InvestmentEventCategory, ReminderEventCategory, TimelineColor } from '../../../shared/enums/index.js';

export const INCOME_CATEGORY_META = {
  [IncomeEventCategory.SALARY]: { icon: DollarSign, color: TimelineColor.EMERALD, bg: `${TimelineColor.EMERALD}26` },
  [IncomeEventCategory.MEAL_ALLOWANCE]: { icon: Utensils, color: TimelineColor.AMBER, bg: `${TimelineColor.AMBER}26` },
  [IncomeEventCategory.BONUS]: { icon: Sparkles, color: TimelineColor.VIOLET, bg: `${TimelineColor.VIOLET}26` },
  [IncomeEventCategory.FREELANCE]: { icon: Zap, color: TimelineColor.CYAN, bg: `${TimelineColor.CYAN}26` },
  [IncomeEventCategory.INVESTMENT_RETURN]: { icon: TrendingUp, color: TimelineColor.BLUE, bg: `${TimelineColor.BLUE}26` },
  [IncomeEventCategory.RECURRING_INCOME]: { icon: Repeat, color: TimelineColor.TEAL, bg: `${TimelineColor.TEAL}26` },
  [IncomeEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE_LIGHT, bg: `${TimelineColor.SLATE_LIGHT}26` }
};

// Condominium (condoflow) income categories, shown as selection boxes (order matters)
export const CONDO_INCOME_CATEGORY_META = {
  [IncomeEventCategory.CONDO_PAYMENT]: { icon: Home, color: TimelineColor.CONDOFLOW, bg: `${TimelineColor.CONDOFLOW}26` },
  [IncomeEventCategory.RESERVE_FUND]: { icon: ShieldCheck, color: TimelineColor.INVESTMENT, bg: `${TimelineColor.INVESTMENT}26` },
  [IncomeEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE, bg: `${TimelineColor.SLATE}26` }
};

// Condominium (condoflow) account deposit categories (investment / savings timeline), shown as selection boxes
export const CONDO_INVESTMENT_CATEGORY_META = {
  [InvestmentEventCategory.CONDO_PAYMENT]: { icon: Home, color: TimelineColor.CONDOFLOW, bg: `${TimelineColor.CONDOFLOW}26` },
  [InvestmentEventCategory.RESERVE_FUND]: { icon: ShieldCheck, color: TimelineColor.INVESTMENT, bg: `${TimelineColor.INVESTMENT}26` },
  [InvestmentEventCategory.REFUND]: { icon: Undo2, color: TimelineColor.CYAN, bg: `${TimelineColor.CYAN}26` },
  [InvestmentEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE, bg: `${TimelineColor.SLATE}26` }
};

// Condominium (condoflow) expense categories, shown as selection boxes (order matters)
export const CONDO_EXPENSE_CATEGORY_META = {
  [ExpenseEventCategory.ELECTRICITY]: { icon: Zap, color: TimelineColor.AMBER, bg: `${TimelineColor.AMBER}26` },
  [ExpenseEventCategory.WATER]: { icon: Droplets, color: TimelineColor.SKY, bg: `${TimelineColor.SKY}26` },
  [ExpenseEventCategory.GAS]: { icon: Flame, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.CLEANING]: { icon: SprayCan, color: TimelineColor.CYAN, bg: `${TimelineColor.CYAN}26` },
  [ExpenseEventCategory.SERVICES]: { icon: Wrench, color: TimelineColor.VIOLET, bg: `${TimelineColor.VIOLET}26` },
  [ExpenseEventCategory.BANK_FEES]: { icon: Receipt, color: TimelineColor.SLATE, bg: `${TimelineColor.SLATE}26` },
  [ExpenseEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE, bg: `${TimelineColor.SLATE}26` }
};

/**
 * Adjusts a modal config to the active timeboard. On condominium (condoflow) timeboards:
 * - income: Condominium Payment (default), Reserve Fund and Other
 * - account deposits (investment): Condominium Payment (default), Reserve Fund, Refund and Other
 * - expenses: Electricity, Water, Gas, Cleaning, Services and Other (default)
 * all chosen with selection boxes.
 */
export function resolveEventModalConfig(config, isCondoflow) {
  if (!isCondoflow) return config;
  if (config?.eventType === EventType.INVESTMENT) {
    return {
      ...config,
      showCategories: true,
      categoryMeta: CONDO_INVESTMENT_CATEGORY_META,
      categoryDefault: InvestmentEventCategory.CONDO_PAYMENT,
      categoryLegacyMap: null,
      useCategoryBoxes: true,
      translationPrefix: 'condoInvestmentCategories',
      categoryDescriptionPrefix: 'condoInvestmentCategoryDesc',
      // Condominium account deposits come from outside (owners' payments): external by default
      defaultIsExternal: true,
      // Condominium account deposits are called "entries" (not investments)
      titleKeys: {
        ...config.titleKeys,
        newKey: 'modal.condoDepositNew',
        editKey: 'modal.condoDepositEdit',
        addKey: 'modal.condoDepositAdd'
      }
    };
  }
  if (config?.eventType === EventType.EXPENSE) {
    return {
      ...config,
      categoryMeta: CONDO_EXPENSE_CATEGORY_META,
      categoryDefault: ExpenseEventCategory.OTHER,
      categoryLegacyMap: null,
      useCategoryBoxes: true,
      translationPrefix: 'condoExpenseCategories',
      categoryDescriptionPrefix: 'condoExpenseCategoryDesc'
    };
  }
  if (config?.eventType !== EventType.INCOME) return config;
  return {
    ...config,
    categoryMeta: CONDO_INCOME_CATEGORY_META,
    categoryDefault: IncomeEventCategory.CONDO_PAYMENT,
    categoryLegacyMap: null,
    useCategoryBoxes: true,
    categoryDescriptionPrefix: 'condoIncomeCategoryDesc'
  };
}

export const EXPENSE_CATEGORY_META = {
  [ExpenseEventCategory.FOOD]: { icon: Utensils, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.RENT]: { icon: Home, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.ELECTRICITY]: { icon: Zap, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.WATER]: { icon: Droplets, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.GAS]: { icon: Flame, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.COMMUNICATIONS]: { icon: Wifi, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.TRANSPORTATION]: { icon: Bus, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.HEALTH]: { icon: HeartPulse, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.EDUCATION]: { icon: GraduationCap, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.ENTERTAINMENT]: { icon: Film, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.SHOPPING]: { icon: ShoppingBag, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.CLOTHING]: { icon: Shirt, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.CARMAINTENANCE]: { icon: Wrench, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.HOUSE]: { icon: Hammer, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.ENSURANCE]: { icon: ShieldCheck, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.PETS]: { icon: Dog, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.TRAVEL]: { icon: Plane, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.PERSONAL_CARE]: { icon: Sparkles, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.SERVICES]: { icon: Pin, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.BANK_FEES]: { icon: Receipt, color: TimelineColor.SLATE, bg: `${TimelineColor.SLATE}26` },
  [ExpenseEventCategory.CONDOMINIUM]: { icon: Landmark, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.RESERVE]: { icon: PiggyBank, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` },
  [ExpenseEventCategory.OTHER]: { icon: Tag, color: TimelineColor.ROSE, bg: `${TimelineColor.ROSE}26` }
};

export const INVESTMENT_CATEGORY_META = {
  [InvestmentEventCategory.SAVINGS]: { icon: PiggyBank, color: TimelineColor.VIOLET, bg: `${TimelineColor.VIOLET}26` },
  [InvestmentEventCategory.STOCKS]: { icon: TrendingUp, color: TimelineColor.BLUE, bg: `${TimelineColor.BLUE}26` },
  [InvestmentEventCategory.FUNDS]: { icon: Layers, color: TimelineColor.CYAN, bg: `${TimelineColor.CYAN}26` },
  [InvestmentEventCategory.REAL_ESTATE]: { icon: Landmark, color: TimelineColor.EMERALD, bg: `${TimelineColor.EMERALD}26` },
  [InvestmentEventCategory.CRYPTO]: { icon: Zap, color: TimelineColor.AMBER, bg: `${TimelineColor.AMBER}26` },
  [InvestmentEventCategory.ASSETS]: { icon: Sparkles, color: TimelineColor.PINK, bg: `${TimelineColor.PINK}26` },
  [InvestmentEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE_LIGHT, bg: `${TimelineColor.SLATE_LIGHT}26` }
};

export const REMINDER_CATEGORY_META = {
  [ReminderEventCategory.BIRTHDAY]: { icon: Cake, color: TimelineColor.PINK, bg: `${TimelineColor.PINK}26` },
  [ReminderEventCategory.MAINTENANCE]: { icon: Wrench, color: TimelineColor.ORANGE, bg: `${TimelineColor.ORANGE}26` },
  [ReminderEventCategory.RANDOM_EVENT]: { icon: Calendar, color: TimelineColor.CYAN, bg: `${TimelineColor.CYAN}26` },
  [ReminderEventCategory.APPOINTMENT]: { icon: Clock, color: TimelineColor.PRIMARY, bg: `${TimelineColor.PRIMARY}26` },
  [ReminderEventCategory.OTHER]: { icon: Tag, color: TimelineColor.SLATE_LIGHT, bg: `${TimelineColor.SLATE_LIGHT}26` }
};

const incomeConfig = {
  accent: TimelineColor.EMERALD,
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
  titleKeys: {
    newKey: 'modal.newIncome',
    editKey: 'modal.editIncome',
    addKey: 'modal.addIncome'
  },
  titleLabelKey: 'modal.incomeTitleLabel',
  titlePlaceholderKey: 'modal.incomeTitlePlaceholder',
  translationPrefix: 'incomeCategories',
  amountLabelKey: 'modal.incomeAmountLabel',
  amountBg: `${TimelineColor.EMERALD}14`,
  submitBg: `linear-gradient(135deg, ${TimelineColor.EMERALD} 0%, ${TimelineColor.EMERALD}d9 100%)`,
  submitBorder: TimelineColor.EMERALD,
  submitShadow: `0 4px 14px ${TimelineColor.EMERALD}59`,
  submitText: TimelineColor.WHITE
};

const expenseConfig = {
  accent: TimelineColor.ROSE,
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
  titleKeys: {
    newKey: 'modal.newExpense',
    editKey: 'modal.editExpense',
    addKey: 'modal.addExpense'
  },
  titleLabelKey: 'modal.expenseTitleLabel',
  titlePlaceholderKey: 'modal.expenseTitlePlaceholder',
  translationPrefix: 'expenseCategories',
  amountLabelKey: 'modal.expenseAmountLabel',
  amountBg: `${TimelineColor.ROSE}14`,
  submitBg: TimelineColor.ROSE,
  submitBorder: TimelineColor.ROSE,
  submitShadow: undefined,
  submitText: undefined
};

const investmentConfig = {
  accent: TimelineColor.VIOLET,
  icon: PiggyBank,
  eventType: EventType.INVESTMENT,
  categoryMeta: INVESTMENT_CATEGORY_META,
  categoryDefault: InvestmentEventCategory.OTHER,
  showCategories: false,
  categoryLegacyMap: {
    investimento_poupanca: InvestmentEventCategory.SAVINGS,
    investimento_patrimonio: InvestmentEventCategory.ASSETS,
    investimento_outros: InvestmentEventCategory.OTHER
  },
  defaultStatus: EventStatus.PLANNED,
  useBreakdown: false,
  showAmount: true,
  showAutomatic: true,
  showInitialTarget: false,
  showIsExternal: true,
  includeSnakeObligation: false,
  subtitleKey: 'timeline.investments',
  titleKeys: {
    newKey: 'modal.newInvestment',
    editKey: 'modal.editInvestment',
    addKey: 'modal.addInvestment'
  },
  titleLabelKey: 'modal.investmentTitleLabel',
  titlePlaceholderKey: 'modal.investmentTitlePlaceholder',
  translationPrefix: 'investmentCategories',
  amountLabelKey: 'modal.monthlyInvestmentAmount',
  amountBg: undefined,
  submitBg: `linear-gradient(135deg, ${TimelineColor.VIOLET} 0%, ${TimelineColor.VIOLET}d9 100%)`,
  submitBorder: TimelineColor.VIOLET,
  submitShadow: `0 4px 14px ${TimelineColor.VIOLET}59`,
  submitText: TimelineColor.WHITE
};

const reminderConfig = {
  accent: TimelineColor.AMBER,
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
  titleKeys: {
    newKey: 'reminderModal.newTitle',
    editKey: 'reminderModal.editTitle',
    addKey: 'reminderModal.save'
  },
  titleLabelKey: 'reminderModal.nameLabel',
  titlePlaceholderKey: 'reminderModal.namePlaceholder',
  descriptionLabelKey: 'reminderModal.descriptionLabel',
  descriptionPlaceholderKey: 'reminderModal.descriptionPlaceholder',
  translationPrefix: 'reminderCategories',
  submitBg: `linear-gradient(135deg, ${TimelineColor.AMBER} 0%, ${TimelineColor.AMBER}d9 100%)`,
  submitBorder: TimelineColor.AMBER,
  submitShadow: `0 4px 14px ${TimelineColor.AMBER}59`,
  submitText: TimelineColor.WHITE
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