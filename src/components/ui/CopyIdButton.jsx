import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';

export default function CopyIdButton({
  id,
  copiedLabel,
  copyLabel
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const finalCopiedLabel = copiedLabel || t('common.copied');
  const finalCopyLabel = copyLabel || t('common.copyId');

  const handleCopy = (e) => {
    e.stopPropagation();
    if (id) {
      navigator.clipboard.writeText(String(id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? finalCopiedLabel : finalCopyLabel}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: copied ? TimelineColor.SUCCESS : 'var(--text-muted)',
        borderRadius: '4px',
        transition: 'all 0.15s ease'
      }}
    >
      {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
    </button>
  );
}