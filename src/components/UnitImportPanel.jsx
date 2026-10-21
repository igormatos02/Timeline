import React, { useMemo, useState } from 'react';
import { Download, FileUp, Loader2, Upload, X } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { translations } from '../../shared/i18n/translations.js';
import { PaymentChannel, TimelineColor } from '../enums/index.js';
import { parseCsv, readTextFile, toCsv } from '../utils/csv.js';
import * as api from '../services/api.js';

// Spreadsheet columns, in template order
const UNIT_COLUMNS = ['unit', 'name', 'email', 'phone', 'taxId', 'monthlyFee', 'observation'];

const normalizeHeader = (value) => String(value || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

// A header matches a column by its key or its name in any UI language
const COLUMN_BY_HEADER = new Map(
  UNIT_COLUMNS.flatMap((key) => [
    [normalizeHeader(key), key],
    ...Object.values(translations).map((dict) => [normalizeHeader(dict.unitImport?.columns?.[key]), key])
  ])
);

/**
 * Condominium entities tab: imports units (frações) and their monthly fees from a CSV spreadsheet
 * (POST /api/timeboards/:id/import-units). The server checks the plan for the whole file and skips known units.
 */
export default function UnitImportPanel({ timeboardId, onImported, onClose }) {
  const { t, language } = useTranslation();
  const [rows, setRows] = useState(null);
  const [fileError, setFileError] = useState('');
  const [feeStartDate, setFeeStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [feeChannel, setFeeChannel] = useState(PaymentChannel.CASH);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const preview = useMemo(() => (rows || []).slice(0, 5), [rows]);

  const downloadTemplate = () => {
    const header = UNIT_COLUMNS.map((key) => t(`unitImport.columns.${key}`));
    const example = UNIT_COLUMNS.map((key) => t(`unitImport.example.${key}`));
    // BOM so Excel opens the accents correctly
    const blob = new Blob(['﻿', toCsv([header, example])], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${t('unitImport.open')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setResult(null);
    setError('');
    if (!file) return;
    const [header = [], ...lines] = parseCsv(await readTextFile(file));
    const columns = header.map((cell) => COLUMN_BY_HEADER.get(normalizeHeader(cell)) || null);
    if (!columns.includes('unit') || !columns.includes('name')) {
      setRows(null);
      setFileError(t('unitImport.noColumns'));
      return;
    }
    setFileError('');
    setRows(lines.map((line) => Object.fromEntries(
      columns.map((key, index) => [key, String(line[index] ?? '').trim()]).filter(([key]) => key)
    )));
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError('');
    try {
      const response = await api.importUnits(timeboardId, { rows, feeStartDate, feeChannel, language });
      setResult(response);
      setRows(null);
      await onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const chip = (isActive) => ({
    padding: '6px 12px',
    borderRadius: '999px',
    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-glass)'}`,
    background: isActive ? `${TimelineColor.PRIMARY}1f` : 'transparent',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    cursor: 'pointer'
  });
  const button = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.82rem', cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{t('unitImport.title')}</strong>
        <button type="button" onClick={onClose} aria-label={t('unitImport.cancel')} style={{ ...button, padding: '4px' }}><X size={16} /></button>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('unitImport.intro')}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button type="button" onClick={downloadTemplate} style={button}><Download size={15} />{t('unitImport.template')}</button>
        <label style={button}>
          <FileUp size={15} />{t('unitImport.chooseFile')}
          <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      </div>

      {fileError && <div role="alert" style={{ fontSize: '0.8rem', color: TimelineColor.WARNING }}>{fileError}</div>}

      {rows && (
        <>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{t('unitImport.rowsFound', { count: rows.length })}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: 'var(--text-main)' }}>
              <thead>
                <tr>{['unit', 'name', 'email', 'monthlyFee'].map((key) => (
                  <th key={key} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>{t(`unitImport.columns.${key}`)}</th>
                ))}</tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index}>{['unit', 'name', 'email', 'monthlyFee'].map((key) => (
                    <td key={key} style={{ padding: '4px 6px', borderBottom: '1px solid var(--border-glass)' }}>{row[key] || ''}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t('unitImport.feeStart')}
              <input type="date" value={feeStartDate} onChange={(e) => setFeeStartDate(e.target.value)} style={{ ...button, padding: '5px 8px' }} />
            </label>
            <span>{t('unitImport.feeChannel')}</span>
            {[[PaymentChannel.CASH, 'unitImport.cash'], [PaymentChannel.BANK, 'unitImport.bank']].map(([key, labelKey]) => (
              <button key={key} type="button" onClick={() => setFeeChannel(key)} style={chip(feeChannel === key)}>{t(labelKey)}</button>
            ))}
          </div>

          <button type="button" onClick={handleImport} disabled={isImporting || rows.length === 0} style={{ ...button, alignSelf: 'flex-start', background: 'var(--primary)', borderColor: 'var(--primary)', color: 'var(--text-white)' }}>
            {isImporting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}{t('unitImport.submit')}
          </button>
        </>
      )}

      {error && <div role="alert" style={{ fontSize: '0.8rem', color: TimelineColor.WARNING }}>{error}</div>}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
          <strong>{t('unitImport.done', { units: result.createdUnits, fees: result.createdFees })}</strong>
          {result.skipped?.length > 0 && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>{t('unitImport.skippedTitle')}</span>
              {result.skipped.map((skip) => (
                <span key={`${skip.line}-${skip.unit}`}>{t('unitImport.skippedLine', { line: skip.line, unit: skip.unit || '—', reason: t(`unitImport.reasons.${skip.reason}`) })}</span>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
