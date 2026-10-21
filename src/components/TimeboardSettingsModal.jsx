import React, { useState, useEffect, useRef } from 'react';
import PlanUsageBanner from './PlanUsageBanner.jsx';
import UnitImportPanel from './UnitImportPanel.jsx';
import PeopleTab from './settings/PeopleTab.jsx';
import { DATA_EXPORT_ENABLED, UNIT_IMPORT_ENABLED } from '../../shared/config/featureFlags.js';
import DataExportCard from './DataExportCard.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';
import AuditHistoryTab from './settings/AuditHistoryTab.jsx';
import {
  X,
  Settings,
  Sliders,
  Users,
  FileText,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Check,
  UserCheck,
  RefreshCw,
  Calendar,
  Bold,
  Italic,
  Strikethrough,
  Home,
  DollarSign,
  PanelTop,
  ChevronsDownUp,
  ChevronsUpDown,
  History, FileUp, Wallet, Landmark } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PaymentChannel, PersonCategory, TimeboardType, HeaderDefaultState, TimelineColor, TimeboardSettingsTab, personCategoryOf } from '../enums/index.js';
import { buildPath, ProductPage } from '../app/routes.js';
import { productOfTimeboardType } from '../../shared/config/products.js';
import { OVERDUE_NOTICE_DAY } from '../../shared/config/notifications.js';

// Accounting start month (yyyy-MM) of a timeboard, '' when it counts from the beginning
const startMonthOf = (timeboard) => {
  const raw = String(timeboard?.computeFrom || timeboard?.compute_from || '');
  return !raw || raw.startsWith('1900') ? '' : raw.substring(0, 7);
};
import * as api from '../services/api.js';
import MonthPickerPopover from './ui/MonthPickerPopover.jsx';
import CopyIdButton from './ui/CopyIdButton.jsx';
import OptionBoxGroup from './ui/OptionBoxGroup.jsx';
import TimeboardReportsTab from './reports/TimeboardReportsTab.jsx';

const TIMEBOARD_TYPE_TEMPLATES = {
  [TimeboardType.CONDOFLOW]: {
    icon: Home,
    color: TimelineColor.CONDOFLOW,
    titleKey: 'templateCondoflow',
    descKey: 'templateCondoflowDesc'
  },
  [TimeboardType.FINANCIAL]: {
    icon: DollarSign,
    color: TimelineColor.FINANCIAL,
    titleKey: 'templateFinancial',
    descKey: 'templateFinancialDesc'
  },
  [TimeboardType.EMPTY]: {
    icon: Plus,
    color: TimelineColor.EMPTY,
    titleKey: 'templateEmpty',
    descKey: 'templateEmptyDesc'
  }
};

