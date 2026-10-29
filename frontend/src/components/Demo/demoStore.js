// Demo workspace storage.
//
// Demo files never touch the backend or the database. They live in sessionStorage,
// which the browser keeps across page refreshes but wipes as soon as the tab or
// browser is closed — exactly the "lose it when you close the browser" behaviour.

import { getInitialWorkbook } from '../DocumentEditor/sheet/spreadsheetUtils';
import { getInitialDeck } from '../DocumentEditor/ppt/presentationConstants';

const STORAGE_KEY = 'docsapp_demo_workspace_v1';

// One free file of each kind → three demo documents in total
export const DEMO_TYPES = [
  {
    type: 'doc',
    label: 'Document',
    defaultTitle: 'My Demo Document',
    blurb: 'Word-style rich text: fonts, lists, tables, images.',
    formats: [
      { id: 'docx', label: 'Word (.docx)' },
      { id: 'pdf', label: 'PDF (.pdf)' },
      { id: 'txt', label: 'Plain text (.txt)' }
    ]
  },
  {
    type: 'sheet',
    label: 'Spreadsheet',
    defaultTitle: 'My Demo Sheet',
    blurb: 'Excel-style grid with formulas, formatting and tabs.',
    formats: [
      { id: 'xlsx', label: 'Excel (.xlsx)' },
      { id: 'csv', label: 'CSV (.csv)' },
      { id: 'pdf', label: 'PDF (.pdf)' }
    ]
  },
  {
    type: 'ppt',
    label: 'Presentation',
    defaultTitle: 'My Demo Presentation',
    blurb: 'PowerPoint-style slides, shapes, themes and slideshow.',
    formats: [
      { id: 'pptx', label: 'PowerPoint (.pptx)' },
      { id: 'pdf', label: 'PDF (.pdf)' }
    ]
  }
];

export const DEMO_LIMIT = DEMO_TYPES.length;

export const getTypeMeta = (type) => DEMO_TYPES.find((t) => t.type === type) || DEMO_TYPES[0];

export const createDemoDoc = (type) => {
  const meta = getTypeMeta(type);
  let content = '';
  if (type === 'sheet') content = JSON.stringify(getInitialWorkbook());
  if (type === 'ppt') content = JSON.stringify(getInitialDeck(meta.defaultTitle));
  const now = Date.now();
  return {
    id: `demo_${type}_${now}`,
    type,
    title: meta.defaultTitle,
    content,
    createdAt: now,
    savedAt: null
  };
};

export const loadDemoDocs = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d) => d && d.id && d.type) : [];
  } catch {
    return [];
  }
};

// Returns true when the browser accepted the write (it can refuse when full, e.g. many large images)
export const persistDemoDocs = (docs) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    return true;
  } catch {
    return false;
  }
};
