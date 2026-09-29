import React from 'react';
import { ACCOUNT_MOVEMENT_ITEMS, OUTFLOW_TYPE_ITEMS } from './timelineFilterItems.js';
import { Bell, BookOpen, CheckSquare, ChevronDown, CreditCard, Filter, FolderKanban, Layers, ListTree, Landmark, Plus, ReceiptEuro, Scale, Search, Users, Wallet, X } from 'lucide-react';
import { EventStatus, TimeboardType, TimelineColor, TimelineType } from '../../enums/index.js';
import { getTimelineTypeDescription, getTimelineTypeLabelKey } from '../../utils/timelineConfig.jsx';
import { makeDiaryT } from '../../utils/diaryLabels.js';
import PeriodBadgeFilter from '../ui/PeriodBadgeFilter.jsx';
import SidebarToggleFilter from '../sidebar/SidebarToggleFilter.jsx';
import TimeboardSwitcher from '../sidebar/TimeboardSwitcher.jsx';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineSidebar({
  timeboards = [],
  activeTimeboard = null,
  activeTimeboardId = null,
  onSelectTimeboard,
  onOpenEditTimeboard,
  onOpenCreateTimeboard,
  onNavigateToHub,
  currentUser,
  activeFinancialTab,
  availableCategoryOptions,
  availableCreditOptions,
  availableExpenseCategoryItems,
  collapsedSections,
  getEntityIcon,
  getStatusFilterOptions,
  isCondoflow,
  isListView,
  isPeriodActive,
  isReadOnly,
  isTimelineDropdownOpen,
  onCreateTimeline,
  onNavigateToTimeline,
  onSelectFinancialTab,
  periodMonth,
  periodYear,
  periodYearOptions,
  renderFilterSwitch,
  searchQuery,
  selectAllExpenseCategories,
  selectAllStatuses,
  selectAllTimelines,
  selectedCategoryFilter,
  selectedEntityId,
  selectedExpenseCategories,
  selectedMovementTypes,
  selectedOutflowTypes,
  selectedStatusFilters,
  selectedTimelineIds,
  setIsTimelineDropdownOpen,
  setPeriodMonth,
  setPeriodYear,
  setSearchQuery,
  setSelectedCategoryFilter,
  setSelectedEntityId,
  setSelectedExpenseCategories,
  setSelectedMovementTypes,
  setSelectedOutflowTypes,
  t,
  timeline,
  timelineDropdownRef,
  timelineEntities,
  timelineOptions,
  timelines,
  toggleExpenseCategory,
  toggleSectionCollapse,
  toggleStatusFilter,
  toggleTimelineSelection
}) {
  return (
    <aside className="filter-sidebar">
      {/* 🧭 Unified Timeboard Workspace Header */}
      {timeboards && timeboards.length > 0 && (
        <TimeboardSwitcher
          timeboards={timeboards}
          activeTimeboard={activeTimeboard}
          activeTimeboardId={activeTimeboardId || activeTimeboard?.id}
          onSelectTimeboard={onSelectTimeboard}
          onOpenEditTimeboard={onOpenEditTimeboard}
          onOpenCreateTimeboard={onOpenCreateTimeboard}
          onNavigateToHub={onNavigateToHub}
          currentUser={currentUser}
        />
      )}

      {/* Minor Navigation label if no timeboard header */}
      {(!timeboards || timeboards.length === 0) && (
        <div className="sidebar-header-title">
          <Filter size={15} style={{ color: 'var(--primary-light)' }} />
          <span>{t('sidebar.filtersNavigation')}</span>
        </div>
      )}

      <div className="filter-sidebar-content">
        {/* 🌟 0. Timelines do Timeboard vindas da Base de Dados */}
        {((timelines && timelines.length > 0) || (timeline?.timelines && timeline.timelines.length > 0)) && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('timelines')}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronDown
                size={13}
                style={{
                  transform: collapsedSections['timelines'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease',
                  color: 'var(--text-muted)'
                }}
              />
              <span>{t('sidebar.timelines')}</span>
            </div>
            {onCreateTimeline && (
              <div ref={timelineDropdownRef} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setIsTimelineDropdownOpen((prev) => !prev)}
                  title={t('sidebar.newTimeline')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: TimelineColor.WHITE,
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: `0 2px 8px ${TimelineColor.PRIMARY}59`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={13} />
                  <span>{t('buttons.new')}</span>
                </button>

                {isTimelineDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      minWidth: '200px',
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '6px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    {timelineOptions.map((opt, optIdx) => (
                      <button
                        key={opt.key || `opt-${optIdx}`}
                        type="button"
                        onClick={() => {
                          setIsTimelineDropdownOpen(false);
                          if (onCreateTimeline) {
                            onCreateTimeline(opt.type);
                          }
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          background: 'transparent',
                          color: 'var(--text-main)',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${TimelineColor.PRIMARY}24`;
                          e.currentTarget.style.borderColor = `${TimelineColor.PRIMARY}4c`;
                          e.currentTarget.style.color = 'var(--primary-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-main)';
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {!collapsedSections['timelines'] && (
            <div className="sidebar-btn-group">
            {((timelines && timelines.length > 0) ? timelines : (timeline?.timelines || [])).map((tl, tlIdx) => {
              const isActive = activeFinancialTab === tl.id || timeline?.id === tl.id;
              const tlColor = tl.color;
              // The name is the user's; the type is the system's: its short description under the name,
              // its label in the tooltip
              const typeLabel = makeDiaryT(t, activeTimeboard?.type === TimeboardType.CONDOFLOW)(getTimelineTypeLabelKey(tl.type));
              const typeDescription = getTimelineTypeDescription(tl.type, activeTimeboard?.type, t);
              const getTimelineIcon = (type) => {
                switch (type) {
                  case TimelineType.INCOME:
                  case TimelineType.WALLET:
                    return <Wallet size={14} style={{ color: tlColor }} />;
                  case TimelineType.EXPENSE:
                    return <ReceiptEuro size={14} style={{ color: tlColor }} />;
                  case TimelineType.INVESTMENT:
                    return <Landmark size={14} style={{ color: tlColor }} />;
                  case TimelineType.LOAN:
                    return <CreditCard size={14} style={{ color: tlColor }} />;
                  case TimelineType.BALANCE:
                    return <Scale size={14} style={{ color: tlColor }} />;
                  case TimelineType.REMINDER:
                  case 'reminder':
                  case 'reminders':
                    return <Bell size={14} style={{ color: tlColor }} />;
                  case TimelineType.PROJECT:
                  case 'project':
                  case 'projects':
                    return <FolderKanban size={14} style={{ color: tlColor }} />;
                  case TimelineType.DIARY:
                  case 'diary':
                    return <BookOpen size={14} style={{ color: tlColor }} />;
                  case TimelineType.TODO:
                  case 'todo':
                  case 'todos':
                    return <CheckSquare size={14} style={{ color: tlColor }} />;
                  case TimelineType.FOLLOWUP:
                  case 'followup':
                  case 'followups':
                    return <ListTree size={14} style={{ color: tlColor }} />;
                  default:
                    return <Layers size={14} style={{ color: tlColor }} />;
                }
              };

              return (
                <button
                  key={tl.id || `tl-${tlIdx}`}
                  type="button"
                  className={`sidebar-filter-item ${isActive ? 'active' : ''}`}
                  title={typeLabel ? `${t('sidebar.timelineType')}: ${typeLabel}` : undefined}
                  onClick={() => {
                    if (onSelectFinancialTab) onSelectFinancialTab(tl.id);
                    if (onNavigateToTimeline) onNavigateToTimeline(tl.id);
                  }}
                  style={isActive ? {
                    borderColor: tlColor,
                    background: tlColor ? `${tlColor}20` : undefined,
                    color: tlColor
                  } : {}}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {getTimelineIcon(tl.type)}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                      <span style={{ fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tl.name}</span>
                      {typeDescription && (
                        <span style={{ fontSize: '0.66rem', fontWeight: '600', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {typeDescription}
                        </span>
                      )}
                    </span>
                  </div>
                  {isActive && <span style={{ fontSize: '0.75rem', color: tlColor }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* Period Filter (year / month) — for every user, individual members included */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSectionCollapse('period')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronDown
              size={13}
              style={{
                transform: collapsedSections['period'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.18s ease',
                color: 'var(--text-muted)'
              }}
            />
            <span>{t('sidebar.period')}</span>
          </div>
          {isPeriodActive && (
            <button
              type="button"
              className="sidebar-action-link"
              onClick={(e) => {
                e.stopPropagation();
                setPeriodYear('');
                setPeriodMonth('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: '700' }}
            >
              {t('buttons.all')}
            </button>
          )}
        </div>
        {!collapsedSections['period'] && (
          <PeriodBadgeFilter
            year={periodYear}
            month={periodMonth}
            years={periodYearOptions}
            onYearChange={setPeriodYear}
            onMonthChange={setPeriodMonth}
          />
        )}
      </div>

      {/* 1. Search Box */}
      <div className="sidebar-section">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('sidebar.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              if (!isListView && val.trim().length > 0) {
                window.scrollTo({ top: 0, behavior: 'instant' });
              }
              setSearchQuery(val);
            }}
            style={searchQuery ? { paddingRight: '30px' } : undefined}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title={t('sidebar.clearSearch')}
              aria-label={t('sidebar.clearSearch')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>


      {/* 3. Estado Filter (Multi-Selection) */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSectionCollapse('status')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronDown
              size={13}
              style={{
                transform: collapsedSections['status'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.18s ease',
                color: 'var(--text-muted)'
              }}
            />
            <span>{t('sidebar.status')}</span>
          </div>
          {selectedStatusFilters.length > 0 && (
            <button
              type="button"
              className="sidebar-action-link"
              onClick={(e) => {
                e.stopPropagation();
                selectAllStatuses();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                padding: 0,
                fontWeight: '700'
              }}
            >
              {t('buttons.all')}
            </button>
          )}
        </div>
        {!collapsedSections['status'] && (
          <div className="sidebar-btn-group">
            {getStatusFilterOptions().map((st, stIdx) => {
              const isAllOption = st.id === EventStatus.ALL;
              const isSelected = isAllOption ? selectedStatusFilters.length === 0 : selectedStatusFilters.includes(st.id);
              return (
                <button
                  key={st.id || `st-${stIdx}`}
                  type="button"
                  className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleStatusFilter(st.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {st.icon}
                    <span>{st.name}</span>
                  </div>
                  {renderFilterSwitch(isSelected, 'var(--primary)')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Timelines Filter (Multi-Selection for Balance) — read-only users only get the status filter */}
      {timeline.type === TimelineType.BALANCE && !isReadOnly && (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleSectionCollapse('integratedTimelines')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronDown
                size={13}
                style={{
                  transform: collapsedSections['integratedTimelines'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease',
                  color: 'var(--text-muted)'
                }}
              />
              <span>{t('sidebar.integratedTimelines')}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectAllTimelines();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-light)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              {selectedTimelineIds.length === availableCreditOptions.length ? t('buttons.deselectAll') : t('buttons.all')}
            </button>
          </div>
          {!collapsedSections['integratedTimelines'] && (
            <div className="sidebar-btn-group">
              {availableCreditOptions.map((opt, optIdx) => {
                const isSelected = selectedTimelineIds.includes(opt.id);
                return (
                  <button
                    key={opt.id || `opt-credit-${optIdx}`}
                    type="button"
                    className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleTimelineSelection(opt.id)}
                    style={isSelected ? { borderColor: opt.color } : { opacity: 0.6 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                      <span>{opt.name}</span>
                    </div>
                    {renderFilterSwitch(isSelected, opt.color)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tipo / Natureza Filter */}
      {isReadOnly ? null : timeline.type === TimelineType.EXPENSE ? (
        availableExpenseCategoryItems.length > 0 && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('categories')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown
                  size={13}
                  style={{
                    transform: collapsedSections['categories'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: 'var(--text-muted)'
                  }}
                />
                <span>{t('sidebar.categoryType')}</span>
              </div>
              {selectedExpenseCategories.length > 0 && (
                <button
                  type="button"
                  className="sidebar-action-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllExpenseCategories();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    padding: 0,
                    fontWeight: '700'
                  }}
                >
                  {t('buttons.all')}
                </button>
              )}
            </div>
            {!collapsedSections['categories'] && (
              <div className="sidebar-btn-group" style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '2px' }}>
                {/* Opção "Todas as Categorias" */}
                <button
                  type="button"
                  className={`sidebar-filter-item ${selectedExpenseCategories.length === 0 ? 'active' : ''}`}
                  onClick={() => setSelectedExpenseCategories([])}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={13} />
                    <span>{t('sidebar.allCategories')}</span>
                  </div>
                  {renderFilterSwitch(selectedExpenseCategories.length === 0, 'var(--primary)')}
                </button>

                {/* Lista de Categorias de Despesas que possuem eventos */}
                {availableExpenseCategoryItems.map((cat, catIdx) => {
                  const isSelected = selectedExpenseCategories.includes(cat.id);
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.id || `exp-cat-${catIdx}`}
                      type="button"
                      className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleExpenseCategory(cat.id)}
                      style={isSelected ? { borderColor: `${cat.color}66` } : {}}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: cat.color, display: 'inline-flex', alignItems: 'center' }}>
                          <IconComponent size={13} />
                        </span>
                        <span>{t(`${isCondoflow ? 'condoExpenseCategories' : 'expenseCategories'}.${cat.id}`)}</span>
                      </div>
                      {renderFilterSwitch(isSelected, cat.color)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : timeline.type !== TimelineType.BALANCE && (
        availableCategoryOptions.length > 1 && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('categories')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown
                  size={13}
                  style={{
                    transform: collapsedSections['categories'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: 'var(--text-muted)'
                  }}
                />
                <span>{timeline.type === TimelineType.INVESTMENT ? t('pocket.filterByPockets') : t('sidebar.categoryType')}</span>
              </div>
            </div>
            {!collapsedSections['categories'] && (
              <div className="sidebar-btn-group">
                {availableCategoryOptions.map((cat, catIdx) => {
                  const isSelected = selectedCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id || `cat-filter-${catIdx}`}
                      type="button"
                      className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        if (!isListView && cat.id !== EventStatus.ALL) {
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }
                        setSelectedCategoryFilter(cat.id);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cat.icon}
                        <span>{cat.name}</span>
                      </div>
                      {renderFilterSwitch(isSelected, 'var(--primary)')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* Account movement filter (savings timeline): inflows, withdrawals, expenses, transfers */}
      {timeline.type === TimelineType.INVESTMENT && (
        <SidebarToggleFilter
          title={t('pocket.movementType')}
          allLabel={t('pocket.allMovements')}
          items={ACCOUNT_MOVEMENT_ITEMS.map((item) => ({ ...item, label: t(`pocket.movements.${item.id}`) }))}
          selected={selectedMovementTypes}
          onChange={setSelectedMovementTypes}
          collapsed={Boolean(collapsedSections['movements'])}
          onToggleCollapse={() => toggleSectionCollapse('movements')}
          onBeforeChange={() => { if (!isListView) window.scrollTo({ top: 0, behavior: 'instant' }); }}
        />
      )}

      {/* Outflow type filter (Outflows timeline): own expenses, via savings, installments */}
      {timeline.type === TimelineType.EXPENSE && !isReadOnly && (
        <SidebarToggleFilter
          title={t('outflowType.title')}
          allLabel={t('outflowType.all')}
          items={OUTFLOW_TYPE_ITEMS.map((item) => ({ ...item, label: t(`outflowType.${item.id}`) }))}
          selected={selectedOutflowTypes}
          onChange={setSelectedOutflowTypes}
          collapsed={Boolean(collapsedSections['outflowTypes'])}
          onToggleCollapse={() => toggleSectionCollapse('outflowTypes')}
          onBeforeChange={() => { if (!isListView) window.scrollTo({ top: 0, behavior: 'instant' }); }}
        />
      )}

      {/* 🌟 6. Entidades / Individuals Filter (Single Selection) */}
      {timelineEntities.length > 0 && !isReadOnly && (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleSectionCollapse('entities')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronDown
                size={13}
                style={{
                  transform: collapsedSections['entities'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease',
                  color: 'var(--text-muted)'
                }}
              />
              <span>{t('sidebar.entities')}</span>
            </div>
            {selectedEntityId && (
              <button
                type="button"
                className="sidebar-action-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEntityId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: 0,
                  fontWeight: '700'
                }}
              >
                {t('buttons.all')}
              </button>
            )}
          </div>

          {!collapsedSections['entities'] && (
            <div className="sidebar-btn-group">
              {/* Opção "Todas as Entidades" */}
              <button
                type="button"
                className={`sidebar-filter-item ${!selectedEntityId ? 'active' : ''}`}
                onClick={() => setSelectedEntityId(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={13} />
                  <span>{t('sidebar.allEntities')}</span>
                </div>
                {renderFilterSwitch(!selectedEntityId, 'var(--primary)')}
              </button>

              {/* Lista de Entidades que possuem eventos nesta timeline */}
              {timelineEntities.map((ent) => {
                const isSelected = String(selectedEntityId) === String(ent.id);
                return (
                  <button
                    key={ent.id}
                    type="button"
                    className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedEntityId((prev) => (String(prev) === String(ent.id) ? null : ent.id))}
                    title={ent.name}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        {getEntityIcon(ent.type)}
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.8rem'
                        }}
                      >
                        {ent.name}
                      </span>
                    </div>
                    {renderFilterSwitch(isSelected, 'var(--primary)')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

    </aside>
  );
}