export default function TimeboardSettingsModal({
  isOpen,
  onClose,
  timeboard,
  onSaveTimeboard,
  onDeleteTimeboard,
  onEntitySaved,
  timelines = [],
  events = [],
  pockets = [],
  initialTab = TimeboardSettingsTab.GENERAL
}) {
  const { t, dateLocale } = useTranslation();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  // Markdown conversion functions for print_template rich text editor
  const markdownToHtml = (md) => {
    if (!md) return '';
    let html = String(md)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  const htmlToMarkdown = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    function traverse(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        let inner = '';
        node.childNodes.forEach((child) => { inner += traverse(child); });
        if (tag === 'strong' || tag === 'b' || node.style?.fontWeight === 'bold' || Number(node.style?.fontWeight) >= 700) return inner ? `**${inner}**` : '';
        if (tag === 'em' || tag === 'i' || node.style?.fontStyle === 'italic') return inner ? `*${inner}*` : '';
        if (tag === 'del' || tag === 's' || tag === 'strike' || node.style?.textDecoration?.includes('line-through')) return inner ? `~~${inner}~~` : '';
        if (tag === 'br') return '\n';
        if (tag === 'div' || tag === 'p') return inner ? `\n${inner}` : '';
        return inner;
      }
      return '';
    }

    return traverse(tempDiv).replace(/^\n+/, '');
  };

  // Print template rich text editor formatting
  const applyPrintTemplateFormatting = (formatType) => {
    if (!printTemplateEditorRef.current) return;
    printTemplateEditorRef.current.focus();

    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'normal':
        document.execCommand('removeFormat', false, null);
        break;
      default:
        break;
    }

    handlePrintTemplateInput();
  };

  const handlePrintTemplateInput = () => {
    if (!printTemplateEditorRef.current) return;
    const plainText = printTemplateEditorRef.current.innerText || '';
    const currentLen = plainText.length;
    setPrintTemplateCharCount(currentLen);

    const md = htmlToMarkdown(printTemplateEditorRef.current.innerHTML);
    setGeneralForm((prev) => ({ ...prev, print_template: md }));
  };

  const handlePrintTemplatePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
    handlePrintTemplateInput();
  };

  // Active tab (contributors only see the reports; admins also see the change history)
  const { canManage } = usePermissions();
  const [userSelectedTab, setUserSelectedTab] = useState(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setUserSelectedTab(null);
    }
  }

  const currentTab = userSelectedTab ?? initialTab ?? TimeboardSettingsTab.GENERAL;
  const activeTab = canManage ? currentTab : TimeboardSettingsTab.REPORTS;
  const setActiveTab = setUserSelectedTab;

  // General tab form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    description: '',
    type: TimeboardType.FINANCIAL,
    print_template: '',
    // Condominiums: accounting start month (yyyy-MM), base monthly fee and where fees are received
    startMonth: '',
    baseFeeAmount: '',
    feeChannel: PaymentChannel.CASH,
    // Condominiums: owners' notices (receipt, monthly overdue fees)
    notifyReceipts: false,
    notifyOverdue: false
  });
  const [noticeStats, setNoticeStats] = useState(null);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSaveSuccess, setGeneralSaveSuccess] = useState(false);

  // Print template rich text editor state
  const printTemplateEditorRef = useRef(null);
  const [printTemplateCharCount, setPrintTemplateCharCount] = useState(0);
  const MAX_PRINT_TEMPLATE_LENGTH = 500;

  // Settings tab form state (Compute From)
  const [computeMode, setComputeMode] = useState('all'); // 'all' | 'current' | 'custom'
  const [headerDefaultState, setHeaderDefaultState] = useState(HeaderDefaultState.COLLAPSED);
  const [customComputeMonth, setCustomComputeMonth] = useState(currentMonthKey);
  const [isCustomMonthPickerOpen, setIsCustomMonthPickerOpen] = useState(false);
  const [customMonthPickerYear, setCustomMonthPickerYear] = useState(() => new Date().getFullYear());
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // People of the timeboard (entities / units / members tabs) and its invitations
  const [persons, setPersons] = useState([]);
  // Condominiums: panel that imports units from a spreadsheet
  const [isUnitImportOpen, setIsUnitImportOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync state when timeboard or isOpen changes
  useEffect(() => {
    if (isOpen && timeboard) {
      const printTemplateMd = timeboard.printTemplate ?? timeboard.print_template ?? '';
      setGeneralForm({
        name: timeboard.name || '',
        description: timeboard.description || '',
        type: timeboard.type || TimeboardType.FINANCIAL,
        print_template: printTemplateMd,
        startMonth: startMonthOf(timeboard),
        baseFeeAmount: timeboard.baseFeeAmount ?? '',
        feeChannel: timeboard.feeChannel || PaymentChannel.CASH,
        notifyReceipts: Boolean(timeboard.notifyReceipts),
        notifyOverdue: Boolean(timeboard.notifyOverdue)
      });
      if (timeboard.type === TimeboardType.CONDOFLOW) api.fetchCondoNoticeStats(timeboard.id).then(setNoticeStats).catch(() => setNoticeStats(null));

      setHeaderDefaultState(timeboard.headerDefaultState === HeaderDefaultState.EXPANDED ? HeaderDefaultState.EXPANDED : HeaderDefaultState.COLLAPSED);

      const rawCompute = timeboard.computeFrom || timeboard.compute_from;
      if (!rawCompute || rawCompute === '1900-01-01' || rawCompute === '1900-01') {
        setComputeMode('all');
        setCustomComputeMonth(currentMonthKey);
        setCustomMonthPickerYear(new Date().getFullYear());
      } else {
        const monthKey = String(rawCompute).substring(0, 7);
        const [y] = monthKey.split('-').map(Number);
        if (!isNaN(y)) setCustomMonthPickerYear(y);
        if (monthKey === currentMonthKey) {
          setComputeMode('current');
          setCustomComputeMonth(currentMonthKey);
        } else {
          setComputeMode('custom');
          setCustomComputeMonth(monthKey);
        }
      }

      loadPersons(timeboard.id);
    }
  }, [isOpen, timeboard?.id, activeTab, timeboard?.printTemplate, timeboard?.print_template]);

  // Initialize print template editor when ref is available and tab is general
  useEffect(() => {
    if (isOpen && activeTab === TimeboardSettingsTab.GENERAL && printTemplateEditorRef.current) {
      const printTemplateMd = generalForm.print_template || timeboard?.printTemplate || timeboard?.print_template || '';
      printTemplateEditorRef.current.innerHTML = markdownToHtml(printTemplateMd);
      const plainText = printTemplateEditorRef.current.innerText || '';
      setPrintTemplateCharCount(plainText.length);
    }
  }, [isOpen, activeTab, timeboard?.id, timeboard?.printTemplate, timeboard?.print_template]);

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

  // Esc closes the innermost open layer first (invitation, entity form, month picker), then the settings modal
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isCustomMonthPickerOpen) {
        setIsCustomMonthPickerOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCustomMonthPickerOpen, onClose]);

  if (!isOpen || !timeboard) return null;

  // Handler: Save General Info
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!generalForm.name.trim()) return;
    setIsSavingGeneral(true);
    try {
      const printVal = generalForm.print_template?.trim() || '';
      await onSaveTimeboard({
        ...timeboard,
        name: generalForm.name.trim(),
        description: generalForm.description.trim(),
        print_template: printVal,
        printTemplate: printVal,
        // Condominiums: accounting start date (mandatory), base fee and fee channel
        ...(timeboard.type === TimeboardType.CONDOFLOW ? {
          computeFrom: generalForm.startMonth ? `${generalForm.startMonth}-01` : (timeboard.computeFrom || null),
          compute_from: generalForm.startMonth ? `${generalForm.startMonth}-01` : (timeboard.compute_from || null),
          baseFeeAmount: generalForm.baseFeeAmount === '' ? null : Number(String(generalForm.baseFeeAmount).replace(',', '.')),
          feeChannel: generalForm.feeChannel,
          notifyReceipts: generalForm.notifyReceipts,
          notifyOverdue: generalForm.notifyOverdue
        } : {})
      });
      setGeneralSaveSuccess(true);
      setTimeout(() => setGeneralSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save timeboard:', err);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Handler: Save Settings Tab (Compute From)
  const handleSaveSettings = async (e) => {
    e?.preventDefault?.();
    setIsSavingSettings(true);

    let finalComputeFrom = '1900-01-01';
    if (computeMode === 'current') {
      finalComputeFrom = `${currentMonthKey}-01`;
    } else if (computeMode === 'custom') {
      finalComputeFrom = customComputeMonth ? `${customComputeMonth}-01` : '1900-01-01';
    }

    try {
      await onSaveTimeboard({
        ...timeboard,
        ...(timeboard.type === TimeboardType.CONDOFLOW ? {} : { computeFrom: finalComputeFrom, compute_from: finalComputeFrom }),
        headerDefaultState
      });
      setSettingsSaveSuccess(true);
      showToast(t('timeboardSettings.settingsTab.computeFromSavedToast'));
      setTimeout(() => setSettingsSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save timeboard settings:', err);
      showToast(err.message || t('timeboardSettings.settingsTab.saveFailedToast'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handler: Delete Timeboard
  const handleDeleteTimeboard = () => {
    if (onDeleteTimeboard) {
      onDeleteTimeboard(timeboard.id);
      onClose();
    }
  };

  // Condominiums split people into units, entities and members (each in its own tab)
  const isCondominium = timeboard.type === TimeboardType.CONDOFLOW;
  const currentUser = api.getCurrentUser();
  const peopleCount = (category) => persons.filter((p) => personCategoryOf(p) === category).length;
  // Plans page of the timeboard's product (/condoflow/planos)
  const plansPath = buildPath({ product: productOfTimeboardType(timeboard.type), page: ProductPage.PLANS });
  const peopleTabProps = { timeboard, persons, setPersons, invitations, isLoading: isLoadingPersons, onReload: () => loadPersons(timeboard.id), onEntitySaved, showToast };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--overlay-backdrop)',
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
          box-shadow: var(--shadow-sm);
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
          background: var(--bg-app);
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
          background: var(--bg-card-hover) !important;
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
              background: `linear-gradient(135deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.SUCCESS} 100%)`,
              color: 'var(--text-white)',
              padding: '10px 18px',
              borderRadius: '10px',
              boxShadow: `0 10px 25px ${TimelineColor.SUCCESS}66`,
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
                background: `linear-gradient(135deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.VIOLET} 100%)`,
                color: 'var(--text-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 14px ${TimelineColor.PRIMARY}59`,
                flexShrink: 0
              }}
            >
              <Settings size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {t('timeboardSettings.modalTitle')}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t('timeboardSettings.modalSubtitle')}
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
              e.currentTarget.style.background = `${TimelineColor.DANGER}26`;
              e.currentTarget.style.color = TimelineColor.DANGER;
              e.currentTarget.style.borderColor = `${TimelineColor.DANGER}4c`;
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
            {canManage && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.GENERAL}
              onClick={() => setActiveTab(TimeboardSettingsTab.GENERAL)}
              icon={<Sliders size={18} />}
              label={t('timeboardSettings.tabs.general')}
            />
            )}
            {canManage && isCondominium && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.UNITS}
              onClick={() => setActiveTab(TimeboardSettingsTab.UNITS)}
              icon={<Home size={18} />}
              label={t('people.tabs.units')}
              badge={peopleCount(PersonCategory.UNIT) || null}
            />
            )}
            {canManage && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.ENTITIES}
              onClick={() => setActiveTab(TimeboardSettingsTab.ENTITIES)}
              icon={<Users size={18} />}
              label={isCondominium ? t('people.tabs.entities') : t('timeboardSettings.tabs.entities')}
              badge={(isCondominium ? peopleCount(PersonCategory.ENTITY) : persons.length) || null}
            />
            )}
            {canManage && isCondominium && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.MEMBERS}
              onClick={() => setActiveTab(TimeboardSettingsTab.MEMBERS)}
              icon={<UserCheck size={18} />}
              label={t('people.tabs.members')}
              badge={peopleCount(PersonCategory.MEMBER) || null}
            />
            )}
            <TabButton
              active={activeTab === TimeboardSettingsTab.REPORTS}
              onClick={() => setActiveTab(TimeboardSettingsTab.REPORTS)}
              icon={<FileText size={18} />}
              label={t('timeboardSettings.tabs.reports')}
            />
            {canManage && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.HISTORY}
              onClick={() => setActiveTab(TimeboardSettingsTab.HISTORY)}
              icon={<History size={18} />}
              label={t('auditLog.tab')}
            />
            )}
            {canManage && (
            <TabButton
              active={activeTab === TimeboardSettingsTab.SETTINGS}
              onClick={() => setActiveTab(TimeboardSettingsTab.SETTINGS)}
              icon={<Settings size={18} />}
              label={t('timeboardSettings.tabs.settings')}
            />
            )}
          </div>

          {/* Tab Content Area */}
          <div className="tb-main-content">
            {/* TAB 1: GERAL */}
            {activeTab === TimeboardSettingsTab.GENERAL && (
              <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {t('timeboardSettings.general.title')}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {t('timeboardSettings.general.subtitle')}
                  </p>
                </div>

                {/* CondoFlow license: plan in force, usage and the way to upgrade */}
                {isCondominium && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <PlanUsageBanner timeboardId={timeboard.id} refreshKey={persons.length} />
                    <a href={plansPath} style={{ alignSelf: 'flex-start', fontSize: '0.82rem', fontWeight: 700, color: TimelineColor.CONDOFLOW }}>{t('plans.upgrade')}</a>
                  </div>
                )}

                <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Name */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t('timeboardSettings.general.nameLabel')}
                      {timeboard.id && <CopyIdButton id={timeboard.id} />}
                    </label>
                    <input
                      type="text"
                      required
                      value={generalForm.name}
                      onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                      placeholder={t('timeboardSettings.general.namePlaceholder')}
                      className="form-control"
                      style={{
                        background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Description / Condo Name */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {generalForm.type === TimeboardType.CONDOFLOW
                        ? (t('timeboardSettings.general.condoNameLabel'))
                        : (t('timeboardSettings.general.descriptionLabel'))}
                    </label>
                    <input
                      type="text"
                      value={generalForm.description}
                      onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                      placeholder={generalForm.type === TimeboardType.CONDOFLOW
                        ? (t('timeboardSettings.general.condoNamePlaceholder'))
                        : (t('timeboardSettings.general.descriptionPlaceholder'))}
                      maxLength={generalForm.type === TimeboardType.CONDOFLOW ? 100 : undefined}
                      className="form-control"
                      style={{
                        background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--text-main)',
                        fontSize: '0.92rem',
                        resize: 'vertical'
                      }}
                    />
                    {generalForm.type === TimeboardType.CONDOFLOW && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {generalForm.description?.length || 0}/100
                      </span>
                    )}
                  </div>

                  {/* Condominiums: accounting start date (mandatory), base monthly fee and where fees are received */}
                  {isCondominium && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{t('condoSettings.startDateLabel')}</label>
                          <input
                            type="month"
                            required
                            value={generalForm.startMonth}
                            onChange={(e) => setGeneralForm({ ...generalForm, startMonth: e.target.value })}
                            className="form-control"
                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-main)', fontSize: '0.92rem' }}
                          />
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t('condoSettings.startDateHelp')}</span>
                        </div>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{t('condoSettings.baseFeeLabel')}</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={generalForm.baseFeeAmount}
                            onChange={(e) => setGeneralForm({ ...generalForm, baseFeeAmount: e.target.value })}
                            placeholder={t('condoSettings.baseFeePlaceholder')}
                            className="form-control"
                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-main)', fontSize: '0.92rem' }}
                          />
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t('condoSettings.baseFeeHelp')}</span>
                        </div>
                      </div>
                      <OptionBoxGroup
                        label={t('condoSettings.feeChannelLabel')}
                        options={[
                          { id: PaymentChannel.CASH, label: t('condoSettings.feeChannel.cash'), icon: Wallet, color: TimelineColor.CONDOFLOW },
                          { id: PaymentChannel.BANK, label: t('condoSettings.feeChannel.bank'), icon: Landmark, color: TimelineColor.INVESTMENT }
                        ]}
                        value={generalForm.feeChannel}
                        onChange={(feeChannel) => setGeneralForm({ ...generalForm, feeChannel })}
                        marginBottom="0"
                      />

                      {/* Owners' notices: receipt and monthly overdue fees (push with the app, e-mail otherwise) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{t('condoSettings.noticesTitle')}</strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{t('condoSettings.noticesHelp')}</span>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={generalForm.notifyReceipts} onChange={(e) => setGeneralForm({ ...generalForm, notifyReceipts: e.target.checked })} />
                          {t('condoSettings.notifyReceipts')}
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={generalForm.notifyOverdue} onChange={(e) => setGeneralForm({ ...generalForm, notifyOverdue: e.target.checked })} />
                          {t('condoSettings.notifyOverdue', { day: OVERDUE_NOTICE_DAY })}
                        </label>
                        {noticeStats && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t('condoSettings.emailsThisMonth', { count: noticeStats.sentThisMonth })}</span>}
                      </div>
                    </>
                  )}

                  {/* Timeboard Type */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {t('timeboardSettings.general.typeLabel')}
                    </label>

                    {(() => {
                      const tmpl = TIMEBOARD_TYPE_TEMPLATES[generalForm.type] || TIMEBOARD_TYPE_TEMPLATES[TimeboardType.FINANCIAL];
                      const Icon = tmpl.icon;
                      return (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `2px solid ${tmpl.color}`,
                            background: `${tmpl.color}1f`,
                            color: 'var(--text-main)',
                            maxWidth: '320px',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <div style={{ background: tmpl.color, padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={18} style={{ color: TimelineColor.WHITE }} />
                            </div>
                            <span style={{ fontWeight: '700', color: tmpl.color, fontSize: '0.88rem' }}>
                              {t(`timeboardModal.${tmpl.titleKey}`)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: '400', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            {t(`timeboardModal.${tmpl.descKey}`)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Print Template Rich Text Editor */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {t('timeboardSettings.general.printTemplateLabel')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      {/* Toolbar */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          background: 'var(--bg-app)',
                          padding: '2px 4px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          alignSelf: 'flex-end'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => applyPrintTemplateFormatting('bold')}
                          title={t('diaryModal.bold')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            padding: '4px 7px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Bold size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPrintTemplateFormatting('italic')}
                          title={t('diaryModal.italic')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            padding: '4px 7px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Italic size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPrintTemplateFormatting('strikethrough')}
                          title={t('diaryModal.strikethrough')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            padding: '4px 7px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Strikethrough size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPrintTemplateFormatting('normal')}
                          title={t('diaryModal.normal')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: '700'
                          }}
                        >
                          {t('diaryModal.normal')}
                        </button>
                      </div>

                      {/* Editor */}
                      <div style={{ position: 'relative', marginTop: '8px' }}>
                        <div
                          ref={printTemplateEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={handlePrintTemplateInput}
                          onPaste={handlePrintTemplatePaste}
                          style={{
                            minHeight: '100px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            background: 'var(--bg-card-hover)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: 'var(--text-main)',
                            fontSize: '0.88rem',
                            lineHeight: '1.6',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        {!printTemplateCharCount && (
                          <div
                            onClick={() => printTemplateEditorRef.current?.focus()}
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '14px',
                              color: 'var(--text-dim)',
                              fontSize: '0.86rem',
                              pointerEvents: 'none',
                              userSelect: 'none'
                            }}
                          >
                            {t('timeboardSettings.general.printTemplatePlaceholder')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Character counter */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: printTemplateCharCount > MAX_PRINT_TEMPLATE_LENGTH * 0.9 ? TimelineColor.WARNING : 'var(--text-dim)',
                        marginTop: '2px'
                      }}
                    >
                      <span>
                        {t('timeboardSettings.general.printTemplateCount', { count: printTemplateCharCount, max: MAX_PRINT_TEMPLATE_LENGTH })}
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
                          ? `linear-gradient(135deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.SUCCESS} 100%)`
                          : `linear-gradient(135deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY} 100%)`,
                        color: 'var(--text-white)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 24px',
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        cursor: isSavingGeneral ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 14px ${TimelineColor.PRIMARY}59`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {generalSaveSuccess ? <CheckCircle2 size={16} /> : null}
                      <span>{generalSaveSuccess ? t('timeboardSettings.general.savedButton') : t('timeboardSettings.general.saveButton')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* People: condominiums have units, entities and members; other timeboards one list */}
            {activeTab === TimeboardSettingsTab.UNITS && isCondominium && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {UNIT_IMPORT_ENABLED && (isUnitImportOpen ? (
                  <UnitImportPanel timeboardId={timeboard.id} onImported={() => loadPersons(timeboard.id)} onClose={() => setIsUnitImportOpen(false)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsUnitImportOpen(true)}
                    style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    <FileUp size={15} />{t('unitImport.open')}
                  </button>
                ))}
                <PeopleTab {...peopleTabProps} category={PersonCategory.UNIT} />
              </div>
            )}
            {activeTab === TimeboardSettingsTab.ENTITIES && (
              <PeopleTab {...peopleTabProps} category={isCondominium ? PersonCategory.ENTITY : undefined} />
            )}
            {activeTab === TimeboardSettingsTab.MEMBERS && isCondominium && (
              <PeopleTab {...peopleTabProps} category={PersonCategory.MEMBER} />
            )}

            {/* TAB: RELATÓRIOS / REPORTS */}
            {activeTab === TimeboardSettingsTab.REPORTS && (
              <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {t('timeboardSettings.reports.title')}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {t('timeboardSettings.reports.subtitle')}
                  </p>
                </div>
                <TimeboardReportsTab
                  timeboard={timeboard}
                  timelines={timelines}
                  events={events}
                  pockets={pockets}
                  persons={persons}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* TAB: HISTÓRICO DE ALTERAÇÕES (admins) */}
            {activeTab === TimeboardSettingsTab.HISTORY && <AuditHistoryTab timeboardId={timeboard?.id} />}

            {/* TAB: CONFIGURAÇÕES DO TIMEBOARD (COMPUTE FROM) */}
            {activeTab === TimeboardSettingsTab.SETTINGS && (
              <form
                onSubmit={handleSaveSettings}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  maxWidth: '720px'
                }}
              >
                {/* Header da Aba */}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {t('timeboardSettings.settingsTab.title')}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('timeboardSettings.settingsTab.subtitle')}
                  </p>
                </div>

                {/* Data portability: download every record of the timeboard */}
                {DATA_EXPORT_ENABLED && <DataExportCard timeboardId={timeboard?.id} />}

                {/* Card de Configuração: Contar a partir de (Compute From) — condominiums set it in Geral (start date) */}
                {!isCondominium && (
                <div
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${TimelineColor.PRIMARY}26`,
                        border: `1px solid ${TimelineColor.PRIMARY}4c`,
                        color: TimelineColor.PRIMARY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {t('timeboardSettings.settingsTab.computeFromCardTitle')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        {t('timeboardSettings.settingsTab.computeFromCardDesc')}
                      </div>
                    </div>
                  </div>

                  {/* Opções de Seleção */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '4px' }}>
                    {/* Opção 1: Todo o Histórico */}
                    <div
                      onClick={() => setComputeMode('all')}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: computeMode === 'all'
                          ? `2px solid ${TimelineColor.PRIMARY}`
                          : '1px solid var(--border-glass)',
                        background: computeMode === 'all'
                          ? `${TimelineColor.PRIMARY}1f`
                          : 'var(--bg-app)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: '800', color: computeMode === 'all' ? TimelineColor.PRIMARY : 'var(--text-main)' }}>
                          {t('timeboardSettings.settingsTab.computeFromOptionAll')}
                        </span>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: computeMode === 'all' ? `4px solid ${TimelineColor.PRIMARY}` : '2px solid var(--text-dim)',
                            background: computeMode === 'all' ? 'var(--bg-card)' : 'transparent'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        1900-01-01
                      </span>
                    </div>

                    {/* Opção 2: Mês Atual */}
                    <div
                      onClick={() => setComputeMode('current')}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: computeMode === 'current'
                          ? `2px solid ${TimelineColor.PRIMARY}`
                          : '1px solid var(--border-glass)',
                        background: computeMode === 'current'
                          ? `${TimelineColor.PRIMARY}1f`
                          : 'var(--bg-app)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: '800', color: computeMode === 'current' ? TimelineColor.PRIMARY : 'var(--text-main)' }}>
                          {t('timeboardSettings.settingsTab.computeFromOptionCurrent', { month: currentMonthKey })}
                        </span>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: computeMode === 'current' ? `4px solid ${TimelineColor.PRIMARY}` : '2px solid var(--text-dim)',
                            background: computeMode === 'current' ? 'var(--bg-card)' : 'transparent'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {currentMonthKey}-01
                      </span>
                    </div>

                    {/* Opção 3: Mês Personalizado */}
                    <div
                      onClick={() => setComputeMode('custom')}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: computeMode === 'custom'
                          ? `2px solid ${TimelineColor.PRIMARY}`
                          : '1px solid var(--border-glass)',
                        background: computeMode === 'custom'
                          ? `${TimelineColor.PRIMARY}1f`
                          : 'var(--bg-app)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: '800', color: computeMode === 'custom' ? TimelineColor.PRIMARY : 'var(--text-main)' }}>
                          {t('timeboardSettings.settingsTab.computeFromOptionCustom')}
                        </span>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: computeMode === 'custom' ? `4px solid ${TimelineColor.PRIMARY}` : '2px solid var(--text-dim)',
                            background: computeMode === 'custom' ? 'var(--bg-card)' : 'transparent'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {customComputeMonth || currentMonthKey}
                      </span>
                    </div>
                  </div>

                  {/* Seletor do Mês Personalizado com MonthPickerPopover estilizado */}
                  {computeMode === 'custom' && (
                    <div style={{ marginTop: '6px' }}>
                      <MonthPickerPopover
                        value={customComputeMonth}
                        onChange={(month) => {
                          setCustomComputeMonth(month);
                          const [y] = month.split('-').map(Number);
                          if (!isNaN(y)) setCustomMonthPickerYear(y);
                        }}
                        accent={TimelineColor.PRIMARY}
                        dateLocale={dateLocale}
                        label={t('timeboardSettings.settingsTab.computeFromMonthLabel')}
                        isOpen={isCustomMonthPickerOpen}
                        onToggle={() => setIsCustomMonthPickerOpen(!isCustomMonthPickerOpen)}
                        year={customMonthPickerYear}
                        onYearChange={setCustomMonthPickerYear}
                        allowPast={true}
                      />
                    </div>
                  )}
                </div>
                )}

                {/* Card de Configuração: headers colapsados / expandidos por defeito */}
                <div
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--primary-glow)',
                        border: '1px solid var(--border-glass-glow)',
                        color: TimelineColor.PRIMARY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <PanelTop size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {t('timeboardSettings.settingsTab.headerDefaultStateTitle')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        {t('timeboardSettings.settingsTab.headerDefaultStateDesc')}
                      </div>
                    </div>
                  </div>
                  <OptionBoxGroup
                    options={[
                      { id: HeaderDefaultState.COLLAPSED, label: t('timeboardSettings.settingsTab.headerCollapsed'), icon: ChevronsDownUp, color: TimelineColor.PRIMARY },
                      { id: HeaderDefaultState.EXPANDED, label: t('timeboardSettings.settingsTab.headerExpanded'), icon: ChevronsUpDown, color: TimelineColor.PRIMARY }
                    ]}
                    value={headerDefaultState}
                    onChange={setHeaderDefaultState}
                    marginBottom="0"
                  />
                </div>

                {/* Botão Salvar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="btn btn-primary"
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isSavingSettings ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw size={15} className="spin-animation" />
                        <span>{t('timeboardSettings.settingsTab.savingButton')}</span>
                      </>
                    ) : settingsSaveSuccess ? (
                      <>
                        <Check size={15} />
                        <span>{t('timeboardSettings.settingsTab.computeFromSavedToast')}</span>
                      </>
                    ) : (
                      <>
                        <Settings size={15} />
                        <span>{t('timeboardSettings.settingsTab.saveButton')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Danger Zone - Delete Timeboard */}
                <div
                  style={{
                    marginTop: '24px',
                    padding: '20px 24px',
                    background: `${TimelineColor.DANGER}0a`,
                    border: `1px solid ${TimelineColor.DANGER}33`,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={22} style={{ color: TimelineColor.DANGER, flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: TimelineColor.DANGER }}>
                        {t('timeboardSettings.general.deleteTimeboardTitle')}
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {t('timeboardSettings.general.deleteTimeboardDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteTimeboard}
                    style={{
                      background: `${TimelineColor.DANGER}26`,
                      border: `1px solid ${TimelineColor.DANGER}4c`,
                      color: TimelineColor.DANGER,
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
                    <span>{t('timeboardSettings.general.deleteButton')}</span>
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </div>

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
        background: active ? `${TimelineColor.PRIMARY}26` : 'transparent',
        color: active ? 'var(--primary-light)' : 'var(--text-muted)',
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
            background: active ? 'var(--primary)' : 'var(--bg-app)',
            color: 'var(--text-white)',
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
