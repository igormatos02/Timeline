import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';
import * as api from '../services/api.js';

/** Settings: downloads every record of the timeboard (ZIP with CSV sheets for Excel and the full data in JSON). */
export default function DataExportCard({ timeboardId }) {
  const { t, language } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      await api.exportTimeboardData(timeboardId, language);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{t('dataExport.title')}</strong>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('dataExport.description')}</span>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting || !timeboardId}
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
      >
        {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {t(isExporting ? 'dataExport.exporting' : 'dataExport.button')}
      </button>
      {error && <span role="alert" style={{ fontSize: '0.8rem', color: TimelineColor.WARNING }}>{error}</span>}
    </div>
  );
}
