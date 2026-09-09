import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Sliders,
  Users,
  User,
  Building2,
  Shield,
  ShieldCheck,
  Crown,
  Mail,
  Phone,
  FileText,
  Trash2,
  Edit3,
  Send,
  Plus,
  Search,
  Lock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronDown,
  UserCheck,
  UserX,
  Clock,
  Ban,
  RefreshCw,
  Copy,
  Link
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PersonRole, PersonType, TimeboardType, InvitationStatus } from '../enums/index.js';
import * as api from '../services/api.js';

export default function TimeboardSettingsModal({
  isOpen,
  onClose,
  timeboard,
  onSaveTimeboard,
  onDeleteTimeboard
}) {
  const { t } = useTranslation();

  // Active Tab: 'general' | 'entities' | 'settings'
  const [activeTab, setActiveTab] = useState('general');

  // General tab form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    description: '',
    type: TimeboardType.FINANCIAL
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSaveSuccess, setGeneralSaveSuccess] = useState(false);

  // Entities tab state
  const [persons, setPersons] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityForm, setEntityForm] = useState({
    type: PersonType.PERSON,
    name: '',
    email: '',
    phone: '',
    taxId: '',
    role: PersonRole.CONTRIBUTOR
  });
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Send Invitation Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitingPerson, setInvitingPerson] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(PersonRole.CONTRIBUTOR);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state when timeboard or isOpen changes
  useEffect(() => {
    if (isOpen && timeboard) {
      setGeneralForm({
        name: timeboard.name || '',
        description: timeboard.description || '',
        type: timeboard.type || TimeboardType.FINANCIAL
      });
      loadPersons(timeboard.id);
    }
  }, [isOpen, timeboard?.id, activeTab]);

  const loadPersons = async (timeboardId) => {
    if (!timeboardId) return;
    setIsLoadingPersons(true);
    try {
      const [personsData, invitesData] = await Promise.all([
        api.fetchPersons(timeboardId),
        api.fetchTimeboardInvitations(timeboardId).catch(() => [])
      ]);
      setPersons(Array.isArray(personsData) ? personsData : []);
      setInvitations(Array.isArray(invitesData) ? invitesData : []);
    } catch (err) {
      console.error('Failed to load persons & invitations:', err);
      setPersons([]);
      setInvitations([]);
    } finally {
      setIsLoadingPersons(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (!isOpen || !timeboard) return null;

  // Handler: Save General Info
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!generalForm.name.trim()) return;
    setIsSavingGeneral(true);
    try {
      await onSaveTimeboard({
        ...timeboard,
        name: generalForm.name.trim(),
        description: generalForm.description.trim()
      });
      setGeneralSaveSuccess(true);
      setTimeout(() => setGeneralSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save timeboard:', err);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Handler: Delete Timeboard
  const handleDeleteTimeboard = () => {
    if (onDeleteTimeboard) {
      onDeleteTimeboard(timeboard.id);
      onClose();
    }
  };

  // Handler: Open Entity Form (Create or Edit)
  const handleOpenEntityForm = (entity = null) => {
    if (entity) {
      setEditingEntity(entity);
      setEntityForm({
        type: entity.type || PersonType.PERSON,
        name: entity.name || '',
        email: entity.email || '',
        phone: entity.phone || '',
        taxId: entity.taxId || entity.tax_id || '',
        role: entity.role || PersonRole.CONTRIBUTOR
      });
    } else {
      setEditingEntity(null);
      setEntityForm({
        type: selectedTypeFilter !== 'all' ? selectedTypeFilter : PersonType.PERSON,
        name: '',
        email: '',
        phone: '',
        taxId: '',
        role: PersonRole.CONTRIBUTOR
      });
    }
    setIsEntityModalOpen(true);
  };

  // Handler: Save Entity (Create or Update)
  const handleSaveEntity = async (e) => {
    e.preventDefault();
    if (!entityForm.name.trim()) return;

    setIsSavingEntity(true);
    const payload = {
      timeboardId: timeboard.id,
      type: entityForm.type,
      name: entityForm.name.trim(),
      email: entityForm.email.trim() || null,
      phone: entityForm.phone.trim() || null,
      taxId: entityForm.taxId.trim() || null,
      role: entityForm.type === PersonType.MEMBER ? (entityForm.role || PersonRole.CONTRIBUTOR) : null,
      userId: editingEntity?.userId || editingEntity?.user_id || null
    };

    try {
      if (editingEntity && editingEntity.id) {
        const updated = await api.updatePerson(editingEntity.id, payload);
        setPersons((prev) => prev.map((p) => (p.id === editingEntity.id ? { ...p, ...updated } : p)));
        showToast(`Entidade "${payload.name}" atualizada com sucesso.`);
      } else {
        const created = await api.createPerson(payload);
        setPersons((prev) => [...prev, created]);
        showToast(`Entidade "${payload.name}" adicionada com sucesso.`);
      }
      setIsEntityModalOpen(false);
      setEditingEntity(null);
    } catch (err) {
      console.error('Failed to save entity:', err);
    } finally {
      setIsSavingEntity(false);
    }
  };

  // Handler: Quick change role from table
  const handleChangeRole = async (personId, newRole) => {
    try {
      setPersons((prev) => prev.map((p) => (p.id === personId ? { ...p, role: newRole } : p)));
      await api.updatePerson(personId, { role: newRole, timeboardId: timeboard.id });
      showToast(`Função atualizada para ${newRole === PersonRole.ADMIN ? 'Administrador' : 'Colaborador'}.`);
    } catch (err) {
      console.error('Failed to change role:', err);
      loadPersons(timeboard.id);
    }
  };

  // Handler: Delete Entity
  const handleDeleteEntity = async (personId, personName) => {
    const confirmMsg = t('timeboardSettings.entities.deleteConfirm') || `Tem a certeza que deseja remover ${personName}?`;
    if (window.confirm(confirmMsg)) {
      try {
        setPersons((prev) => prev.filter((p) => p.id !== personId));
        await api.deletePerson(personId, timeboard.id);
        showToast(`"${personName}" removido com sucesso.`);
      } catch (err) {
        console.error('Failed to delete person:', err);
        loadPersons(timeboard.id);
      }
    }
  };

  // Handler: Open Send Invitation Modal
  const handleSendInvite = (person) => {
    setInvitingPerson(person);
    setInviteEmail(person.email || '');
    setInviteRole(person.role || PersonRole.CONTRIBUTOR);
    setIsInviteModalOpen(true);
    setCopiedLink(false);
  };

  const isValidEmail = (email) => {
    return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  };

  const handleConfirmSendInvite = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!invitingPerson || !isValidEmail(inviteEmail)) return;

    setIsSendingInvite(true);
    const targetEmail = inviteEmail.trim().toLowerCase();
    const targetRole = inviteRole || PersonRole.CONTRIBUTOR;

    try {
      // 1. Update person in Database (both email and role)
      const updated = await api.updatePerson(invitingPerson.id, {
        email: targetEmail,
        role: targetRole,
        timeboardId: timeboard.id
      });

      // 2. Update local persons table state
      setPersons((prev) =>
        prev.map((p) =>
          p.id === invitingPerson.id
            ? { ...p, ...updated, email: targetEmail, role: targetRole }
            : p
        )
      );

      // 3. Send real invitation email via Brevo API and record in invitations table
      const currentUser = api.getCurrentUser();
      await api.sendTimeboardInvitation({
        timeboardId: timeboard.id,
        personId: invitingPerson.id,
        email: targetEmail,
        role: targetRole,
        inviterName: currentUser?.name || 'Administrador',
        invitedBy: currentUser?.id || null
      });

      showToast(`Convite enviado por email com sucesso para ${targetEmail}!`);
      setIsInviteModalOpen(false);
      setInvitingPerson(null);
      loadPersons(timeboard.id);
    } catch (err) {
      console.error('Failed to send invite & update person:', err);
      showToast(err.message || 'Erro ao enviar convite. Tente novamente.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (person) => {
    if (!person || !timeboard?.id) return;
    const cleanEmail = person.email?.toLowerCase().trim();
    const inv = invitations.find(
      (i) => i.email?.toLowerCase().trim() === cleanEmail && i.status === (InvitationStatus.PENDING || 'PENDING')
    );
    if (!window.confirm(`Tem a certeza que deseja revogar o convite para "${person.name}" (${person.email})?`)) return;

    try {
      if (inv) {
        await api.revokeTimeboardInvitation(timeboard.id, inv.id);
      }
      showToast('Convite revogado com sucesso.');
      loadPersons(timeboard.id);
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      showToast(err.message || 'Erro ao revogar convite.');
    }
  };

  const handleUnlinkUser = async (person) => {
    if (!person || !timeboard?.id) return;
    if (
      !window.confirm(
        `Tem a certeza que deseja desvincular o utilizador de "${person.name}"? O utilizador perderá o acesso de membro a este Timeboard.`
      )
    )
      return;

    try {
      await api.unlinkPersonMember(timeboard.id, person.id);
      showToast(`Utilizador desvinculado de "${person.name}" com sucesso.`);
      loadPersons(timeboard.id);
    } catch (err) {
      console.error('Failed to unlink user from person:', err);
      showToast(err.message || 'Erro ao desvincular utilizador.');
    }
  };

  // Filter counts & Metrics
  const countAll = persons.length;
  const countPersons = persons.filter((p) => (p.type || PersonType.PERSON) === PersonType.PERSON).length;
  const countOrgs = persons.filter((p) => p.type === PersonType.ORGANIZATION).length;
  const countMembers = persons.filter((p) => p.type === PersonType.MEMBER).length;
  const countLinked = persons.filter((p) => Boolean(p.userId || p.user_id)).length;
  const countPendingInvites = invitations.filter((i) => i.status === (InvitationStatus.PENDING || 'PENDING')).length;

  // Filtered persons
  const filteredPersons = persons.filter((p) => {
    const currentType = p.type || PersonType.PERSON;
    if (selectedTypeFilter !== 'all' && currentType !== selectedTypeFilter) {
      return false;
    }
    if (!entitySearch) return true;
    const q = entitySearch.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const emailMatch = p.email?.toLowerCase().includes(q);
    const taxMatch = (p.taxId || p.tax_id)?.toLowerCase().includes(q);
    return nameMatch || emailMatch || taxMatch;
  });

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 11, 22, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'tbFadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes tbFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes tbPulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.9); }
        }
        @keyframes tbSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tb-settings-window {
          width: 95vw;
          max-width: 1240px;
          height: 88vh;
          max-height: 860px;
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          box-shadow: var(--shadow-sm, 0 20px 50px rgba(0, 0, 0, 0.3));
          overflow: hidden;
          position: relative;
        }

        .tb-modal-body-layout {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .tb-sidebar-nav {
          width: 240px;
          flex-shrink: 0;
          border-right: 1px solid var(--border-glass);
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: var(--bg-app, rgba(99, 102, 241, 0.03));
        }

        .tb-main-content {
          flex: 1;
          min-width: 0;
          padding: 28px 32px;
          overflow-y: auto;
          background: transparent;
        }

        .tb-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .tb-desktop-table-view {
          display: block;
        }

        .tb-mobile-cards-view {
          display: none;
        }

        .tb-table-row:hover {
          background: var(--bg-card-hover, rgba(255, 255, 255, 0.035)) !important;
        }

        @media (max-width: 960px) {
          .tb-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .tb-settings-window {
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            border: none;
          }
          .tb-modal-body-layout {
            flex-direction: column;
          }
          .tb-sidebar-nav {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            padding: 10px 14px;
            border-right: none;
            border-bottom: 1px solid var(--border-glass);
            gap: 8px;
          }
          .tb-sidebar-nav button {
            white-space: nowrap;
          }
          .tb-main-content {
            padding: 16px 14px;
          }
          .tb-kpi-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .tb-desktop-table-view {
            display: none;
          }
          .tb-mobile-cards-view {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      {/* Full-Window Settings Container */}
      <div className="modal-container tb-settings-window">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              zIndex: 1300,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: '600',
              animation: 'tbSlideDown 0.3s ease-out'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                flexShrink: 0
              }}
            >
              <Settings size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {t('timeboardSettings.modalTitle') || 'Definições do Timeboard'}
                </h2>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--primary-light, #6366f1)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-glass)',
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {timeboard.name}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t('timeboardSettings.modalSubtitle') || 'Gerir entidades, permissões de membros e configurações deste espaço'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-muted)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-glass)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs + Content Area */}
        <div className="tb-modal-body-layout">
          {/* Tabs Sidebar */}
          <div className="tb-sidebar-nav">
            <TabButton
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<Sliders size={18} />}
              label={t('timeboardSettings.tabs.general') || 'Geral'}
            />
            <TabButton
              active={activeTab === 'entities'}
              onClick={() => setActiveTab('entities')}
              icon={<Users size={18} />}
              label={t('timeboardSettings.tabs.entities') || 'Entidades & Membros'}
              badge={persons.length > 0 ? persons.length : null}
            />
            <TabButton
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              icon={<Settings size={18} />}
              label={t('timeboardSettings.tabs.settings') || 'Configurações'}
            />
          </div>

          {/* Tab Content Area */}
          <div className="tb-main-content">
            {/* TAB 1: GERAL */}
            {activeTab === 'general' && (
              <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
                    {t('timeboardSettings.general.title') || 'Informações Gerais'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {t('timeboardSettings.general.subtitle') || 'Parâmetros básicos deste espaço Timeboard'}
                  </p>
                </div>

                <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Name */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main, #e2e8f0)' }}>
                      {t('timeboardSettings.general.nameLabel') || 'Nome do Timeboard *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={generalForm.name}
                      onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                      placeholder={t('timeboardSettings.general.namePlaceholder') || 'Ex: Timeboard Principal, Finanças Pessoais...'}
                      className="form-control"
                      style={{
                        background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                        border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--text-main, #fff)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main, #e2e8f0)' }}>
                      {t('timeboardSettings.general.descriptionLabel') || 'Descrição'}
                    </label>
                    <textarea
                      rows={3}
                      value={generalForm.description}
                      onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                      placeholder={t('timeboardSettings.general.descriptionPlaceholder') || 'Breve descrição dos objetivos ou escopo...'}
                      className="form-control"
                      style={{
                        background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                        border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--text-main, #fff)',
                        fontSize: '0.92rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Type (Locked / Read-only) */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                      {t('timeboardSettings.general.typeLabel') || 'Tipo de Timeboard (Apenas Leitura)'}
                    </label>
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px dashed var(--border-glass, rgba(255, 255, 255, 0.15))',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--text-muted, #94a3b8)',
                        fontSize: '0.92rem'
                      }}
                    >
                      <span style={{ fontWeight: '600', color: 'var(--text-main, #cbd5e1)', textTransform: 'capitalize' }}>
                        {generalForm.type || 'financial'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t('timeboardSettings.general.typeLockedNotice') || '🔒 O tipo de timeboard não pode ser alterado após a criação.'}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={isSavingGeneral}
                      style={{
                        background: generalSaveSuccess
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 24px',
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        cursor: isSavingGeneral ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {generalSaveSuccess ? <CheckCircle2 size={16} /> : null}
                      <span>{generalSaveSuccess ? 'Guardado com Sucesso!' : (t('timeboardSettings.general.saveButton') || 'Guardar Alterações')}</span>
                    </button>
                  </div>
                </form>

                {/* Danger Zone */}
                <div
                  style={{
                    marginTop: '24px',
                    padding: '20px 24px',
                    background: 'rgba(239, 68, 68, 0.04)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#f87171' }}>
                        {t('timeboardSettings.general.deleteTimeboardTitle') || 'Eliminar este Timeboard'}
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                        {t('timeboardSettings.general.deleteTimeboardDesc') || 'Remove permanentemente este timeboard, todas as suas timelines e eventos associados.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteTimeboard}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Trash2 size={16} />
                    <span>{t('timeboardSettings.general.deleteButton') || 'Eliminar Timeboard'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ENTIDADES & MEMBROS */}
            {activeTab === 'entities' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Top Control Bar: Filters, Search & Add Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <FilterPill
                      active={selectedTypeFilter === 'all'}
                      onClick={() => setSelectedTypeFilter('all')}
                      label={t('timeboardSettings.entities.filters.all') || 'Todos'}
                      count={countAll}
                    />
                    <FilterPill
                      active={selectedTypeFilter === PersonType.PERSON}
                      onClick={() => setSelectedTypeFilter(PersonType.PERSON)}
                      icon={<User size={13} style={{ color: selectedTypeFilter === PersonType.PERSON ? '#10b981' : 'var(--text-muted)' }} />}
                      label={t('timeboardSettings.entities.filters.person') || 'Pessoas'}
                      count={countPersons}
                      activeColor="#10b981"
                    />
                    <FilterPill
                      active={selectedTypeFilter === PersonType.ORGANIZATION}
                      onClick={() => setSelectedTypeFilter(PersonType.ORGANIZATION)}
                      icon={<Building2 size={13} style={{ color: selectedTypeFilter === PersonType.ORGANIZATION ? '#3b82f6' : 'var(--text-muted)' }} />}
                      label={t('timeboardSettings.entities.filters.organization') || 'Empresas'}
                      count={countOrgs}
                      activeColor="#3b82f6"
                    />
                    <FilterPill
                      active={selectedTypeFilter === PersonType.MEMBER}
                      onClick={() => setSelectedTypeFilter(PersonType.MEMBER)}
                      icon={<UserCheck size={13} style={{ color: selectedTypeFilter === PersonType.MEMBER ? '#8b5cf6' : 'var(--text-muted)' }} />}
                      label={t('timeboardSettings.entities.filters.member') || 'Membros'}
                      count={countMembers}
                      activeColor="#8b5cf6"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '180px', maxWidth: '260px', width: '100%' }}>
                      <Search
                        size={14}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)'
                        }}
                      />
                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder={t('timeboardSettings.entities.searchPlaceholder') || 'Pesquisar...'}
                        style={{
                          width: '100%',
                          background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.12))',
                          borderRadius: '8px',
                          padding: '7px 28px 7px 30px',
                          fontSize: '0.82rem',
                          color: 'var(--text-main, #fff)',
                          outline: 'none'
                        }}
                      />
                      {entitySearch && (
                        <button
                          type="button"
                          onClick={() => setEntitySearch('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Add Entity Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEntityForm()}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={15} />
                      <span>{t('timeboardSettings.entities.addEntityButton') || 'Adicionar'}</span>
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingPersons ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    A carregar entidades...
                  </div>
                ) : filteredPersons.length === 0 ? (
                  /* Empty State */
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--border-glass, rgba(255, 255, 255, 0.12))',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <Users size={24} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
                        {t('timeboardSettings.entities.emptyStateTitle') || 'Nenhuma entidade encontrada'}
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                        {selectedTypeFilter !== 'all' || entitySearch
                          ? 'Nenhum resultado corresponde aos filtros selecionados.'
                          : (t('timeboardSettings.entities.emptyStateDesc') || 'Adicione pessoas ou empresas para gerir responsabilidades na timeline.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Compact Clean Table */
                  <div
                    style={{
                      background: 'var(--bg-card, #111827)',
                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      borderRadius: '12px',
                      overflow: 'visible'
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                            background: 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <th style={{ padding: '10px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.entity') || 'Nome / Entidade'}
                          </th>
                          <th style={{ padding: '10px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', width: '150px' }}>
                            {t('timeboardSettings.entities.table.role') || 'Função'}
                          </th>
                          <th style={{ padding: '10px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'right', width: '200px' }}>
                            {t('timeboardSettings.entities.table.actions') || 'Ações'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPersons.map((p) => {
                          const pType = p.type || PersonType.PERSON;
                          const isOrg = pType === PersonType.ORGANIZATION;
                          const isMember = pType === PersonType.MEMBER;
                          const hasUserAccount = Boolean(p.userId || p.user_id);
                          const cleanEmail = p.email ? p.email.toLowerCase().trim() : null;
                          const personInvite = cleanEmail
                            ? invitations.find((i) => i.email?.toLowerCase().trim() === cleanEmail)
                            : null;
                          const isPendingInvite = personInvite?.status === (InvitationStatus.PENDING || 'PENDING');

                          return (
                            <tr
                              key={p.id}
                              style={{
                                borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.05))',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {/* Name with Type Icon in front + Status Indicator */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {isOrg ? (
                                    <Building2 size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                  ) : isMember ? (
                                    <UserCheck size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                                  ) : (
                                    <User size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                                  )}

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main, #fff)' }}>
                                        {p.name}
                                      </span>
                                      {hasUserAccount && (
                                        <Check size={14} style={{ color: '#10b981' }} title="Conta de Utilizador Vinculada" />
                                      )}
                                      {!hasUserAccount && isPendingInvite && (
                                        <Clock size={13} style={{ color: '#f59e0b' }} title="Convite Pendente" />
                                      )}
                                    </div>
                                    {p.email && (
                                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                                        {p.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td style={{ padding: '12px 16px' }}>
                                {isMember ? (
                                  <CustomRoleDropdown
                                    currentRole={p.role || PersonRole.CONTRIBUTOR}
                                    onChange={(newRole) => handleChangeRole(p.id, newRole)}
                                    t={t}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>—</span>
                                )}
                              </td>

                              {/* Action Buttons */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  {/* Send Invite Button for Members without linked account */}
                                  {isMember && !hasUserAccount && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendInvite(p)}
                                      title={isPendingInvite ? "Reenviar convite por email" : "Enviar convite por email"}
                                      style={{
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid var(--border-glass, rgba(99, 102, 241, 0.25))',
                                        color: 'var(--primary-light, #6366f1)',
                                        padding: '5px 9px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.76rem',
                                        fontWeight: '600',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--primary, #6366f1)';
                                        e.currentTarget.style.color = '#ffffff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                        e.currentTarget.style.color = 'var(--primary-light, #6366f1)';
                                      }}
                                    >
                                      <Send size={12} />
                                      <span>Send invite</span>
                                    </button>
                                  )}

                                  {/* Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEntityForm(p)}
                                    title="Editar"
                                    style={{
                                      background: 'var(--bg-app, rgba(255, 255, 255, 0.05))',
                                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                                      color: 'var(--text-main, #cbd5e1)',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <Edit3 size={13} />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntity(p.id, p.name)}
                                    title="Eliminar"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      color: '#f87171',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONFIGURAÇÕES (EMPTY PLACEHOLDER) */}
            {activeTab === 'settings' && (
              <div
                style={{
                  height: '100%',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '16px',
                  padding: '40px 20px'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary-light, #818cf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)'
                  }}
                >
                  <Sparkles size={32} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main, #fff)' }}>
                    {t('timeboardSettings.settingsTab.emptyTitle') || 'Configurações em Desenvolvimento'}
                  </h3>
                  <p style={{ margin: '8px auto 0', maxWidth: '440px', fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                    {t('timeboardSettings.settingsTab.emptyDesc') || 'Parâmetros adicionais de automação, integrações e preferências avançadas estarão disponíveis aqui em breve.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modal / Drawer: Add/Edit Entity */}
      {isEntityModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="modal-container"
            style={{
              width: '100%',
              maxWidth: '540px',
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 30px rgba(99, 102, 241, 0.2)',
              overflow: 'hidden',
              animation: 'scaleUp 0.2s ease-out'
            }}
          >
            {/* Sub-Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: entityForm.type === PersonType.ORGANIZATION
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%)'
                      : entityForm.type === PersonType.MEMBER
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.3) 100%)'
                      : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                    color: entityForm.type === PersonType.ORGANIZATION
                      ? '#60a5fa'
                      : entityForm.type === PersonType.MEMBER
                      ? '#a78bfa'
                      : '#34d399',
                    border: `1px solid ${
                      entityForm.type === PersonType.ORGANIZATION
                        ? 'rgba(59, 130, 246, 0.3)'
                        : entityForm.type === PersonType.MEMBER
                        ? 'rgba(139, 92, 246, 0.3)'
                        : 'rgba(16, 185, 129, 0.3)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {entityForm.type === PersonType.ORGANIZATION ? (
                    <Building2 size={18} />
                  ) : entityForm.type === PersonType.MEMBER ? (
                    <UserCheck size={18} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main, #fff)' }}>
                    {editingEntity
                      ? (t('timeboardSettings.entities.editPersonTitle') || 'Editar Pessoa / Empresa / Membro')
                      : (t('timeboardSettings.entities.addPersonTitle') || 'Adicionar Pessoa / Empresa / Membro')}
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {timeboard.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntityModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-muted)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Sub-Modal Form */}
            <form onSubmit={handleSaveEntity} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Type Switcher (Person vs Organization vs Member) */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted, #94a3b8)' }}>
                  {t('timeboardSettings.entities.form.typeLabel') || 'Tipo de Entidade *'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {/* Person */}
                  <button
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, type: PersonType.PERSON })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: entityForm.type === PersonType.PERSON ? '1.5px solid #10b981' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: entityForm.type === PersonType.PERSON ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityForm.type === PersonType.PERSON ? '#34d399' : 'var(--text-muted)',
                      boxShadow: entityForm.type === PersonType.PERSON ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <User size={16} />
                    <span>{t('timeboardSettings.entities.types.person') || 'Pessoa'}</span>
                  </button>

                  {/* Organization */}
                  <button
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, type: PersonType.ORGANIZATION })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: entityForm.type === PersonType.ORGANIZATION ? '1.5px solid #3b82f6' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: entityForm.type === PersonType.ORGANIZATION ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityForm.type === PersonType.ORGANIZATION ? '#60a5fa' : 'var(--text-muted)',
                      boxShadow: entityForm.type === PersonType.ORGANIZATION ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Building2 size={16} />
                    <span>{t('timeboardSettings.entities.types.organization') || 'Empresa'}</span>
                  </button>

                  {/* Member */}
                  <button
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, type: PersonType.MEMBER })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: entityForm.type === PersonType.MEMBER ? '1.5px solid #8b5cf6' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: entityForm.type === PersonType.MEMBER ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityForm.type === PersonType.MEMBER ? '#a78bfa' : 'var(--text-muted)',
                      boxShadow: entityForm.type === PersonType.MEMBER ? '0 0 16px rgba(139, 92, 246, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UserCheck size={16} />
                    <span>{t('timeboardSettings.entities.types.member') || 'Membro'}</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                  {t('timeboardSettings.entities.form.nameLabel') || 'Nome Completo / Razão Social *'}
                </label>
                <input
                  type="text"
                  required
                  value={entityForm.name}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  placeholder={t('timeboardSettings.entities.form.namePlaceholder') || 'Ex: Maria Silva ou Empresa XYZ Lda'}
                  style={{
                    background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: 'var(--text-main, #fff)',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Role Selector (Premium Custom Cards Selector) - Only for Members */}
              {entityForm.type === PersonType.MEMBER && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                    {t('timeboardSettings.entities.form.roleLabel') || 'Função (Role) *'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Admin Option */}
                    <div
                      onClick={() => setEntityForm({ ...entityForm, role: PersonRole.ADMIN })}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: entityForm.role === PersonRole.ADMIN ? '1.5px solid #f59e0b' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                        background: entityForm.role === PersonRole.ADMIN ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: entityForm.role === PersonRole.ADMIN ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '700', fontSize: '0.86rem' }}>
                          <Crown size={15} />
                          <span>{t('timeboardSettings.entities.roles.admin') || 'Administrador'}</span>
                        </div>
                        {entityForm.role === PersonRole.ADMIN && (
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Acesso total e gestão
                      </span>
                    </div>

                    {/* Contributor Option */}
                    <div
                      onClick={() => setEntityForm({ ...entityForm, role: PersonRole.CONTRIBUTOR })}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: entityForm.role === PersonRole.CONTRIBUTOR ? '1.5px solid #6366f1' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                        background: entityForm.role === PersonRole.CONTRIBUTOR ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: entityForm.role === PersonRole.CONTRIBUTOR ? '0 0 16px rgba(99, 102, 241, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc', fontWeight: '700', fontSize: '0.86rem' }}>
                          <Users size={15} />
                          <span>{t('timeboardSettings.entities.roles.contributor') || 'Colaborador'}</span>
                        </div>
                        {entityForm.role === PersonRole.CONTRIBUTOR && (
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Editar e visualizar eventos
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Email & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                    {t('timeboardSettings.entities.form.emailLabel') || 'Endereço de Email'}
                  </label>
                  <input
                    type="email"
                    value={entityForm.email}
                    onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })}
                    placeholder={t('timeboardSettings.entities.form.emailPlaceholder') || 'Ex: utilizador@exemplo.com'}
                    style={{
                      background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                      borderRadius: '10px',
                      padding: '11px 14px',
                      color: 'var(--text-main, #fff)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                    {t('timeboardSettings.entities.form.phoneLabel') || 'Telefone'}
                  </label>
                  <input
                    type="tel"
                    value={entityForm.phone}
                    onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })}
                    placeholder={t('timeboardSettings.entities.form.phonePlaceholder') || 'Ex: +351 912 345 678'}
                    style={{
                      background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                      borderRadius: '10px',
                      padding: '11px 14px',
                      color: 'var(--text-main, #fff)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Tax ID */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                  {t('timeboardSettings.entities.form.taxIdLabel') || 'NIF / CPF / Documento Fiscal'}
                </label>
                <input
                  type="text"
                  value={entityForm.taxId}
                  onChange={(e) => setEntityForm({ ...entityForm, taxId: e.target.value })}
                  placeholder={t('timeboardSettings.entities.form.taxIdPlaceholder') || 'Ex: 123456789'}
                  style={{
                    background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: 'var(--text-main, #fff)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Linked Account Status & Unlink Action (Inside Form) */}
              {editingEntity && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted, #94a3b8)' }}>
                    Conta de Utilizador
                  </label>
                  {editingEntity.userId || editingEntity.user_id ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
                            Conta Vinculada
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            ID: {editingEntity.userId || editingEntity.user_id}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleUnlinkUser(editingEntity);
                          setIsEntityModalOpen(false);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Desvincular Conta
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-app, rgba(255, 255, 255, 0.02))',
                        border: '1px dashed var(--border-glass, rgba(255, 255, 255, 0.12))',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <UserX size={14} />
                      <span>Nenhuma conta de utilizador vinculada a este registo.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEntityModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                    color: 'var(--text-muted)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('timeboardSettings.entities.form.cancelButton') || 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEntity || !entityForm.name.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: isSavingEntity ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  {t('timeboardSettings.entities.form.saveButton') || 'Guardar Entidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 Modal de Envio de Convite para Membros */}
      {isInviteModalOpen && invitingPerson && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 18, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            className="modal-container"
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--bg-card, #111827)',
              border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: 'var(--shadow-sm, 0 25px 50px -12px rgba(0, 0, 0, 0.7))',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(139, 92, 246, 0.35)'
                  }}
                >
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main, #ffffff)', margin: 0 }}>
                    {t('timeboardSettings.entities.inviteModal.title') || 'Enviar Convite de Acesso'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', margin: 0, marginTop: '2px' }}>
                    {t('timeboardSettings.entities.inviteModal.subtitle') || 'Convide este membro para aceder ao Timeboard'} <strong style={{ color: 'var(--text-main, #fff)' }}>{timeboard?.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Member Card Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-app, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '800'
                  }}
                >
                  {invitingPerson.name ? invitingPerson.name.substring(0, 2).toUpperCase() : 'MB'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main, #ffffff)' }}>
                    {invitingPerson.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {invitingPerson.taxId || invitingPerson.tax_id || 'Membro do Timeboard'}
                  </span>
                </div>
              </div>

              <span
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c084fc',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '700'
                }}
              >
                Membro
              </span>
            </div>

            <form onSubmit={handleConfirmSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email Input */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('timeboardSettings.entities.inviteModal.emailLabel') || 'Endereço de Email do Membro *'}</span>
                  {isValidEmail(inviteEmail) ? (
                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={13} /> Email válido
                    </span>
                  ) : inviteEmail.trim() ? (
                    <span style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: '600' }}>
                      Email inválido
                    </span>
                  ) : null}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="exemplo@empresa.com"
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                      border: isValidEmail(inviteEmail)
                        ? '1px solid #10b981'
                        : '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                      borderRadius: '10px',
                      padding: '11px 14px 11px 38px',
                      color: 'var(--text-main, #fff)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main, #e2e8f0)' }}>
                  {t('timeboardSettings.entities.inviteModal.roleLabel') || 'Função / Permissão a Conceder'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Contributor Option */}
                  <div
                    onClick={() => setInviteRole(PersonRole.CONTRIBUTOR)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: inviteRole === PersonRole.CONTRIBUTOR ? '1.5px solid #6366f1' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: inviteRole === PersonRole.CONTRIBUTOR ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-app, rgba(255, 255, 255, 0.02))',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: inviteRole === PersonRole.CONTRIBUTOR ? '0 0 16px rgba(99, 102, 241, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc', fontWeight: '700', fontSize: '0.86rem' }}>
                        <Users size={15} />
                        <span>{t('timeboardSettings.entities.roles.contributor') || 'Colaborador'}</span>
                      </div>
                      {inviteRole === PersonRole.CONTRIBUTOR && (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Editar & visualizar eventos
                    </span>
                  </div>

                  {/* Admin Option */}
                  <div
                    onClick={() => setInviteRole(PersonRole.ADMIN)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: inviteRole === PersonRole.ADMIN ? '1.5px solid #f59e0b' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: inviteRole === PersonRole.ADMIN ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-app, rgba(255, 255, 255, 0.02))',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: inviteRole === PersonRole.ADMIN ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '700', fontSize: '0.86rem' }}>
                        <Crown size={15} />
                        <span>{t('timeboardSettings.entities.roles.admin') || 'Administrador'}</span>
                      </div>
                      {inviteRole === PersonRole.ADMIN && (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Acesso total e gestão
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                    color: 'var(--text-muted)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('timeboardSettings.entities.form.cancelButton') || 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite || !isValidEmail(inviteEmail)}
                  style={{
                    background: isValidEmail(inviteEmail)
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: isValidEmail(inviteEmail) ? '#ffffff' : 'var(--text-muted)',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: (!isValidEmail(inviteEmail) || isSendingInvite) ? 'not-allowed' : 'pointer',
                    boxShadow: isValidEmail(inviteEmail) ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Send size={15} />
                  <span>{isSendingInvite ? 'A enviar...' : (t('timeboardSettings.entities.inviteModal.sendButton') || 'Enviar Convite')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Filter Pill Button Component
 */
function FilterPill({ active, onClick, icon, label, count, activeColor = '#6366f1' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: active ? `1px solid ${activeColor}` : '1px solid var(--border-glass)',
        background: active ? `${activeColor}18` : 'var(--bg-card, rgba(255, 255, 255, 0.03))',
        color: active ? activeColor : 'var(--text-muted)',
        fontSize: '0.8rem',
        fontWeight: active ? '700' : '500',
        cursor: 'pointer',
        boxShadow: active ? `0 0 10px ${activeColor}22` : 'none',
        transition: 'all 0.15s ease'
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: '700',
          padding: '1px 6px',
          borderRadius: '999px',
          background: active ? activeColor : 'var(--bg-app, rgba(255, 255, 255, 0.08))',
          color: active ? '#ffffff' : 'var(--text-muted)'
        }}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Custom Floating Role Dropdown for Table Rows
 */
function CustomRoleDropdown({ currentRole, onChange, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const isAdmin = currentRole === PersonRole.ADMIN;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (role) => {
    onChange(role);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 100 : 'auto' }}>
      {/* Trigger Button - Plain clean text without badge styling */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 0',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontSize: '0.84rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--primary, #6366f1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-main)';
        }}
      >
        <span>{isAdmin ? (t('timeboardSettings.entities.roles.admin') || 'Administrador') : (t('timeboardSettings.entities.roles.contributor') || 'Colaborador')}</span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'var(--text-muted)'
          }}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1400,
            minWidth: '210px',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.18))',
            borderRadius: '12px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.15)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            backdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Admin Option */}
          <div
            onClick={() => handleSelect(PersonRole.ADMIN)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: isAdmin ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Crown size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: isAdmin ? '#fbbf24' : 'var(--text-main, #fff)' }}>
                  {t('timeboardSettings.entities.roles.admin') || 'Administrador'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Acesso total
                </span>
              </div>
            </div>
            {isAdmin && <Check size={15} style={{ color: '#fbbf24' }} />}
          </div>

          {/* Contributor Option */}
          <div
            onClick={() => handleSelect(PersonRole.CONTRIBUTOR)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: !isAdmin ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Users size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: !isAdmin ? '#a5b4fc' : 'var(--text-main, #fff)' }}>
                  {t('timeboardSettings.entities.roles.contributor') || 'Colaborador'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Editar & Visualizar
                </span>
              </div>
            </div>
            {!isAdmin && <Check size={15} style={{ color: '#818cf8' }} />}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 14px',
        borderRadius: '10px',
        border: 'none',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: active ? 'var(--primary-light, #818cf8)' : 'var(--text-muted, #94a3b8)',
        fontSize: '0.88rem',
        fontWeight: active ? '700' : '500',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span>{label}</span>
      </div>
      {badge !== null && badge !== undefined && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            background: active ? 'var(--primary, #6366f1)' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            padding: '1px 7px',
            borderRadius: '999px'
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
