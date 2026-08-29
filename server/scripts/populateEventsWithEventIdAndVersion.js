import fs from 'fs';
import crypto from 'crypto';
import { supabase } from '../infrastructure/database/supabase/supabaseClient.js';

export async function populateEventsWithEventIdAndVersion() {
  console.log('--- POPULANDO TABELA COM event_id E event_version A PARTIR DO events.json ---');

  // 1. Limpa tabela financial_events
  console.log('1. Limpando tabela financial_events...');
  const { error: delErr } = await supabase.from('financial_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('Delete error:', delErr);
  } else {
    console.log('✓ Tabela limpa com sucesso!');
  }

  // 2. Carrega events.json
  const rawEvents = JSON.parse(fs.readFileSync('./server/data/db/events.json', 'utf8'));
  console.log(`2. Lendo ${rawEvents.length} eventos do events.json...`);

  // Busca timelines de default para mapear se timeline_id for nulo
  const { data: tls } = await supabase.from('timelines').select('*').eq('timeboard_id', '5fcd8a1a-eac7-4405-9c8b-b9607e70b420');
  const incomeTl = tls?.find(t => t.type === 'entradas');
  const expenseTl = tls?.find(t => t.type === 'gastos');
  const investTl = tls?.find(t => t.type === 'investimentos');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const rowsToInsert = rawEvents.map((ev) => {
    const rowId = ev.id && uuidRegex.test(ev.id) ? ev.id : crypto.randomUUID();
    const effectiveEventId = ev.seriesId || ev.id || rowId;

    let targetTimelineId = ev.timelineId || ev.timelineOriginId || null;
    if (!targetTimelineId || targetTimelineId.startsWith('tl-')) {
      if (targetTimelineId === 'tl-loan-jeep' || targetTimelineId === 'tl-loan-80004197726') {
        targetTimelineId = 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f';
      } else if (targetTimelineId === 'tl-loan-dacia') {
        targetTimelineId = 'd5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a';
      } else if (targetTimelineId === 'tl-loan-casa1') {
        targetTimelineId = 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b';
      } else if (targetTimelineId === 'tl-loan-casa2') {
        targetTimelineId = 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c';
      } else if (ev.financialType === 'entrada' || ev.isIncome || ev.category?.startsWith('entrada')) {
        targetTimelineId = incomeTl?.id;
      } else if (ev.financialType === 'investimento' || ev.isInvestment || ev.category?.startsWith('investimento')) {
        targetTimelineId = investTl?.id;
      } else {
        targetTimelineId = expenseTl?.id;
      }
    }

    // Normalização rigorosa de Enums para Inglês
    let normalizedFinancialType = 'expense';
    if (ev.financialType === 'entrada' || ev.financialType === 'income' || ev.isIncome || ev.category?.startsWith('entrada')) {
      normalizedFinancialType = 'income';
    } else if (ev.financialType === 'investimento' || ev.financialType === 'investment' || ev.isInvestment || ev.category?.startsWith('investimento')) {
      normalizedFinancialType = 'investment';
    } else if (ev.financialType === 'amortizacao' || ev.financialType === 'amortization' || ev.category === 'amortizacao') {
      normalizedFinancialType = 'amortization';
    }

    let normalizedStatus = 'pending';
    const st = String(ev.status || '').toLowerCase();
    if (st === 'pago' || st === 'paid' || st === 'liquidado') normalizedStatus = 'paid';
    else if (st === 'recebido' || st === 'received') normalizedStatus = 'received';
    else if (st === 'investido' || st === 'invested') normalizedStatus = 'invested';
    else if (st === 'previsto' || st === 'planeado' || st === 'planned') normalizedStatus = 'planned';
    else if (st === 'concluído' || st === 'concluido' || st === 'completed') normalizedStatus = 'completed';
    else if (st === 'amortizado' || st === 'amortized') normalizedStatus = 'amortized';
    else if (st === 'atrasada' || st === 'atrasado' || st === 'overdue') normalizedStatus = 'overdue';
    else if (st === 'cancelado' || st === 'cancelled') normalizedStatus = 'cancelled';
    else if (st === 'excluido' || st === 'deleted') normalizedStatus = 'deleted';

    let normalizedPeriodicity = 'once';
    const pr = String(ev.periodicity || '').toLowerCase();
    if (pr === 'recorrente' || pr === 'recurring' || ev.isRecurring) normalizedPeriodicity = 'recurring';
    else if (pr === 'periodo' || pr === 'period') normalizedPeriodicity = 'period';

    let normalizedPriority = 'normal';
    const prio = String(ev.priority || '').toLowerCase();
    if (prio === 'alta' || prio === 'high') normalizedPriority = 'high';
    else if (prio === 'baixa' || prio === 'low') normalizedPriority = 'low';
    else if (prio === 'urgente' || prio === 'urgent') normalizedPriority = 'urgent';

    return {
      id: rowId,
      event_id: effectiveEventId,
      event_version: ev.version !== undefined ? Number(ev.version) : 0,
      sobreposition_over: ev.sobrepositionOver || null,
      day_of_month: ev.dayOfMonth !== undefined ? ev.dayOfMonth : null,
      is_terminated: Boolean(ev.isTerminated),
      
      tenant_id: ev.tenantId || 'tenant-igor',
      timeboard_id: ev.timeboardId || '5fcd8a1a-eac7-4405-9c8b-b9607e70b420',
      timeline_id: targetTimelineId,
      name: ev.title || ev.name || 'Evento Financeiro',
      description: ev.description || '',
      financial_type: normalizedFinancialType,
      category: ev.category || 'saida_recorrente',
      amount: Number(ev.amount) || 0,
      currency: 'EUR',
      date: ev.date,
      due_date: ev.dueDate || ev.due_date || null,
      paid_date: ev.paidDate || ev.paid_date || null,
      status: normalizedStatus,
      automatic: Boolean(ev.automatic !== undefined ? ev.automatic : ev.isAutomatic),
      is_recurring: normalizedPeriodicity === 'recurring',
      periodicity: normalizedPeriodicity,
      
      installment_number: ev.installmentNumber || null,
      total_installments: ev.totalInstallments || null,
      amortization_strategy: ev.amortizationStrategy || ev.strategy || null,
      interest_amount: Number(ev.interestAmount || ev.interestPortion || 0),
      principal_amount: Number(ev.principalAmount || 0),
      remaining_debt_after: Number(ev.remainingDebtAfter || ev.balanceAfter) || null,
      
      labels: Array.isArray(ev.labels) ? ev.labels : [],
      breakdown_items: Array.isArray(ev.breakdownItems) ? ev.breakdownItems : [],
      notes: ev.notes || '',
      priority: normalizedPriority,
      time: ev.time || '09:00',
      
      created_at: ev.createdAt || new Date().toISOString(),
      updated_at: ev.updatedAt || new Date().toISOString()
    };
  });

  // 3. Insere em lotes de 100
  const batchSize = 100;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const chunk = rowsToInsert.slice(i, i + batchSize);
    const { error: insertErr } = await supabase.from('financial_events').insert(chunk);
    if (insertErr) {
      console.error(`Erro ao inserir lote ${i}-${i + chunk.length}:`, insertErr);
    } else {
      console.log(`✓ Inseridos ${Math.min(i + batchSize, rowsToInsert.length)} de ${rowsToInsert.length}`);
    }
  }

  // 4. Verificação final
  const { data: countData } = await supabase.from('financial_events').select('id, event_id, event_version');
  console.log(`🏆 Total de eventos salvos na tabela com event_id e event_version: ${countData?.length}`);
}

if (process.argv[1]?.endsWith('populateEventsWithEventIdAndVersion.js')) {
  populateEventsWithEventIdAndVersion().catch(console.error);
}
