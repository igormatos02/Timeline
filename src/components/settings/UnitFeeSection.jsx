import React from 'react';
import { Loader2, Plus, RefreshCw, Trash2, Wallet, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { PaymentChannel, TimelineColor } from '../../enums/index.js';
import { generateUUID } from '../../utils/uuid.js';
import OptionBoxGroup from '../ui/OptionBoxGroup.jsx';

const toNumber = (value) => Number(String(value ?? '').replace(',', '.')) || 0;

/** Total of a fee draft: the sum of its parts when split, otherwise its amount. */
export const feeDraftTotal = (draft) => (draft.isSplit
  ? Math.round(draft.parts.reduce((sum, part) => sum + toNumber(part.amount), 0) * 100) / 100
  : Math.round(toNumber(draft.amount) * 100) / 100);

/** Draft of the fee form from the unit's fee (or the condominium's base value for a unit without fee). */
export const feeDraftFrom = (fee, timeboard) => ({
  amount: fee?.exists ? String(fee.amount) : (timeboard?.baseFeeAmount !== null && timeboard?.baseFeeAmount !== undefined ? String(timeboard.baseFeeAmount) : ''),
  isSplit: Boolean(fee?.exists && fee.parts?.length > 0),
  parts: fee?.exists && fee.parts?.length > 0 ? fee.parts.map((part) => ({ ...part, amount: String(part.amount) })) : [],
  channel: fee?.exists ? fee.channel : (timeboard?.feeChannel || PaymentChannel.CASH),
  createOnSave: true
});

/**
 * "Quota" section of a condominium unit: the monthly fee (optionally split into parts, e.g. quota + fundo de
 * reserva), where it is received and "Atualizar lançamentos". A new unit creates it when saved.
 */
export default function UnitFeeSection({ draft, onChange, fee, isNew, isLoading, onApply, isApplying }) {
  const { t, dateLocale } = useTranslation();
  const set = (changes) => onChange({ ...draft, ...changes });
  const monthLabel = (date) => format(parseISO(date), 'MMMM yyyy', { locale: dateLocale });
  const hasFee = Boolean(fee?.exists);
  const input = { background: 'var(--bg-card-hover)' };
  const smallButton = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' };
  const channelLabel = (channel) => t(`condoSettings.feeChannel.${channel}`);

  const setPart = (index, changes) => set({ parts: draft.parts.map((part, i) => (i === index ? { ...part, ...changes } : part)) });
  const toggleSplit = () => {
    if (draft.isSplit) {
      set({ isSplit: false, amount: String(feeDraftTotal(draft) || draft.amount || ''), parts: [] });
    } else {
      set({ isSplit: true, parts: [{ id: generateUUID(), name: t('unitFee.title'), amount: draft.amount || '' }, { id: generateUUID(), name: '', amount: '' }] });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{t('unitFee.title')}</strong>
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : !isNew && (
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {!hasFee ? t('unitFee.noFee')
              : fee.valueFrom && fee.currentAmount !== fee.amount ? t('unitFee.scheduled', { amount: fee.amount, month: monthLabel(fee.valueFrom), current: fee.currentAmount })
                : t('unitFee.currentFee', { amount: fee.amount })}
          </span>
        )}
      </div>

      {!draft.isSplit ? (
        <div className="form-group" style={{ marginBottom: 0, maxWidth: '220px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('unitFee.amountLabel')}</label>
          <input type="text" inputMode="decimal" className="form-input" style={input} value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {draft.parts.map((part, index) => (
            <div key={part.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '8px', alignItems: 'center' }}>
              <input type="text" className="form-input" style={input} value={part.name} placeholder={t('unitFee.partNamePlaceholder')} aria-label={t('unitFee.partName')} onChange={(e) => setPart(index, { name: e.target.value })} />
              <input type="text" inputMode="decimal" className="form-input" style={input} value={part.amount} aria-label={t('unitFee.partAmount')} onChange={(e) => setPart(index, { amount: e.target.value })} />
              <button type="button" onClick={() => set({ parts: draft.parts.filter((_, i) => i !== index) })} title={t('unitFee.removePart')} style={{ ...smallButton, color: TimelineColor.DANGER }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <button type="button" onClick={() => set({ parts: [...draft.parts, { id: generateUUID(), name: '', amount: '' }] })} style={smallButton}>
              <Plus size={13} />{t('unitFee.addPart')}
            </button>
            <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>{t('unitFee.total', { amount: feeDraftTotal(draft) })}</strong>
          </div>
        </div>
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.isSplit} onChange={toggleSplit} />
        {t('unitFee.splitToggle')}
      </label>

      {/* Where it is received: chosen when the fee is created, then it stays */}
      {hasFee ? (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('unitFee.channelFixed', { channel: channelLabel(fee.channel) })}</span>
      ) : (
        <OptionBoxGroup
          label={t('unitFee.channelLabel')}
          options={[
            { id: PaymentChannel.CASH, label: channelLabel(PaymentChannel.CASH), icon: Wallet, color: TimelineColor.CONDOFLOW },
            { id: PaymentChannel.BANK, label: channelLabel(PaymentChannel.BANK), icon: Landmark, color: TimelineColor.INVESTMENT }
          ]}
          value={draft.channel}
          onChange={(channel) => set({ channel })}
          marginBottom="0"
        />
      )}

      {isNew ? (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
          <input type="checkbox" checked={draft.createOnSave} onChange={(e) => set({ createOnSave: e.target.checked })} />
          {t('unitFee.createOnSave')}
        </label>
      ) : (
        <button
          type="button"
          onClick={onApply}
          disabled={isApplying || isLoading || !(feeDraftTotal(draft) > 0)}
          style={{ ...smallButton, alignSelf: 'flex-start', background: TimelineColor.CONDOFLOW, borderColor: TimelineColor.CONDOFLOW, color: 'var(--text-white)', padding: '8px 12px', opacity: feeDraftTotal(draft) > 0 ? 1 : 0.5 }}
        >
          {isApplying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {t('unitFee.apply')}
        </button>
      )}
    </div>
  );
}
