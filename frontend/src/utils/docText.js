// Plain-text views of documents, sheets and decks (used by Compare and the AI assistant)
import { sheetToMatrix, getColLetter } from '../components/DocumentEditor/sheet/spreadsheetUtils';

// ─────────────────────────────────────────────────────────────
// Type-aware text extraction: compare what the reader sees, not raw HTML/JSON
// ─────────────────────────────────────────────────────────────

export const detectType = (doc) => {
  if (doc?.docType) return doc.docType;
  try {
    const parsed = JSON.parse(doc?.content || '');
    if (Array.isArray(parsed.sheets)) return 'sheet';
    if (Array.isArray(parsed.slides)) return 'ppt';
  } catch {
    // HTML document
  }
  return 'doc';
};

export const htmlToText = (html) => {
  if (!html) return '';
  const root = document.createElement('div');
  root.innerHTML = html;
  root.querySelectorAll('script, style').forEach((el) => el.remove());
  root.querySelectorAll('img').forEach((img) => img.replaceWith(`[Image${img.alt ? `: ${img.alt}` : ''}]`));
  root.querySelectorAll('video, iframe').forEach((el) => el.replaceWith('[Media]'));
  root.querySelectorAll('hr').forEach((el) => el.replaceWith('\n———\n'));
  root.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  root.querySelectorAll('li').forEach((li) => {
    const ordered = li.getAttribute('data-list') === 'ordered' || li.parentElement?.tagName === 'OL';
    li.prepend(ordered ? '# ' : '• ');
  });
  root.querySelectorAll('td, th').forEach((cell) => cell.append('\t'));
  root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div, tr, blockquote, pre').forEach((el) => el.append('\n'));
  return (root.textContent || '')
    .replaceAll(String.fromCharCode(160), " ")
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const sheetToText = (content) => {
  let wb;
  try {
    wb = JSON.parse(content);
  } catch {
    return '';
  }
  return (wb.sheets || []).map((sheet) => {
    const matrix = sheetToMatrix(sheet, wb);
    const rows = matrix
      .map((row, r) => {
        const cells = row.map((v, c) => (v === '' ? null : `${getColLetter(c)}: ${v}`)).filter(Boolean);
        return cells.length ? `Row ${r + 1}  │  ${cells.join('  │  ')}` : null;
      })
      .filter(Boolean);
    return [`▌ Sheet: ${sheet.name}`, ...rows].join('\n');
  }).join('\n\n');
};

export const deckToText = (content) => {
  let deck;
  try {
    deck = JSON.parse(content);
  } catch {
    return '';
  }
  return (deck.slides || []).map((s, i) => {
    const lines = [`▌ Slide ${i + 1}`];
    const add = (label, v) => v && String(v).trim() && lines.push(label ? `${label}: ${v}` : String(v));
    add('Title', s.title);
    add('Subtitle', s.subtitle);
    (s.bullets || []).forEach((b) => add('', `• ${b}`));
    add(s.col1Title || 'Left', s.leftColumn);
    add(s.col2Title || 'Right', s.rightColumn);
    if (s.layout === 'three-column') {
      add(s.col1Title || 'Column 1', s.col1Text);
      add(s.col2Title || 'Column 2', s.col2Text);
      add(s.col3Title || 'Column 3', s.col3Text);
    }
    add('Metric', [s.metricNumber, s.metricLabel].filter(Boolean).join(' — '));
    add('', s.metricDesc);
    add('Quote', s.quoteText);
    add('By', [s.quoteAuthor, s.quoteRole].filter(Boolean).join(', '));
    (s.shapes || []).forEach((sh) => sh.text && add('Text box', sh.text));
    add('Notes', s.notes);
    return lines.join('\n');
  }).join('\n\n');
};

export const toComparableText = (doc) => {
  const type = detectType(doc);
  if (type === 'sheet') return sheetToText(doc.content);
  if (type === 'ppt') return deckToText(doc.content);
  return htmlToText(doc?.content || '');
};

