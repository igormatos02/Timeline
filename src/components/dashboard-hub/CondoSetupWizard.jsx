import React, { useEffect, useState } from 'react';
import { Home, Landmark, Loader2, Plus, Trash2, Wallet, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  AccountOperation,
  EventPeriodicity,
  EventRecurrence,
  EventType,
  IncomeEventCategory,
  InvestmentEventCategory,
  PaymentChannel,
  PersonRole,
  PersonType,
  TimeboardType,
  TimelineColor,
  TimelineType,
  accountOperationEventType,
  isWalletTimelineType,
  normalizeTimelineType
} from '../../enums/index.js';
import { effectiveStatusFor } from '../../../shared/finance/statusRules.js';
import { generateUUID } from '../../utils/uuid.js';
import OptionBoxGroup from '../ui/OptionBoxGroup.jsx';
import * as api from '../../services/api.js';

const Step = Object.freeze({ CONDOMINIUM: 1, UNITS: 2 });
const TOTAL_STEPS = 2;
const toNumber = (value) => Math.round((Number(String(value ?? '').replace(',', '.')) || 0) * 100) / 100;
const emptyUnit = (fee) => ({ key: generateUUID(), unit: '', owner: '', email: '', fee });

/**
 * Creating a condominium (CondoFlow hub): step 1 the condominium (name, accounting start date — mandatory —, base
 * fee, where fees are received, optional opening balances), step 2 its units with their fees (can be skipped).
 * Everything skipped is done later in the settings.
 */
