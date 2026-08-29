# Strict Enum Usage Rule

Always use standardized Enums from `server/domain/enums/index.js` (e.g., `FinancialType`, `EventStatus`, `TimelineType`, `TimelineStatus`, `EventAggregation`, `AmortizationStrategy`, `EventPeriodicity`) instead of hardcoded strings in application and domain logic.

## Guidelines:
1. **Never use hardcoded strings** for entity types, statuses, periodicities, categories, or financial types (e.g., avoid `'income'`, `'loan'`, `'pago'`, `'ativo'`).
2. **Import and use canonical Enums**:
   - `FinancialType` (e.g. `FinancialType.INCOME`, `FinancialType.EXPENSE`, `FinancialType.INVESTMENT`, `FinancialType.AMORTIZATION`)
   - `TimelineType` (e.g. `TimelineType.INCOME`, `TimelineType.EXPENSE`, `TimelineType.INVESTMENT`, `TimelineType.LOAN`, `TimelineType.CUSTOM`)
   - `TimelineStatus` (e.g. `TimelineStatus.ACTIVE`, `TimelineStatus.INACTIVE`)
   - `EventStatus` (e.g. `EventStatus.PAID`, `EventStatus.RECEIVED`, `EventStatus.PENDING`, `EventStatus.INVESTED`, `EventStatus.CANCELLED`, `EventStatus.DELETED`)
   - `EventPeriodicity` / `EventAggregation`
   - `AmortizationStrategy`
3. **No multi-string fallbacks**: Do not write conditions like `type === TimelineType.LOAN || type === 'loan' || type === 'emprestimo'`. Use strictly `type === TimelineType.LOAN`.
