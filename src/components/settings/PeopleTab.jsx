import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Edit3,
  Home,
  Mail,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  UserCheck,
  UserX,
  Users,
  X
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  InvitationStatus,
  MEMBER_ROLES,
  PersonCategory,
  PersonRole,
  PersonType,
  TimelineColor,
  personCategoryOf
} from '../../enums/index.js';
import * as api from '../../services/api.js';
import OptionBoxGroup from '../ui/OptionBoxGroup.jsx';
import UnitFeeSection, { feeDraftFrom, feeDraftTotal } from './UnitFeeSection.jsx';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { accountingStartOf } from '../../../shared/finance/accountingStart.js';

// What each list shows (condominiums: units, entities, members; other timeboards: everyone)
const ALL = 'all';
const ADD_KEYS = Object.freeze({ [PersonCategory.UNIT]: 'unit', [PersonCategory.ENTITY]: 'entity', [PersonCategory.MEMBER]: 'member' });

const isValidEmail = (email) => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
const nameOf = (person) => person?.personName || person?.person_name || person?.name || '';
const unitOf = (person) => person?.obligatorIdentification || person?.obligator_identification || '';
const taxIdOf = (person) => person?.taxId || person?.tax_id || '';
const userIdOf = (person) => person?.userId || person?.user_id || null;

const ROLE_STYLE = Object.freeze({
  [PersonRole.ADMIN]: { icon: Crown, color: TimelineColor.WARNING },
  [PersonRole.CONTRIBUTOR]: { icon: Users, color: TimelineColor.PRIMARY },
  [PersonRole.INDIVIDUAL]: { icon: UserCheck, color: TimelineColor.CYAN }
});

const emptyForm = (category) => ({
  type: category === PersonCategory.MEMBER ? PersonType.MEMBER : PersonType.PERSON,
  personName: '',
  obligatorIdentification: '',
  taxId: '',
  email: '',
  phone: '',
  birthDate: '',
  observation: '',
  role: PersonRole.CONTRIBUTOR
});

/**
 * People of a timeboard. In a condominium each list is one category (shared/enums/PersonCategory.js): units
 * (always Individual when invited), entities (a reference, never invited) and members (Administrator /
 * Collaborator). Other timeboards show everyone, as before.
 */
