import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';

// Convert column index to Letter (0 -> A, 1 -> B, ...)
function getColLetter(colIdx) {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// ─────────────────────────────────────────────────────────────
// 1. DOC EXPORTERS
// ─────────────────────────────────────────────────────────────

export const downloadDocAsPdf = (title, content) => {
  return new Promise((resolve, reject) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        .pdf-container {
          font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
          width: 100%;
          max-width: 210mm;
          color: #1f2937;
        }
        .pdf-container img, .pdf-container video {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
        .pdf-container h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 16px;
          border-bottom: 2px solid #427c36;
          padding-bottom: 8px;
        }
        .pdf-container p, .pdf-container h2, .pdf-container h3, .pdf-container table, .pdf-container tr {
          page-break-inside: avoid;
        }
      </style>
      <div class="pdf-container">
        <h1>${title || 'Untitled Document'}</h1>
        <div style="font-size: 1.05rem; line-height: 1.6;">
          ${content || ''}
        </div>
      </div>
    `;

    const opt = {
      margin: [18, 15, 18, 15],
      filename: `${title || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(resolve)
      .catch(reject);
  });
};

export const downloadDocAsWord = (title, content) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Document'}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #1f2937; margin: 1in; }
    h1 { font-size: 20pt; color: #427c36; font-weight: bold; border-bottom: 2px solid #427c36; padding-bottom: 6px; }
    h2 { font-size: 15pt; color: #2563eb; }
    h3 { font-size: 13pt; color: #374151; }
    table { border-collapse: collapse; width: 100%; margin: 14px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
    th { background: #f1f5f9; font-weight: bold; }
    blockquote { border-left: 3px solid #427c36; padding-left: 12px; margin-left: 0; color: #4b5563; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${title || 'Untitled Document'}</h1>
  ${content || ''}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'document'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadDocAsText = (title, content) => {
  const temp = document.createElement('div');
  temp.innerHTML = content || '';
  const text = `${title || 'Document'}\n${'='.repeat(title?.length || 8)}\n\n${temp.innerText || temp.textContent || ''}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'document'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────
// 2. SPREADSHEET EXPORTERS
// ─────────────────────────────────────────────────────────────

export const downloadSheetAsXlsx = (title, content) => {
  let workbookData;
  try {
    workbookData = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    workbookData = null;
  }

  const wb = XLSX.utils.book_new();

  if (workbookData && workbookData.sheets && Array.isArray(workbookData.sheets)) {
    workbookData.sheets.forEach((sheet) => {
      const sheetName = (sheet.name || 'Sheet').substring(0, 31);
      const cells = sheet.cells || {};
      const data = [];

      for (let r = 1; r <= (sheet.rowCount || 30); r++) {
        const row = [];
        let rowHasData = false;
        for (let c = 0; c < (sheet.colCount || 12); c++) {
          const colLetter = getColLetter(c);
          const cellCoord = `${colLetter}${r}`;
          const cell = cells[cellCoord];
          const val = cell ? (cell.value !== undefined ? cell.value : (cell.formula || '')) : '';
          row.push(val);
          if (val) rowHasData = true;
        }
        data.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else {
    const ws = XLSX.utils.aoa_to_sheet([['No data']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  }

  XLSX.writeFile(wb, `${title || 'spreadsheet'}.xlsx`);
};

export const downloadSheetAsCsv = (title, content) => {
  let workbookData;
  try {
    workbookData = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    workbookData = null;
  }

  const activeSheet = (workbookData?.sheets && workbookData.sheets[0]) || null;
  if (!activeSheet) {
    const blob = new Blob(['Empty Sheet'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'sheet'}.csv`;
    a.click();
    return;
  }

  const cells = activeSheet.cells || {};
  const rows = [];
  for (let r = 1; r <= activeSheet.rowCount; r++) {
    const row = [];
    for (let c = 0; c < activeSheet.colCount; c++) {
      const coord = `${getColLetter(c)}${r}`;
      const cell = cells[coord];
      const val = cell ? (cell.value !== undefined ? cell.value : '') : '';
      const escaped = `"${String(val).replace(/"/g, '""')}"`;
      row.push(escaped);
    }
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || activeSheet.name || 'sheet'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadSheetAsPdf = (title, content) => {
  return new Promise((resolve, reject) => {
    let workbookData;
    try {
      workbookData = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      workbookData = null;
    }

    const sheet = workbookData?.sheets?.[0] || { rowCount: 15, colCount: 8, cells: {} };
    const cells = sheet.cells || {};

    let tableHtml = `
      <style>
        .sheet-pdf { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 10px; }
        .sheet-title { font-size: 1.5rem; font-weight: 800; color: #10b981; margin-bottom: 12px; }
        .sheet-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .sheet-table th, .sheet-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
        .sheet-table th { background: #f8fafc; font-weight: 700; color: #475569; text-align: center; }
        .row-num { background: #f8fafc; font-weight: 600; width: 28px; text-align: center; color: #94a3b8; }
      </style>
      <div class="sheet-pdf">
        <div class="sheet-title">${title || sheet.name || 'Spreadsheet'}</div>
        <table class="sheet-table">
          <thead>
            <tr>
              <th class="row-num">#</th>
    `;

    // Header letters
    for (let c = 0; c < Math.min(sheet.colCount, 12); c++) {
      tableHtml += `<th>${getColLetter(c)}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    // Rows
    for (let r = 1; r <= Math.min(sheet.rowCount, 40); r++) {
      tableHtml += `<tr><td class="row-num">${r}</td>`;
      for (let c = 0; c < Math.min(sheet.colCount, 12); c++) {
        const coord = `${getColLetter(c)}${r}`;
        const cell = cells[coord];
        const val = cell ? (cell.value !== undefined ? cell.value : '') : '';
        tableHtml += `<td>${val || ''}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table></div>`;

    const element = document.createElement('div');
    element.innerHTML = tableHtml;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${title || 'spreadsheet'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(resolve)
      .catch(reject);
  });
};

// ─────────────────────────────────────────────────────────────
// 3. PRESENTATION (PPT) EXPORTERS
// ─────────────────────────────────────────────────────────────

export const downloadPptAsPptx = async (title, content) => {
  let deck;
  try {
    deck = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    deck = { slides: [] };
  }

  const pres = new pptxgen();
  pres.title = title || 'Presentation Deck';

  const slides = deck.slides || [];
  if (slides.length === 0) {
    const slide = pres.addSlide();
    slide.addText(title || 'Untitled Presentation', { x: 1, y: 2, fontSize: 32, bold: true, color: '1f2937' });
  } else {
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const slide = pres.addSlide();

      // Background subtle theme color
      slide.background = { color: i === 0 ? 'F0FDF4' : 'FFFFFF' };

      // Slide Title
      if (s.title) {
        slide.addText(s.title, {
          x: 0.8,
          y: i === 0 ? 2.0 : 0.6,
          w: '85%',
          h: 1.0,
          fontSize: i === 0 ? 32 : 24,
          bold: true,
          color: i === 0 ? '166534' : '1f2937'
        });
      }

      // Slide Subtitle
      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 0.8,
          y: i === 0 ? 3.2 : 1.4,
          w: '85%',
          h: 0.8,
          fontSize: i === 0 ? 18 : 15,
          color: '4b5563',
          italic: i === 0
        });
      }

      // Bullets
      if (s.bullets && Array.isArray(s.bullets) && s.bullets.length > 0) {
        const bulletObjects = s.bullets.map(b => ({
          text: b,
          options: { bullet: true, fontSize: 16, breakLine: true, color: '374151', margin: 6 }
        }));
        slide.addText(bulletObjects, {
          x: 0.8,
          y: s.subtitle ? 2.3 : 1.6,
          w: '85%',
          h: 4.2
        });
      } else if (s.col1Text || s.leftColumn) {
        const bodyText = s.col1Text || s.leftColumn || '';
        slide.addText(bodyText, {
          x: 0.8,
          y: 2.0,
          w: '85%',
          h: 4.0,
          fontSize: 16,
          color: '374151'
        });
      }
    }
  }

  await pres.writeFile({ fileName: `${title || 'presentation'}.pptx` });
};

export const downloadPptAsPdf = (title, content) => {
  return new Promise((resolve, reject) => {
    let deck;
    try {
      deck = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      deck = { slides: [] };
    }

    const slides = deck.slides || [];
    let slidesHtml = `
      <style>
        .slide-page {
          width: 297mm;
          height: 180mm;
          padding: 24mm 24mm;
          box-sizing: border-box;
          page-break-after: always;
          font-family: 'Roboto', 'Segoe UI', sans-serif;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .slide-page.title-slide {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          text-align: center;
          align-items: center;
        }
        .slide-heading {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 12px;
        }
        .slide-subheading {
          font-size: 1.2rem;
          color: #4b5563;
          margin-bottom: 24px;
        }
        .slide-bullets {
          font-size: 1.15rem;
          line-height: 1.8;
          color: #374151;
          margin-left: 20px;
        }
        .slide-footer {
          margin-top: auto;
          font-size: 0.75rem;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }
      </style>
      <div>
    `;

    slides.forEach((s, idx) => {
      const isTitle = idx === 0;
      slidesHtml += `
        <div class="slide-page ${isTitle ? 'title-slide' : ''}">
          <div class="slide-heading" style="color: ${isTitle ? '#166534' : '#1f2937'};">${s.title || `Slide ${idx + 1}`}</div>
          ${s.subtitle ? `<div class="slide-subheading">${s.subtitle}</div>` : ''}
          ${
            s.bullets && s.bullets.length > 0
              ? `<ul class="slide-bullets">${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
              : s.col1Text
              ? `<div style="font-size: 1.15rem; line-height: 1.7; color: #374151;">${s.col1Text}</div>`
              : ''
          }
          <div class="slide-footer">
            <span>${title || 'DocsApp Presentation'}</span>
            <span>Slide ${idx + 1} of ${slides.length}</span>
          </div>
        </div>
      `;
    });

    slidesHtml += `</div>`;

    const element = document.createElement('div');
    element.innerHTML = slidesHtml;

    const opt = {
      margin: 0,
      filename: `${title || 'presentation'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(resolve)
      .catch(reject);
  });
};
