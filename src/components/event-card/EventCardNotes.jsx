import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { renderFormattedMarkdown } from '../event-modals/DiaryEventModal.jsx';
import { format, parseISO } from 'date-fns';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventCardNotes() {
  const {
    addCardNote,
    canAddNote,
    canDeleteNote,
    getCardNotes,
    isNotesExpanded,
    isSavingNote,
    newItemText,
    removeCardNote,
    setIsNotesExpanded,
    setNewItemText,
    t
  } = useEventCard();

  const allNotes = getCardNotes();
  const hasNotes = allNotes.length > 0;

  if (!isNotesExpanded) return null;

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '12px 14px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: '700', color: hasNotes ? TimelineColor.WARNING : 'var(--text-muted)' }}>
          <FileText size={14} style={{ color: hasNotes ? TimelineColor.WARNING : 'var(--text-dim)' }} />
          <span>{t('eventNotes.title', { count: allNotes.length })}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsNotesExpanded(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '0.72rem',
            padding: '2px 6px'
          }}
        >
          ✕ {t('common.close')}
        </button>
      </div>

      {/* List of existing notes */}
      {hasNotes ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allNotes.map((note, idx) => (
            <div
              key={note.key}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
                padding: '6px 10px',
                background: 'var(--bg-glass)',
                borderRadius: '6px',
                borderLeft: `3px solid ${TimelineColor.WARNING}`
              }}
            >
              <span style={{ flex: 1, lineHeight: '1.45', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{renderFormattedMarkdown(note.content)}</span>
                {(note.authorName || note.createdAt) && (
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>
                    {[note.authorName, note.createdAt ? format(parseISO(note.createdAt), 'dd/MM/yyyy HH:mm') : null].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              {canDeleteNote(note) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeCardNote(note, idx);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                  title={t('eventNotes.delete')}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          {t('eventNotes.empty')}
        </span>
      )}

      {/* Add New Note Input Form (also available to read-only users) */}
      {canAddNote && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!newItemText.trim() || isSavingNote) return;
            const ok = await addCardNote(newItemText);
            if (ok) setNewItemText('');
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
        >
          <input
            type="text"
            placeholder={t('eventNotes.placeholder')}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.76rem',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!newItemText.trim() || isSavingNote}
            onClick={(e) => e.stopPropagation()}
            className="btn btn-primary btn-sm"
            style={{
              padding: '4px 12px',
              fontSize: '0.74rem',
              background: TimelineColor.WARNING,
              color: TimelineColor.WHITE,
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={t('actionAddNote')}
          >
            <Plus size={13} />
            <span>{t('eventNotes.add')}</span>
          </button>
        </form>
      )}
    </div>
  );
      }