export default function PeopleTab({ timeboard, category = ALL, persons, setPersons, invitations, isLoading, onReload, onEntitySaved, showToast }) {
  const { t, language, dateLocale } = useTranslation();
  const [search, setSearch] = useState('');
  // Units: their monthly fee (settings → Frações → Quota)
  const [unitFee, setUnitFee] = useState(null);
  const [feeDraft, setFeeDraft] = useState(() => feeDraftFrom(null, timeboard));
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isApplyingFee, setIsApplyingFee] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [formPerson, setFormPerson] = useState(null); // null = closed; {} = new; person = editing
  const [form, setForm] = useState(() => emptyForm(category));
  const [isSaving, setIsSaving] = useState(false);
  const [invitingPerson, setInvitingPerson] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(PersonRole.CONTRIBUTOR);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const isCategoryList = category !== ALL;
  const isEditing = Boolean(formPerson?.id);

  // Esc closes the open form / invitation first (captured before the settings modal's own Esc)
  useEffect(() => {
    if (!formPerson && !invitingPerson) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setInvitingPerson(null);
      setFormPerson(null);
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [formPerson, invitingPerson]);

  // The timeboard's owner is shown first among the members (not editable)
  const currentUser = api.getCurrentUser();
  const ownerId = timeboard?.ownerId || timeboard?.owner_id || timeboard?.userId || timeboard?.user_id;
  const isCurrentOwner = !ownerId || currentUser?.id === ownerId;
  const ownerRow = useMemo(() => ({
    id: `owner-${ownerId || 'main'}`,
    personName: timeboard?.ownerName || timeboard?.owner_name || (isCurrentOwner ? currentUser?.name : '') || '',
    email: timeboard?.ownerEmail || timeboard?.owner_email || (isCurrentOwner ? currentUser?.email : '') || '',
    type: PersonType.MEMBER,
    isOwner: true
  }), [timeboard, ownerId, isCurrentOwner, currentUser?.name, currentUser?.email]);

  const inviteOf = (person) => {
    const email = person.email?.toLowerCase().trim();
    return email ? invitations.find((invitation) => invitation.email?.toLowerCase().trim() === email) : null;
  };
  const accessOf = (person) => {
    if (userIdOf(person)) return 'active';
    return inviteOf(person)?.status === InvitationStatus.PENDING ? 'pending' : 'none';
  };

  const rows = useMemo(() => {
    const owned = persons.filter((p) => !ownerRow.email || p.email?.toLowerCase().trim() !== ownerRow.email.toLowerCase().trim() || category === PersonCategory.UNIT);
    let list = isCategoryList ? owned.filter((p) => personCategoryOf(p) === category) : owned;
    if (category === PersonCategory.MEMBER || category === ALL) list = [ownerRow, ...list];
    if (typeFilter !== ALL) list = list.filter((p) => (p.type || PersonType.PERSON) === typeFilter);
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((p) => [nameOf(p), p.email, unitOf(p), taxIdOf(p), p.phone, p.observation]
        .some((value) => String(value || '').toLowerCase().includes(query)));
    }
    return category === PersonCategory.UNIT
      ? [...list].sort((a, b) => unitOf(a).localeCompare(unitOf(b), undefined, { numeric: true, sensitivity: 'base' }))
      : list;
  }, [persons, category, isCategoryList, ownerRow, typeFilter, search]);

  // ---- Form (add / edit) ----
  const openForm = (person = null) => {
    setFormPerson(person || {});
    if (category === PersonCategory.UNIT) {
      setUnitFee(null);
      setFeeDraft(feeDraftFrom(null, timeboard));
      if (person?.id) {
        setIsFeeLoading(true);
        api.fetchUnitFee(timeboard.id, person.id)
          .then((fee) => { setUnitFee(fee); setFeeDraft(feeDraftFrom(fee, timeboard)); })
          .finally(() => setIsFeeLoading(false));
      }
    }
    setForm(person ? {
      type: person.type || PersonType.PERSON,
      personName: nameOf(person),
      obligatorIdentification: unitOf(person),
      taxId: taxIdOf(person),
      email: person.email || '',
      phone: person.phone || '',
      birthDate: person.birthDate || person.birth_date || '',
      observation: person.observation || '',
      role: person.role || PersonRole.CONTRIBUTOR
    } : { ...emptyForm(category), type: category === ALL && typeFilter !== ALL ? typeFilter : emptyForm(category).type });
  };

  // "Atualizar lançamentos" (asks first) and the fee of a new unit (created on save, no question)
  const monthLabel = (date) => format(date, 'MMMM yyyy', { locale: dateLocale });
  const applyFee = async (personId, unitName, { ask }) => {
    const amount = feeDraftTotal(feeDraft);
    if (!(amount > 0)) return;
    const start = accountingStartOf(timeboard);
    if (ask) {
      const message = unitFee?.exists
        ? t('unitFee.confirmUpdate', { unit: unitName, month: monthLabel(startOfMonth(addMonths(new Date(), 1))), from: unitFee.amount, to: amount })
        : t('unitFee.confirmCreate', { unit: unitName, amount, month: start ? monthLabel(parseISO(start)) : '' });
      if (!window.confirm(message)) return;
    }
    setIsApplyingFee(true);
    try {
      const result = await api.applyUnitFee(timeboard.id, personId, {
        amount,
        parts: feeDraft.isSplit ? feeDraft.parts : [],
        channel: feeDraft.channel,
        language
      });
      const when = result.fromDate ? monthLabel(parseISO(result.fromDate)) : '';
      showToast(t(`unitFee.${result.action}`, { amount: result.amount, month: when }));
      const fresh = await api.fetchUnitFee(timeboard.id, personId);
      setUnitFee(fresh);
      if (fresh) setFeeDraft(feeDraftFrom(fresh, timeboard));
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsApplyingFee(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const personName = form.personName.trim();
    const unit = form.obligatorIdentification.trim();
    if (!personName) return;
    if (category === PersonCategory.UNIT && !unit) {
      showToast(t('people.unitRequired'));
      return;
    }
    setIsSaving(true);
    const type = category === PersonCategory.MEMBER ? PersonType.MEMBER : form.type;
    const payload = {
      timeboardId: timeboard.id,
      type,
      personName,
      name: personName,
      obligatorIdentification: category === PersonCategory.ENTITY || category === PersonCategory.MEMBER ? null : (unit || null),
      taxId: form.taxId.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      birthDate: form.birthDate || null,
      observation: form.observation.trim() || null,
      // Condominiums: the server sets the role of units (Individual) and entities (none)
      role: type === PersonType.MEMBER ? (form.role || PersonRole.CONTRIBUTOR) : null,
      userId: userIdOf(formPerson)
    };
    try {
      if (isEditing) {
        const updated = await api.updatePerson(formPerson.id, payload);
        const saved = { ...formPerson, ...payload, ...updated };
        setPersons((prev) => prev.map((p) => (p.id === formPerson.id ? saved : p)));
        onEntitySaved?.(saved);
      } else {
        const created = await api.createPerson(payload);
        const saved = { ...payload, ...created };
        setPersons((prev) => [...prev, saved]);
        onEntitySaved?.(saved);
        if (category === PersonCategory.UNIT && feeDraft.createOnSave && saved.id) await applyFee(saved.id, unit, { ask: false });
      }
      showToast(t('people.savedToast', { name: personName }));
      setFormPerson(null);
    } catch (err) {
      showToast(err.message || t('people.saveFailedToast'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (person) => {
    if (!window.confirm(t('people.deleteConfirm', { name: nameOf(person) }))) return;
    try {
      setPersons((prev) => prev.filter((p) => p.id !== person.id));
      await api.deletePerson(person.id, timeboard.id);
      showToast(t('people.deletedToast', { name: nameOf(person) }));
    } catch {
      onReload();
    }
  };

  const handleChangeRole = async (person, role) => {
    try {
      setPersons((prev) => prev.map((p) => (p.id === person.id ? { ...p, role } : p)));
      await api.updatePerson(person.id, { role, timeboardId: timeboard.id });
      showToast(t('people.roleUpdatedToast', { role: t(`timeboardSettings.entities.roles.${role}`) }));
    } catch (err) {
      showToast(err.message);
      onReload();
    }
  };

  const handleUnlink = async (person) => {
    if (!window.confirm(t('people.unlinkConfirm', { name: nameOf(person) }))) return;
    try {
      await api.unlinkPersonMember(timeboard.id, person.id);
      showToast(t('people.unlinkedToast', { name: nameOf(person) }));
      setFormPerson(null);
      onReload();
    } catch (err) {
      showToast(err.message || t('people.unlinkFailedToast'));
    }
  };

  // ---- Invitation ----
  const roleChoices = category === PersonCategory.MEMBER ? MEMBER_ROLES : category === ALL ? [...MEMBER_ROLES, PersonRole.INDIVIDUAL] : [];
  const openInvite = (person) => {
    setInvitingPerson(person);
    setInviteEmail(person.email || '');
    setInviteRole(category === PersonCategory.UNIT ? PersonRole.INDIVIDUAL : (person.role || PersonRole.CONTRIBUTOR));
  };
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!invitingPerson || !isValidEmail(inviteEmail)) return;
    setIsSendingInvite(true);
    const email = inviteEmail.trim().toLowerCase();
    try {
      await api.updatePerson(invitingPerson.id, { email, role: inviteRole, timeboardId: timeboard.id });
      await api.sendTimeboardInvitation({
        timeboardId: timeboard.id,
        personId: invitingPerson.id,
        email,
        role: inviteRole,
        inviterName: currentUser?.name || '',
        invitedBy: currentUser?.id || null
      });
      showToast(t('people.inviteSentToast', { email }));
      setInvitingPerson(null);
      onReload();
    } catch (err) {
      showToast(err.message || t('people.inviteFailedToast'));
    } finally {
      setIsSendingInvite(false);
    }
  };

  // ---- Styles ----
  const iconButton = { background: 'var(--bg-app)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const primaryButton = { background: TimelineColor.PRIMARY, color: 'var(--text-white)', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' };
  const secondaryButton = { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', padding: '10px 18px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' };
  const cell = { padding: '12px 16px', verticalAlign: 'middle' };
  const headCell = { padding: '10px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' };
  const label = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' };
  const input = { background: 'var(--bg-card-hover)' };

  const showsRole = category === ALL || category === PersonCategory.MEMBER;
  const showsAccess = category === PersonCategory.UNIT || category === PersonCategory.MEMBER;
  const canInvite = (person) => !person.isOwner && !userIdOf(person) && (
    category === PersonCategory.UNIT || category === PersonCategory.MEMBER || (category === ALL && person.type === PersonType.MEMBER)
  );

  const typeIcon = (person) => {
    if (person.isOwner) return <Crown size={16} style={{ color: TimelineColor.WARNING, flexShrink: 0 }} />;
    if (category === PersonCategory.UNIT) return <Home size={16} style={{ color: TimelineColor.CONDOFLOW, flexShrink: 0 }} />;
    if (person.type === PersonType.ORGANIZATION) return <Building2 size={16} style={{ color: TimelineColor.BLUE, flexShrink: 0 }} />;
    if (person.type === PersonType.MEMBER) return <UserCheck size={16} style={{ color: TimelineColor.VIOLET, flexShrink: 0 }} />;
    return <User size={16} style={{ color: TimelineColor.SUCCESS, flexShrink: 0 }} />;
  };

  const accessBadge = (person) => {
    if (person.isOwner) return null;
    const access = accessOf(person);
    const color = access === 'active' ? TimelineColor.SUCCESS : access === 'pending' ? TimelineColor.WARNING : 'var(--text-muted)';
    const Icon = access === 'active' ? Check : access === 'pending' ? Clock : UserX;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color }}>
        <Icon size={13} />{t(`people.access.${access}`)}
      </span>
    );
  };

  const typeFilters = category === ALL
    ? [PersonType.PERSON, PersonType.ORGANIZATION, PersonType.MEMBER]
    : category === PersonCategory.ENTITY ? [PersonType.PERSON, PersonType.ORGANIZATION] : [];
  const typeOptions = [
    { id: PersonType.PERSON, label: t('timeboardSettings.entities.types.person'), icon: User, color: TimelineColor.SUCCESS },
    { id: PersonType.ORGANIZATION, label: t('timeboardSettings.entities.types.organization'), icon: Building2, color: TimelineColor.BLUE },
    ...(category === ALL ? [{ id: PersonType.MEMBER, label: t('timeboardSettings.entities.types.member'), icon: UserCheck, color: TimelineColor.VIOLET }] : [])
  ];
  const roleOptions = roleChoices.map((role) => ({
    id: role,
    label: t(`timeboardSettings.entities.roles.${role}`),
    icon: ROLE_STYLE[role].icon,
    color: ROLE_STYLE[role].color,
    tooltip: t(`timeboardSettings.entities.rolesDesc.${role}`)
  }));
  const formType = category === PersonCategory.MEMBER ? PersonType.MEMBER : form.type;
  const addLabel = isCategoryList ? t(`people.add.${ADD_KEYS[category]}`) : t('timeboardSettings.entities.addEntityButton');
  const formTitle = isCategoryList
    ? t(`people.formTitle.${ADD_KEYS[category]}`)
    : t(isEditing ? 'timeboardSettings.entities.editPersonTitle' : 'timeboardSettings.entities.addPersonTitle');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {isCategoryList && <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t(`people.intro.${ADD_KEYS[category]}`)}</p>}

      {/* Filters, search and add */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {typeFilters.length > 0 && [ALL, ...typeFilters].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${typeFilter === type ? TimelineColor.PRIMARY : 'var(--border-glass)'}`,
                background: typeFilter === type ? `${TimelineColor.PRIMARY}18` : 'var(--bg-card)',
                color: typeFilter === type ? TimelineColor.PRIMARY : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: typeFilter === type ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {t(`timeboardSettings.entities.filters.${type === ALL ? 'all' : type}`)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '180px', maxWidth: '260px', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('timeboardSettings.entities.searchPlaceholder')}
              style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '7px 10px 7px 30px', fontSize: '0.82rem', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          <button type="button" onClick={() => openForm()} style={primaryButton}>
            <Plus size={15} /><span>{addLabel}</span>
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('people.loading')}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          {search ? t('people.empty.search') : isCategoryList ? t(`people.empty.${ADD_KEYS[category]}`) : t('timeboardSettings.entities.emptyStateDesc')}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}>
                {category === PersonCategory.UNIT && <th style={{ ...headCell, width: '130px' }}>{t('people.columns.unit')}</th>}
                <th style={headCell}>{category === PersonCategory.UNIT ? t('people.columns.owner') : t('people.columns.name')}</th>
                {showsRole && <th style={{ ...headCell, width: '150px' }}>{t('people.columns.role')}</th>}
                {showsAccess && <th style={{ ...headCell, width: '150px' }}>{t('people.columns.access')}</th>}
                <th style={{ ...headCell, textAlign: 'right', width: '160px' }}>{t('people.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  {category === PersonCategory.UNIT && (
                    <td style={{ ...cell, fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{unitOf(person)}</td>
                  )}
                  <td style={cell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {typeIcon(person)}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{nameOf(person)}</span>
                          {category !== PersonCategory.UNIT && (unitOf(person) || taxIdOf(person)) && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>
                              {unitOf(person) || taxIdOf(person)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {person.email && <span>{person.email}</span>}
                          {person.phone && <span>· {person.phone}</span>}
                          {category === PersonCategory.UNIT && taxIdOf(person) && <span>· {taxIdOf(person)}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {showsRole && (
                    <td style={cell}>
                      {person.isOwner ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: TimelineColor.WARNING, fontWeight: 600, fontSize: '0.84rem' }}>
                          <Crown size={14} />{t('timeboardSettings.entities.roles.owner')}
                        </span>
                      ) : person.type === PersonType.MEMBER || category === PersonCategory.MEMBER ? (
                        <RoleDropdown role={person.role || PersonRole.CONTRIBUTOR} roles={roleChoices} onChange={(role) => handleChangeRole(person, role)} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>—</span>
                      )}
                    </td>
                  )}
                  {showsAccess && <td style={cell}>{accessBadge(person)}</td>}
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {!person.isOwner && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {canInvite(person) && (
                          <button
                            type="button"
                            onClick={() => openInvite(person)}
                            title={accessOf(person) === 'pending' ? t('people.resendInvite') : t('people.invite')}
                            style={{ ...iconButton, gap: '5px', padding: '5px 9px', color: TimelineColor.PRIMARY, fontSize: '0.76rem', fontWeight: 600 }}
                          >
                            <Send size={12} /><span>{t('people.invite')}</span>
                          </button>
                        )}
                        <button type="button" onClick={() => openForm(person)} title={t('people.edit')} style={iconButton}><Edit3 size={13} /></button>
                        <button type="button" onClick={() => handleDelete(person)} title={t('people.delete')} style={{ ...iconButton, color: TimelineColor.DANGER, background: `${TimelineColor.DANGER}1a`, borderColor: `${TimelineColor.DANGER}40` }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / edit form */}
      {formPerson && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--overlay-backdrop)' }}>
          <div className="modal-container" style={{ width: '100%', maxWidth: '640px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-app)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{formTitle}</h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{timeboard.name}</span>
              </div>
              <button type="button" onClick={() => setFormPerson(null)} aria-label={t('people.cancel')} style={{ ...iconButton, width: '32px', height: '32px' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {category === PersonCategory.UNIT && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={label}>{t('people.unitLabel')}</label>
                  <input type="text" required className="form-input" style={input} value={form.obligatorIdentification} onChange={(e) => setForm({ ...form, obligatorIdentification: e.target.value })} placeholder={t('people.unitPlaceholder')} />
                </div>
              )}

              {category !== PersonCategory.MEMBER && (
                <OptionBoxGroup
                  label={category === PersonCategory.UNIT ? t('people.ownerTypeLabel') : t('timeboardSettings.entities.form.typeLabel')}
                  options={typeOptions}
                  value={form.type}
                  onChange={(type) => setForm({ ...form, type })}
                  marginBottom="0"
                />
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={label}>{t('timeboardSettings.entities.form.personNameLabel')}</label>
                <input type="text" required className="form-input" style={input} value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} placeholder={t('timeboardSettings.entities.form.personNamePlaceholder')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {category === ALL && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={label}>{t('timeboardSettings.entities.form.obligatorIdentificationLabel')}</label>
                    <input type="text" className="form-input" style={input} value={form.obligatorIdentification} onChange={(e) => setForm({ ...form, obligatorIdentification: e.target.value })} placeholder={t('timeboardSettings.entities.form.obligatorIdentificationPlaceholder')} />
                  </div>
                )}
                {category !== PersonCategory.MEMBER && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={label}>{t('timeboardSettings.entities.form.taxIdLabel')}</label>
                    <input type="text" className="form-input" style={input} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder={t('timeboardSettings.entities.form.taxIdPlaceholder')} />
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={label}>{t('timeboardSettings.entities.form.emailLabel')}</label>
                  <input type="email" className="form-input" style={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('timeboardSettings.entities.form.emailPlaceholder')} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={label}>{t('timeboardSettings.entities.form.phoneLabel')}</label>
                  <input type="tel" className="form-input" style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('timeboardSettings.entities.form.phonePlaceholder')} />
                </div>
                {category === ALL && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={label}>{t('timeboardSettings.entities.form.birthDateLabel')}</label>
                    <input type="date" className="form-input" style={input} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={label}>{t('timeboardSettings.entities.form.observationLabel')}</label>
                <textarea rows={2} className="form-input" style={{ ...input, resize: 'vertical' }} value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} placeholder={t('timeboardSettings.entities.form.observationPlaceholder')} />
              </div>

              {formType === PersonType.MEMBER && roleOptions.length > 0 && (
                <OptionBoxGroup label={t('timeboardSettings.entities.form.roleLabel')} options={roleOptions} value={form.role} onChange={(role) => setForm({ ...form, role })} marginBottom="0" />
              )}
              {category === PersonCategory.UNIT && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('people.fixedRole')}</span>}

              {category === PersonCategory.UNIT && (
                <UnitFeeSection
                  draft={feeDraft}
                  onChange={setFeeDraft}
                  fee={unitFee}
                  isNew={!isEditing}
                  isLoading={isFeeLoading}
                  isApplying={isApplyingFee}
                  onApply={() => applyFee(formPerson.id, unitOf(formPerson) || form.obligatorIdentification, { ask: true })}
                />
              )}

              {/* Linked account (not for entities: they never have access) */}
              {isEditing && category !== PersonCategory.ENTITY && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ ...label, color: 'var(--text-muted)' }}>{t('people.account.title')}</label>
                  {userIdOf(formPerson) ? (
                    <div style={{ padding: '12px 14px', background: `${TimelineColor.SUCCESS}14`, border: `1px solid ${TimelineColor.SUCCESS}40`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        <CheckCircle2 size={16} style={{ color: TimelineColor.SUCCESS }} />{t('people.account.linked')}
                      </span>
                      <button type="button" onClick={() => handleUnlink(formPerson)} style={{ background: `${TimelineColor.DANGER}1f`, border: `1px solid ${TimelineColor.DANGER}4c`, color: TimelineColor.DANGER, padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        {t('people.account.unlink')}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', border: '1px dashed var(--border-glass)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <UserX size={14} /><span>{t('people.account.none')}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setFormPerson(null)} style={secondaryButton}>{t('people.cancel')}</button>
                <button type="submit" disabled={isSaving || !form.personName.trim()} style={{ ...primaryButton, padding: '10px 22px', borderRadius: '10px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {t('people.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation */}
      {invitingPerson && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--overlay-backdrop)' }}>
          <div className="modal-container" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('people.inviteModal.title')}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('people.inviteModal.subtitle', { name: timeboard?.name })}</p>
              </div>
              <button type="button" onClick={() => setInvitingPerson(null)} aria-label={t('people.cancel')} style={{ ...iconButton, background: 'transparent', border: 'none' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>
              {category === PersonCategory.UNIT && `${unitOf(invitingPerson)} · `}{nameOf(invitingPerson)}
            </div>

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('people.inviteModal.emailLabel')}</span>
                  {inviteEmail.trim() && (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: isValidEmail(inviteEmail) ? TimelineColor.SUCCESS : TimelineColor.DANGER }}>
                      {t(isValidEmail(inviteEmail) ? 'people.inviteModal.validEmail' : 'people.inviteModal.invalidEmail')}
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('people.inviteModal.emailPlaceholder')}
                    style={{ width: '100%', background: 'var(--bg-card-hover)', border: `1px solid ${isValidEmail(inviteEmail) ? TimelineColor.SUCCESS : 'var(--border-glass)'}`, borderRadius: '10px', padding: '11px 14px 11px 38px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              {roleOptions.length > 0 ? (
                <OptionBoxGroup label={t('people.inviteModal.roleLabel')} options={roleOptions} value={inviteRole} onChange={setInviteRole} marginBottom="0" />
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('people.fixedRole')}</span>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setInvitingPerson(null)} style={secondaryButton}>{t('people.cancel')}</button>
                <button type="submit" disabled={isSendingInvite || !isValidEmail(inviteEmail)} style={{ ...primaryButton, padding: '10px 22px', borderRadius: '10px', opacity: isValidEmail(inviteEmail) ? 1 : 0.5 }}>
                  <Send size={15} /><span>{t(isSendingInvite ? 'people.inviteModal.sending' : 'people.inviteModal.send')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Role of a member in the list, changed in place. */
function RoleDropdown({ role, roles, onChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false); }}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 0', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.84rem', cursor: 'pointer' }}>
        <span>{t(`timeboardSettings.entities.roles.${role}`)}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1400, minWidth: '220px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {roles.map((option) => {
            const { icon: Icon, color } = ROLE_STYLE[option];
            const isCurrent = option === role;
            return (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setIsOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', background: isCurrent ? `${color}26` : 'transparent' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={14} style={{ color }} />
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isCurrent ? color : 'var(--text-main)' }}>{t(`timeboardSettings.entities.roles.${option}`)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t(`timeboardSettings.entities.rolesDesc.${option}`)}</span>
                  </span>
                </span>
                {isCurrent && <Check size={15} style={{ color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
