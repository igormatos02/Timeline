// Minimal CSV reader for spreadsheets saved as CSV (Excel in Portugal uses ";", others ","); handles quoted cells

const detectDelimiter = (firstLine) => {
  const counts = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length]);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
};

export function parseCsv(text) {
  const clean = String(text || '').replace(/^﻿/, '');
  const delimiter = detectDelimiter(clean.split(/\r?\n/)[0] || '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"' && clean[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') inQuotes = false;
      else cell += char;
    } else if (char === '"') inQuotes = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((value) => String(value).trim() !== ''));
}

export function toCsv(rows, delimiter = ';') {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[";\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((r) => r.map(escape).join(delimiter)).join('\r\n');
}

// Reads a file as UTF-8, falling back to Windows-1252 (older Excel exports)
export async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}