export default function CondoSetupWizard({ isOpen, onClose, onCreated }) {
  const { t, language } = useTranslation();
  const [step, setStep] = useState(Step.CONDOMINIUM);
  const [condo, setCondo] = useState(() => ({ name: '', description: '', startMonth: format(new Date(), 'yyyy-MM'), baseFee: '', feeChannel: PaymentChannel.CASH, openingCash: '', openingBank: '' }));
  const [units, setUnits] = useState([]);
  const [createFees, setCreateFees] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    setStep(Step.CONDOMINIUM);
    setCondo({ name: '', description: '', startMonth: format(new Date(), 'yyyy-MM'), baseFee: '', feeChannel: PaymentChannel.CASH, openingCash: '', openingBank: '' });
    setUnits([]);
    setCreateFees(true);
    setError('');
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setField = (changes) => setCondo((prev) => ({ ...prev, ...changes }));
  const setUnit = (key, changes) => setUnits((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  const goToUnits = () => {
    if (!condo.name.trim()) return setError(t('condoWizard.nameRequired'));
    if (!condo.startMonth) return setError(t('condoWizard.startRequired'));
    setError('');
    if (units.length === 0) setUnits([emptyUnit(condo.baseFee)]);
    setStep(Step.UNITS);
  };

  // Opening balance: an effective movement on the start date (cash income / money received in the account)
  const openingBalance = (timeline, amount, isBank, startDate, timeboardId) => {
    const eventType = isBank ? accountOperationEventType(AccountOperation.RECEIVE) : EventType.INCOME;
    const movement = {
      id: generateUUID(),
      title: t('condoWizard.openingTitleEntry'),
      name: t('condoWizard.openingTitleEntry'),
      description: '',
      amount,
      date: startDate,
      dayOfMonth: 1,
      recurrence: EventRecurrence.ONCE,
      isRecurring: false,
      periodicity: EventPeriodicity.MONTHLY,
      eventType,
      category: isBank ? InvestmentEventCategory.OTHER : IncomeEventCategory.OTHER,
      ...(isBank ? { isExternal: true, is_external: true } : {}),
      isObligation: false,
      obligationPersonId: null,
      timeboardId,
      timelineId: timeline.id,
      timelineOriginId: timeline.id,
      pocketId: null,
      pocket_id: null
    };
    return api.createEvent({ ...movement, status: effectiveStatusFor(movement) });
  };

  const handleCreate = async (withUnits) => {
    const rows = withUnits ? units.filter((row) => row.unit.trim() || row.owner.trim()) : [];
    if (rows.some((row) => !row.unit.trim() || !row.owner.trim())) return setError(t('condoWizard.unitIncomplete'));
    setIsCreating(true);
    setError('');
    const startDate = `${condo.startMonth}-01`;
    let created = null;
    try {
      created = await api.createTimeboard({
        name: condo.name.trim(),
        description: condo.description.trim(),
        type: TimeboardType.CONDOFLOW,
        computeFrom: startDate,
        baseFeeAmount: condo.baseFee === '' ? null : toNumber(condo.baseFee),
        feeChannel: condo.feeChannel
      }, language);
    } catch (err) {
      setIsCreating(false);
      return setError(err.message);
    }

    // The condominium exists: the next steps are best effort (anything that fails is done in the settings)
    const failures = [];
    try {
      const timelines = await api.fetchTimelines({ timeboardId: created.id });
      const wallet = timelines.find((tl) => isWalletTimelineType(tl.type));
      const account = timelines.find((tl) => normalizeTimelineType(tl.type) === TimelineType.INVESTMENT);
      if (toNumber(condo.openingCash) > 0 && wallet) await openingBalance(wallet, toNumber(condo.openingCash), false, startDate, created.id);
      if (toNumber(condo.openingBank) > 0 && account) await openingBalance(account, toNumber(condo.openingBank), true, startDate, created.id);
    } catch (err) {
      failures.push(err.message);
    }
    for (const row of rows) {
      try {
        const person = await api.createPerson({
          timeboardId: created.id,
          type: PersonType.PERSON,
          personName: row.owner.trim(),
          obligatorIdentification: row.unit.trim(),
          email: row.email.trim() || null,
          role: PersonRole.INDIVIDUAL
        });
        if (createFees && toNumber(row.fee) > 0 && person?.id) {
          await api.applyUnitFee(created.id, person.id, { amount: toNumber(row.fee), parts: [], channel: condo.feeChannel, language });
        }
      } catch (err) {
        failures.push(`${row.unit}: ${err.message}`);
      }
    }
    setIsCreating(false);
    onCreated(created, failures.length > 0 ? t('condoWizard.partialFailure', { error: failures.join('; ') }) : null);
  };

  const input = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.9rem' };
  const label = { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' };
  const help = { fontSize: '0.74rem', color: 'var(--text-muted)' };
  const field = { display: 'flex', flexDirection: 'column', gap: '6px' };
  const button = { padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const primary = { ...button, background: TimelineColor.CONDOFLOW, borderColor: TimelineColor.CONDOFLOW, color: 'var(--text-white)', fontWeight: 700 };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--overlay-backdrop)' }}>
      <div style={{ width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: `${TimelineColor.CONDOFLOW}26`, color: TimelineColor.CONDOFLOW, padding: '8px', borderRadius: '10px', display: 'flex' }}><Home size={20} /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('condoWizard.title')}</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t('condoWizard.step', { current: step, total: TOTAL_STEPS })} · {t(`condoWizard.steps.${step === Step.CONDOMINIUM ? 'condominium' : 'units'}`)}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} style={{ ...button, padding: '6px', border: 'none' }}><X size={18} /></button>
        </div>

        {step === Step.CONDOMINIUM && (
          <>
            <div style={field}>
              <label style={label}>{t('condoWizard.nameLabel')}</label>
              <input style={input} value={condo.name} onChange={(e) => setField({ name: e.target.value })} placeholder={t('condoWizard.namePlaceholder')} autoFocus />
            </div>
            <div style={field}>
              <label style={label}>{t('condoWizard.descriptionLabel')}</label>
              <input style={input} value={condo.description} maxLength={100} onChange={(e) => setField({ description: e.target.value })} placeholder={t('condoWizard.descriptionPlaceholder')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={field}>
                <label style={label}>{t('condoSettings.startDateLabel')}</label>
                <input type="month" required style={input} value={condo.startMonth} onChange={(e) => setField({ startMonth: e.target.value })} />
                <span style={help}>{t('condoSettings.startDateHelp')}</span>
              </div>
              <div style={field}>
                <label style={label}>{t('condoSettings.baseFeeLabel')}</label>
                <input inputMode="decimal" style={input} value={condo.baseFee} onChange={(e) => setField({ baseFee: e.target.value })} placeholder={t('condoSettings.baseFeePlaceholder')} />
                <span style={help}>{t('condoSettings.baseFeeHelp')}</span>
              </div>
            </div>
            <OptionBoxGroup
              label={t('condoSettings.feeChannelLabel')}
              options={[
                { id: PaymentChannel.CASH, label: t('condoSettings.feeChannel.cash'), icon: Wallet, color: TimelineColor.CONDOFLOW },
                { id: PaymentChannel.BANK, label: t('condoSettings.feeChannel.bank'), icon: Landmark, color: TimelineColor.INVESTMENT }
              ]}
              value={condo.feeChannel}
              onChange={(feeChannel) => setField({ feeChannel })}
              marginBottom="0"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}>
              <strong style={label}>{t('condoWizard.openingTitle')}</strong>
              <span style={help}>{t('condoWizard.openingHelp')}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={field}>
                  <label style={label}>{t('condoWizard.openingCash')}</label>
                  <input inputMode="decimal" style={input} value={condo.openingCash} onChange={(e) => setField({ openingCash: e.target.value })} />
                </div>
                <div style={field}>
                  <label style={label}>{t('condoWizard.openingBank')}</label>
                  <input inputMode="decimal" style={input} value={condo.openingBank} onChange={(e) => setField({ openingBank: e.target.value })} />
                </div>
              </div>
            </div>
          </>
        )}

        {step === Step.UNITS && (
          <>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{t('condoWizard.unitsIntro')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1.6fr 0.8fr auto', gap: '8px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                <span>{t('condoWizard.unitColumn')}</span><span>{t('condoWizard.ownerColumn')}</span><span>{t('condoWizard.emailColumn')}</span><span>{t('condoWizard.feeColumn')}</span><span />
              </div>
              {units.map((row) => (
                <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1.6fr 0.8fr auto', gap: '8px', alignItems: 'center' }}>
                  <input style={input} value={row.unit} onChange={(e) => setUnit(row.key, { unit: e.target.value })} aria-label={t('condoWizard.unitColumn')} />
                  <input style={input} value={row.owner} onChange={(e) => setUnit(row.key, { owner: e.target.value })} aria-label={t('condoWizard.ownerColumn')} />
                  <input type="email" style={input} value={row.email} onChange={(e) => setUnit(row.key, { email: e.target.value })} aria-label={t('condoWizard.emailColumn')} />
                  <input inputMode="decimal" style={input} value={row.fee} onChange={(e) => setUnit(row.key, { fee: e.target.value })} aria-label={t('condoWizard.feeColumn')} />
                  <button type="button" onClick={() => setUnits((prev) => prev.filter((r) => r.key !== row.key))} title={t('condoWizard.removeUnit')} style={{ ...button, padding: '8px', color: TimelineColor.DANGER }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setUnits((prev) => [...prev, emptyUnit(condo.baseFee)])} style={{ ...button, alignSelf: 'flex-start' }}><Plus size={14} />{t('condoWizard.addUnit')}</button>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              <input type="checkbox" checked={createFees} onChange={(e) => setCreateFees(e.target.checked)} />
              {t('condoWizard.createFees')}
            </label>
          </>
        )}

        {error && <div role="alert" style={{ fontSize: '0.84rem', color: TimelineColor.DANGER }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {step === Step.UNITS ? (
            <button type="button" onClick={() => setStep(Step.CONDOMINIUM)} disabled={isCreating} style={button}>{t('condoWizard.back')}</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {step === Step.CONDOMINIUM ? (
              <button type="button" onClick={goToUnits} style={primary}>{t('condoWizard.next')}</button>
            ) : (
              <>
                <button type="button" onClick={() => handleCreate(false)} disabled={isCreating} style={button}>{t('condoWizard.skip')}</button>
                <button type="button" onClick={() => handleCreate(true)} disabled={isCreating} style={primary}>
                  {isCreating && <Loader2 size={15} className="animate-spin" />}
                  {t(isCreating ? 'condoWizard.creating' : 'condoWizard.create')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
