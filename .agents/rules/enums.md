# Strict Rules: Enums, Translations & Clean Code Standards

Whenever editing an existing file or implementing new code in this repository, you MUST follow these 4 strict rules:

## Regra 1 - Zero Enums Hardcoded (Sempre substituir por Enum)
- Sempre que editar um arquivo, faça uma varredura para verificar se existem valores de enum (tipos, status, periodicidades, categorias, prioridades, papéis, etc.) em texto literal *hardcoded* (ex: `'income'`, `'loan'`, `'pago'`, `'ativo'`, `'pending'`, `'reduce_term'`).
- Substitua-os imediatamente pelo enum canónico centralizado correspondente de `shared/enums/index.js` ou `src/enums/index.js` (ex: `EventType`, `EventStatus`, `TimelineType`, `TimelineStatus`, `EventPriority`, `EventPeriodicity`, `EventRecurrence`, `EventDeletionMode`, `AmortizationStrategy`, etc.).
- Nunca crie nem use aliases redundantes em arquivos de enum nem compare com variantes de string.

## Regra 2 - Zero Strings / Labels / Messages Hardcoded (Sempre traduzir)
- Sempre que editar um arquivo, verifique se existem labels, títulos, nomes de botões, placeholders, mensagens de validação, toasts ou mensagens de erro em texto literal hardcoded ou em fallbacks com operador lógico (ex: `t('key') || 'Texto em português'`).
- Remova todos os textos literais e fallbacks. Registre as novas chaves tanto no dicionário base em inglês (`en`) quanto na tradução em português (`pt`) em `shared/i18n/translations.js` e consuma exclusivamente via `t('key')`.

## Regra 3 - Zero Cores Hardcoded (Sempre usar TimelineColor & TIMELINE_COLOR_PRESETS + Checagem Final)
- TODAS as cores hardcoded (hexadecimais `'#...'`, RGBs literais, gradientes com hex) DEVEM ser obrigatoriamente repostas pelas constantes de `TimelineColor` / `TIMELINE_COLOR_PRESETS` / `getDefaultTimelineColor` de `src/enums/index.js` ou `shared/enums/index.js`, ou por variáveis de design system CSS (`var(--border-glass)`, `var(--primary)`, `var(--bg-card)`).
- **Varredura Final Obrigatória**: Ao final de CADA edição de arquivo, faça uma busca por `#` e valores hexadecimais no arquivo para garantir que nenhuma cor hardcoded permaneceu.

## Regra 4 - Zero Hardcoded em Novas Implementações
- Ao implementar qualquer nova funcionalidade, modal, endpoint, serviço ou componente: NUNCA crie labels, placeholders, mensagens, cores ou enums hardcoded.
- Sempre verifique e reutilize os enums, cores e traduções existentes em `shared/enums/index.js` e `shared/i18n/translations.js` antes de criar novos.


