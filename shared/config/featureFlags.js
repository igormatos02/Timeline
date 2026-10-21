// Features built but hidden for now (decided with the product owner); switch on when they come back

// Import units (frações) from a spreadsheet — hidden 2026-10-21: backups use the full data export for now
export const UNIT_IMPORT_ENABLED = false;

// Full data export (settings → Configurações) — hidden for the alpha 2026-10-21; exports on request with
// DataExportService, back for the sales phase
export const DATA_EXPORT_ENABLED = false;

// CondoFlow Gestão app (decided 2026-10-21): a basic app to receive fees and send receipts for now — the outflows
// list and the "Nova saída" / "Depositar no banco" forms are hidden (still built, the web does them)
export const ADMIN_APP_OUTFLOWS_ENABLED = false;
export const ADMIN_APP_MOVEMENT_FORMS_ENABLED = false;
