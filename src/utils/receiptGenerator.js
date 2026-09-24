/**
 * Utility to generate a high quality 50% / 50% split Receipt & Counterfoil (Canhoto) HTML
 * that can be rendered inside a print frame or modal for preview, printing and saving as PDF.
 */
import { format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { formatCurrency } from './formatCurrency.js';
import { EventType } from '../enums/index.js';

/**
 * Computa o número de recibo baseado na timeline (cont_year) e ano corrente:
 * - Se cont_year for nulo ou 0 -> ${anoCorrente}01 (ex: 202601)
 * - Se o ano de cont_year for igual ao ano corrente -> usa cont_year
 * - Se o ano de cont_year for diferente do ano corrente -> reseta para ${anoCorrente}01
 */
export function computeReceiptNumber(timeline, event = null) {
  // Regra Nova: Se o evento já tiver em seu status cont_year, usa o cont_year do status do evento
  const eventContYear = event?.contYear !== undefined && event?.contYear !== null
    ? Number(event.contYear)
    : (event?.cont_year !== undefined && event?.cont_year !== null ? Number(event.cont_year) : 0);

  if (eventContYear && eventContYear > 0) {
    return eventContYear;
  }

  // Regra Anterior: Baseado na timeline
  const currentYear = new Date().getFullYear();
  const rawContYear = timeline?.contYear !== undefined && timeline?.contYear !== null
    ? Number(timeline.contYear)
    : (timeline?.cont_year !== undefined && timeline?.cont_year !== null ? Number(timeline.cont_year) : 0);

  if (!rawContYear || rawContYear === 0) {
    return Number(`${currentYear}01`);
  }

  const strVal = String(rawContYear);
  if (strVal.length >= 4) {
    const valYear = parseInt(strVal.substring(0, 4), 10);
    if (valYear === currentYear) {
      return rawContYear;
    }
  }

  return Number(`${currentYear}01`);
}

/**
 * Computa o próximo valor a ser salvo na timeline após a impressão ($cont + 1):
 * Ex: se gerou 202601 -> próximo é 202602
 */
export function computeNextReceiptNumber(currentReceiptNum) {
  const currentYear = new Date().getFullYear();
  if (!currentReceiptNum) {
    return Number(`${currentYear}02`);
  }

  const strVal = String(currentReceiptNum);
  if (strVal.length > 4) {
    const yearPart = strVal.substring(0, 4);
    const countPart = strVal.substring(4);
    const nextCount = parseInt(countPart, 10) + 1;
    const paddedCount = String(nextCount).padStart(countPart.length, '0');
    return Number(`${yearPart}${paddedCount}`);
  }

  return Number(currentReceiptNum) + 1;
}

export function buildReceiptHtml({
  event,
  timeboard,
  timeline,
  receiptNumber = null,
  currentUser,
  obligationPerson,
  persons = [],
  language = 'pt',
  t
}) {
  const isIncome = event?.eventType === EventType.INCOME;
  const isPt = language === 'pt';
  const dateLocale = isPt ? pt : enUS;

  // Title of receipt
  const receiptTypeLabel = isIncome
    ? t('receipt.receiptOfIncome')
    : t('receipt.receiptOfExpense');

  // Party labels:
  // Recebimento (Income): Pago por: [Obligator], Recebido por: [Admin / Timeboard]
  // Pagamento (Expense): Pago por: [Admin / Timeboard], Recebido de: [Obligator]
  const payerLabel = t('receipt.paidBy');
  const receiverLabel = isIncome ? t('receipt.receivedBy') : t('receipt.paidTo');

  const personId = obligationPerson?.id || event?.obligationPersonId || event?.obligation_person_id;
  const livePerson = (personId && Array.isArray(persons) && persons.length > 0)
    ? (persons.find((p) => p.id === personId) || obligationPerson)
    : obligationPerson;

  const obligatorName = livePerson?.name || livePerson?.personName || event?.obligationPersonName || event?.obligation_person_name || '';
  const obligatorIdCode = livePerson?.obligatorIdentification || livePerson?.obligator_identification || livePerson?.identification || livePerson?.taxId || livePerson?.tax_id || event?.obligatorIdentification || event?.obligator_identification || event?.obligationIdentifier || '';
  const obligatorTaxId = livePerson?.taxId || livePerson?.tax_id || '';
  const obligatorDetails = [
    obligatorName,
    obligatorIdCode ? `ID: ${obligatorIdCode}` : '',
    obligatorTaxId ? `NIF/CPF: ${obligatorTaxId}` : ''
  ].filter(Boolean).join(' • ');

  const adminName = currentUser?.name || currentUser?.user_metadata?.full_name || currentUser?.email || t('email.roleAdmin');
  const timeboardName = timeboard?.description || t('receipt.timeboard');
  const rawPrintTemplate = timeboard?.print_template ?? timeboard?.printTemplate ?? '';
  const timeboardDesc = rawPrintTemplate
    ? String(rawPrintTemplate)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    : '';

  const partyA = isIncome
    ? { role: payerLabel, entity: obligatorDetails || '' }
    : { role: payerLabel, entity: timeboardName };

  const partyB = isIncome
    ? { role: receiverLabel, entity: timeboardName }
    : { role: receiverLabel, entity: obligatorDetails || '' };

  const eventDate = event?.date ? parseISO(event.date) : new Date();
  const formattedDate = format(
    eventDate,
    isPt ? "dd 'de' MMMM 'de' yyyy" : "MMMM dd, yyyy",
    { locale: dateLocale }
  );

  const amountFormatted = formatCurrency(Math.abs(Number(event?.amount || 0)));
  const conceptText = event?.title || event?.description || '';

  const renderSection = (badgeText, isStub = false) => `
    <div class="receipt-section ${isStub ? 'stub' : 'main-receipt'}">
      <div class="header-row">
        <div>
          <div class="brand-title">${timeboardName}</div>
          ${timeboardDesc ? `<div class="brand-desc">${timeboardDesc}</div>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="badge-tag">${badgeText}</div>
            ${receiptNumber ? `<div class="receipt-number-tag">Nº ${receiptNumber}</div>` : ''}
        
        </div>
      </div>

      <div class="receipt-type">${receiptTypeLabel}</div>

      <div class="grid-table">
        <div class="cell">
          <div class="label">${partyA.role}</div>
          <div class="value strong">${partyA.entity}</div>
        </div>
        ${partyB.entity ? `
        <div class="cell">
          <div class="label">${partyB.role}</div>
          <div class="value strong">${partyB.entity}</div>
        </div>` : ''}
        <div class="cell full">
          <div class="label">${t('receipt.concept')}</div>
          <div class="value strong">${conceptText || '-'}</div>
        </div>
        <div class="cell">
          <div class="label">${t('receipt.dateOfPayment')}</div>
          <div class="value">${formattedDate}</div>
        </div>
        <div class="cell amount-cell">
          <div class="label">${t('receipt.value')}</div>
          <div class="value amount">${amountFormatted}</div>
        </div>
      </div>

      <div class="footer-row">
        <div class="issuer-info">
          <div class="label">${t('receipt.issuer')}</div>
          <div class="value">${adminName}</div>
        </div>
        ${!isStub ? `
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">${t('receipt.signaturePlaceholder')}</div>
        </div>` : ''}
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="utf-8" />
      <title>${receiptTypeLabel} - ${obligatorName || timeboardName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          padding: 24px;
        }
        .container {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #ffffff;
        }
        .receipt-section {
          padding: 28px 24px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
        }
        .divider {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 18px 0;
          border-top: 2px dashed #94a3b8;
        }
        .divider-tag {
          position: absolute;
          background: #ffffff;
          padding: 2px 14px;
          font-size: 11px;
          color: #64748b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .brand-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .brand-desc {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }
        .badge-tag {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }
        .receipt-number-tag {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 4px 10px;
          border-radius: 6px;
          background: #eef2ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
          font-variant-numeric: tabular-nums;
        }
        .receipt-type {
          font-size: 15px;
          font-weight: 800;
          color: #2563eb;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .grid-table {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cell.full {
          grid-column: 1 / -1;
        }
        .cell.amount-cell {
          text-align: right;
          align-items: flex-end;
        }
        .label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .value {
          font-size: 13px;
          color: #1e293b;
        }
        .concept-badge-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          margin-top: 4px;
        }
        .concept-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 4px;
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }
        .concept-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .value.strong {
          font-weight: 700;
          color: #0f172a;
        }
        .value.amount {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 14px;
          padding-top: 12px;
        }
        .issuer-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .signature-box {
          width: 200px;
          text-align: center;
        }
        .signature-line {
          border-bottom: 1px solid #0f172a;
          margin-bottom: 4px;
        }
        .signature-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          .receipt-section {
            border: 1px solid #000000;
          }
          .divider {
            border-top: 2px dashed #000000;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Parte 1: Recibo (50%) -->
        ${renderSection(t('receipt.receiptTitle'), false)}

        <!-- Linha divisória de 50% com Picote -->
        <div class="divider">
          <span class="divider-tag">✂ ${t('receipt.stubTitle')}</span>
        </div>

        <!-- Parte 2: Canhoto (50%) -->
        ${renderSection(t('receipt.stubTitle'), true)}
      </div>
    </body>
    </html>
  `;
}
