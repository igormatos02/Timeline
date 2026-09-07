# Strict Enum Usage & Internationalization Rule

Always use standardized Enums from `shared/enums/index.js` or `server/domain/enums/index.js` (e.g., `FinancialType`, `EventStatus`, `TimelineType`, `TimelineStatus`, `EventAggregation`, `AmortizationStrategy`, `EventPeriodicity`) instead of hardcoded strings in application and domain logic.

## Guidelines:
1. **Never use hardcoded strings** for entity types, statuses, periodicities, categories, or financial types (e.g., avoid `'income'`, `'loan'`, `'pago'`, `'ativo'`, `'Inativo'`).
2. **Import and use canonical Enums**:
   - `FinancialType` (e.g. `FinancialType.INCOME`, `FinancialType.EXPENSE`, `FinancialType.INVESTMENT`, `FinancialType.AMORTIZATION`)
   - `TimelineType` (e.g. `TimelineType.INCOME`, `TimelineType.EXPENSE`, `TimelineType.INVESTMENT`, `TimelineType.LOAN`, `TimelineType.CUSTOM`)
   - `TimelineStatus` (e.g. `TimelineStatus.ACTIVE`, `TimelineStatus.INACTIVE`)
   - `EventStatus` (e.g. `EventStatus.PAID`, `EventStatus.RECEIVED`, `EventStatus.PENDING`, `EventStatus.INVESTED`, `EventStatus.CANCELLED`, `EventStatus.DELETED`)
   - `EventPeriodicity` / `EventAggregation`
   - `AmortizationStrategy`
3. **No string comparisons or fallbacks**: Do not write conditions like `status === TimelineStatus.INACTIVE || status === 'Inativo'`. Always normalize or compare exclusively against canonical Enum values (`status === TimelineStatus.INACTIVE`).
4. **All UI strings must be in English base dictionary**: Never hardcode Portuguese UI strings directly in JSX/JS components. Add keys to `src/i18n/translations.js` (`en` base dictionary and `pt` translation) and consume via `t('key')`.

