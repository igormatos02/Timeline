import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyIdButton({
  id,
  copiedLabel = 'Copiado!',
  copyLabel = 'Copiar ID'
}) {
  const [copied, setCopied] = useState(false);

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
      title={copied ? copiedLabel : copyLabel}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '1px 2px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: copied ? '#10b981' : 'var(--text-muted)',
        borderRadius: '3px',
        transition: 'all 0.15s ease'
      }}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
    </button>
  );
}