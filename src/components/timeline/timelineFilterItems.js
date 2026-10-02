import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Bus, CreditCard, Dog, Gift, Receipt, Droplets, Film, Flame, GraduationCap, Hammer, HeartPulse, Home, Landmark, PiggyBank, Plane, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Sparkles, Utensils, Wifi, Wrench, Zap } from 'lucide-react';
import { ExpensesEventCategory, TimelineColor, AccountMovementType, OutflowType } from '../../enums/index.js';
import { CONDO_EXPENSE_CATEGORY_META } from '../event-modals/FinancialEventModalConfig.js';

// Items of the timeline sidebar filters (expense categories, account movements, outflow types)
export const EXPENSE_CATEGORY_ITEMS = [
  { id: ExpensesEventCategory.FOOD, icon: Utensils, color: TimelineColor.EMERALD },
  { id: ExpensesEventCategory.RENT, icon: Home, color: TimelineColor.PRIMARY },
  { id: ExpensesEventCategory.ELECTRICITY, icon: Zap, color: TimelineColor.WARNING },
  { id: ExpensesEventCategory.WATER, icon: Droplets, color: TimelineColor.CYAN },
  { id: ExpensesEventCategory.GAS, icon: Flame, color: TimelineColor.AMBER },
  { id: ExpensesEventCategory.COMMUNICATIONS, icon: Wifi, color: TimelineColor.BLUE },
  { id: ExpensesEventCategory.TRANSPORTATION, icon: Bus, color: TimelineColor.PURPLE },
  { id: ExpensesEventCategory.HEALTH, icon: HeartPulse, color: TimelineColor.DANGER },
  { id: ExpensesEventCategory.EDUCATION, icon: GraduationCap, color: TimelineColor.SUCCESS },
  { id: ExpensesEventCategory.ENTERTAINMENT, icon: Film, color: TimelineColor.PINK },
  { id: ExpensesEventCategory.SHOPPING, icon: ShoppingBag, color: TimelineColor.EXPENSE },
  { id: ExpensesEventCategory.CLOTHING, icon: Shirt, color: TimelineColor.VIOLET },
  { id: ExpensesEventCategory.CARMAINTENANCE, icon: Wrench, color: TimelineColor.WARNING },
  { id: ExpensesEventCategory.HOUSE, icon: Hammer, color: TimelineColor.SUCCESS },
  { id: ExpensesEventCategory.ENSURANCE, icon: ShieldCheck, color: TimelineColor.INFO },
  { id: ExpensesEventCategory.PETS, icon: Dog, color: TimelineColor.AMBER },
  { id: ExpensesEventCategory.TRAVEL, icon: Plane, color: TimelineColor.CYAN },
  { id: ExpensesEventCategory.PERSONAL_CARE, icon: Sparkles, color: TimelineColor.ROSE },
  { id: ExpensesEventCategory.SERVICES, icon: CreditCard, color: TimelineColor.SLATE },
  { id: ExpensesEventCategory.BANK_FEES, icon: Receipt, color: TimelineColor.SLATE },
  { id: ExpensesEventCategory.TRANSFERS_DONATIONS, icon: Gift, color: TimelineColor.PINK },
];

// Account (savings timeline) movement kinds shown in the movement filter
export const ACCOUNT_MOVEMENT_ITEMS = [
  { id: AccountMovementType.INFLOW, icon: ArrowUpRight, color: TimelineColor.INVESTMENT },
  { id: AccountMovementType.WITHDRAWAL, icon: ArrowDownRight, color: TimelineColor.INCOME },
  { id: AccountMovementType.EXPENSE, icon: ShoppingCart, color: TimelineColor.EXPENSE },
  { id: AccountMovementType.TRANSFER, icon: ArrowLeftRight, color: TimelineColor.CYAN }
];

// Outflow kinds shown in the Outflows timeline filter: its own expenses, via savings (references), installments (references)
export const OUTFLOW_TYPE_ITEMS = [
  { id: OutflowType.REGULAR, icon: ShoppingCart, color: TimelineColor.EXPENSE },
  { id: OutflowType.SAVINGS, icon: PiggyBank, color: TimelineColor.INVESTMENT },
  { id: OutflowType.INSTALLMENT, icon: Landmark, color: TimelineColor.LOAN }
];

// Condominium (condoflow) timeboards only use their own expense categories
export const CONDO_EXPENSE_CATEGORY_ITEMS = Object.entries(CONDO_EXPENSE_CATEGORY_META).map(([id, { icon, color }]) => ({ id, icon, color }));
export const CONDO_EXPENSE_CATEGORY_IDS = Object.keys(CONDO_EXPENSE_CATEGORY_META);
