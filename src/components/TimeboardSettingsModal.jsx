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
  UserCheck
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PersonRole, PersonType, TimeboardType } from '../enums/index.js';
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
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
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
      const data = await api.fetchPersons(timeboardId);
      setPersons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load persons:', err);
      setPersons([]);
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
        type: PersonType.PERSON,
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
      role: entityForm.role || PersonRole.CONTRIBUTOR,
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

  // Handler: Send Invitation
  const handleSendInvite = (person) => {
    const targetEmail = person.email || person.name;
    showToast(`${t('timeboardSettings.entities.inviteSentToast') || 'Convite enviado com sucesso para'} ${targetEmail}!`);
  };

  // Filtered persons
  const filteredPersons = persons.filter((p) => {
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
        backgroundColor: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Full-Window Settings Container */}
      <div
        className="modal-container timeboard-settings-window"
        style={{
          width: '95vw',
          maxWidth: '1180px',
          height: '88vh',
          maxHeight: '840px',
          background: 'var(--bg-card, #111827)',
          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.12))',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
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
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Settings size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main, #ffffff)' }}>
                  {t('timeboardSettings.modalTitle') || 'Definições do Timeboard'}
                </h2>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--primary-light, #818cf8)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  {timeboard.name}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted, #94a3b8)' }}>
                {t('timeboardSettings.modalSubtitle') || 'Gerir parâmetros gerais, entidades e configurações deste timeboard'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
              color: 'var(--text-muted, #94a3b8)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs + Content Area */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Tabs Sidebar */}
          <div
            style={{
              width: '240px',
              borderRight: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
              padding: '20px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.15)'
            }}
          >
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
              label={t('timeboardSettings.tabs.entities') || 'Entidades'}
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
          <div
            style={{
              flex: 1,
              padding: '28px 36px',
              overflowY: 'auto',
              minHeight: 0,
              background: 'var(--bg-main, #0b0f19)'
            }}
          >
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

                  {/* Save Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="submit"
                      disabled={isSavingGeneral || !generalForm.name.trim()}
                      className="btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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

            {/* TAB 2: ENTIDADES */}
            {activeTab === 'entities' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Top Control Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
                      {t('timeboardSettings.entities.title') || 'Entidades & Membros da Equipa'}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                      {t('timeboardSettings.entities.subtitle') || 'Pessoas e empresas com acesso ou associadas a este timeboard'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '220px' }}>
                      <Search
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)'
                        }}
                      />
                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder={t('timeboardSettings.entities.searchPlaceholder') || 'Pesquisar por nome, email ou NIF...'}
                        style={{
                          width: '100%',
                          background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.12))',
                          borderRadius: '8px',
                          padding: '8px 12px 8px 34px',
                          fontSize: '0.84rem',
                          color: 'var(--text-main, #fff)'
                        }}
                      />
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
                        padding: '9px 18px',
                        fontSize: '0.86rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      <Plus size={16} />
                      <span>{t('timeboardSettings.entities.addEntityButton') || 'Adicionar Entidade'}</span>
                    </button>
                  </div>
                </div>

                {/* Entities List / Table */}
                {isLoadingPersons ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Carregando entidades...
                  </div>
                ) : filteredPersons.length === 0 ? (
                  <div
                    style={{
                      padding: '50px 20px',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--border-glass, rgba(255, 255, 255, 0.12))',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary-light, #818cf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Users size={28} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
                        {t('timeboardSettings.entities.emptyStateTitle') || 'Nenhuma entidade adicionada'}
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '420px' }}>
                        {t('timeboardSettings.entities.emptyStateDesc') || 'Adicione pessoas ou empresas para atribuir papéis (roles) e gerir responsabilidades na timeline.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEntityForm()}
                      style={{
                        marginTop: '8px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'var(--primary-light, #818cf8)',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} />
                      <span>{t('timeboardSettings.entities.addEntityButton') || 'Adicionar Entidade'}</span>
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'var(--bg-card, #111827)',
                      border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      borderRadius: '14px',
                      overflow: 'visible',
                      boxShadow: 'var(--shadow-sm)'
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
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.entity') || 'Nome / Entidade'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.type') || 'Tipo'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.role') || 'Função (Role)'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.contact') || 'Contacto'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.taxId') || 'NIF / Documento'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {t('timeboardSettings.entities.table.userAccount') || 'Conta'}
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'right' }}>
                            {t('timeboardSettings.entities.table.actions') || 'Ações'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPersons.map((p) => {
                          const isOrg = p.type === PersonType.ORGANIZATION;
                          const hasUserAccount = Boolean(p.userId || p.user_id);

                          return (
                            <tr
                              key={p.id}
                              style={{
                                borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.05))',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {/* Name + Icon */}
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: isOrg ? '8px' : '50%',
                                      background: isOrg
                                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                  >
                                    {isOrg ? <Building2 size={16} /> : <User size={16} />}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main, #fff)' }}>
                                      {p.name}
                                    </div>
                                    {p.email && (
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #94a3b8)' }}>
                                        {p.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Type */}
                              <td style={{ padding: '14px 18px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.76rem',
                                    fontWeight: '600',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: isOrg ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                    color: isOrg ? '#60a5fa' : '#34d399',
                                    border: `1px solid ${isOrg ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
                                  }}
                                >
                                  {isOrg ? (t('timeboardSettings.entities.types.organization') || 'Empresa') : (t('timeboardSettings.entities.types.person') || 'Pessoa')}
                                </span>
                              </td>

                              {/* Custom Role Dropdown */}
                              <td style={{ padding: '14px 18px' }}>
                                <CustomRoleDropdown
                                  currentRole={p.role || PersonRole.CONTRIBUTOR}
                                  onChange={(newRole) => handleChangeRole(p.id, newRole)}
                                  t={t}
                                />
                              </td>

                              {/* Contact */}
                              <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted, #cbd5e1)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {p.phone ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                                      {p.phone}
                                    </span>
                                  ) : null}
                                  {!p.phone && !p.email ? (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                  ) : null}
                                </div>
                              </td>

                              {/* Tax ID */}
                              <td style={{ padding: '14px 18px', fontSize: '0.84rem', color: 'var(--text-main, #e2e8f0)', fontFamily: 'monospace' }}>
                                {p.taxId || p.tax_id || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'inherit' }}>—</span>}
                              </td>

                              {/* User Account */}
                              <td style={{ padding: '14px 18px' }}>
                                {hasUserAccount ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.74rem',
                                      fontWeight: '600',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16, 185, 129, 0.25)'
                                    }}
                                  >
                                    <UserCheck size={12} />
                                    {t('timeboardSettings.entities.userAccountStatus.linked') || 'Vinculada'}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.74rem',
                                      color: 'var(--text-muted)',
                                      padding: '2px 6px'
                                    }}
                                  >
                                    {t('timeboardSettings.entities.userAccountStatus.noAccount') || 'Sem Conta'}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  {/* Send Invite */}
                                  <button
                                    type="button"
                                    onClick={() => handleSendInvite(p)}
                                    title={t('timeboardSettings.entities.sendInvite') || 'Enviar Convite'}
                                    style={{
                                      background: 'rgba(99, 102, 241, 0.1)',
                                      border: '1px solid rgba(99, 102, 241, 0.25)',
                                      color: 'var(--primary-light, #818cf8)',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <Send size={12} />
                                    <span>{t('timeboardSettings.entities.sendInvite') || 'Convite'}</span>
                                  </button>

                                  {/* Edit */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEntityForm(p)}
                                    title="Editar"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
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
                                    <Edit3 size={14} />
                                  </button>

                                  {/* Delete */}
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
                                    <Trash2 size={14} />
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
              maxWidth: '520px',
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
                      : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                    color: entityForm.type === PersonType.ORGANIZATION ? '#60a5fa' : '#34d399',
                    border: `1px solid ${entityForm.type === PersonType.ORGANIZATION ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {entityForm.type === PersonType.ORGANIZATION ? <Building2 size={18} /> : <User size={18} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main, #fff)' }}>
                    {editingEntity
                      ? (t('timeboardSettings.entities.editPersonTitle') || 'Editar Pessoa / Empresa')
                      : (t('timeboardSettings.entities.addPersonTitle') || 'Adicionar Pessoa / Empresa')}
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
              {/* Type Switcher (Person vs Organization) */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted, #94a3b8)' }}>
                  {t('timeboardSettings.entities.form.typeLabel') || 'Tipo de Entidade *'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, type: PersonType.PERSON })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: entityForm.type === PersonType.PERSON ? '1px solid #10b981' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: entityForm.type === PersonType.PERSON ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityForm.type === PersonType.PERSON ? '#34d399' : 'var(--text-muted)',
                      boxShadow: entityForm.type === PersonType.PERSON ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <User size={16} />
                    <span>{t('timeboardSettings.entities.types.person') || 'Pessoa'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, type: PersonType.ORGANIZATION })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: entityForm.type === PersonType.ORGANIZATION ? '1px solid #3b82f6' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                      background: entityForm.type === PersonType.ORGANIZATION ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityForm.type === PersonType.ORGANIZATION ? '#60a5fa' : 'var(--text-muted)',
                      boxShadow: entityForm.type === PersonType.ORGANIZATION ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Building2 size={16} />
                    <span>{t('timeboardSettings.entities.types.organization') || 'Empresa'}</span>
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

              {/* Role Selector (Premium Custom Cards Selector) */}
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

              {/* Tax ID (Full width since user_id is removed) */}
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
    </div>
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
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '8px',
          background: isAdmin ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
          border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
          color: isAdmin ? '#fbbf24' : '#a5b4fc',
          fontSize: '0.8rem',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: isOpen
            ? (isAdmin ? '0 0 12px rgba(245, 158, 11, 0.25)' : '0 0 12px rgba(99, 102, 241, 0.25)')
            : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {isAdmin ? <Crown size={13} style={{ color: '#f59e0b' }} /> : <Users size={13} style={{ color: '#818cf8' }} />}
        <span>{isAdmin ? (t('timeboardSettings.entities.roles.admin') || 'Administrador') : (t('timeboardSettings.entities.roles.contributor') || 'Colaborador')}</span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            marginLeft: '2px',
            opacity: 0.75
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
