// Reads a .docx in the browser and turns it into HTML for preview and PDF export.
// Covers: headings, bold/italic/underline/strike, colours, highlights, font sizes,
// super/subscript, alignment, indents, numbered and bulleted lists, tables (merged cells),
// images, hyperlinks, tabs, line and page breaks.
import JSZip from 'jszip';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kids = (el, name) => (el ? [...el.children].filter((c) => !name || c.localName === name) : []);
const kid = (el, name) => (el ? [...el.children].find((c) => c.localName === name) || null : null);
const wAttr = (el, name) => (el ? el.getAttributeNS(W, name) ?? el.getAttribute(`w:${name}`) : null);
const descendant = (el, name) => (el ? el.getElementsByTagNameNS('*', name)[0] || null : null);

// <w:b/> means on; <w:b w:val="0"/> or "false" means off
const isOn = (el) => {
  if (!el) return false;
  const v = wAttr(el, 'val');
  return v == null || !['0', 'false', 'off', 'none'].includes(v);
};

const HIGHLIGHT = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000',
  darkBlue: '#00008b', darkCyan: '#008b8b', darkGreen: '#006400', darkMagenta: '#8b008b', darkRed: '#8b0000',
  darkYellow: '#808000', darkGray: '#a9a9a9', lightGray: '#d3d3d3', black: '#000000', white: '#ffffff'
};

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', tif: 'image/tiff', tiff: 'image/tiff' };

const toRoman = (n) => {
  const map = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = '';
  let v = n;
  map.forEach(([k, r]) => { while (v >= k) { s += r; v -= k; } });
  return s;
};
const toLetters = (n) => {
  let s = '';
  let v = n;
  while (v > 0) { v -= 1; s = String.fromCharCode(97 + (v % 26)) + s; v = Math.floor(v / 26); }
  return s;
};
const formatNumber = (n, fmt) => {
  switch (fmt) {
    case 'lowerLetter': return toLetters(n);
    case 'upperLetter': return toLetters(n).toUpperCase();
    case 'lowerRoman': return toRoman(n);
    case 'upperRoman': return toRoman(n).toUpperCase();
    case 'decimalZero': return n < 10 ? `0${n}` : String(n);
    case 'none': return '';
    default: return String(n);
  }
};
// Symbol/Wingdings private-use bullets → visible Unicode
const bulletChar = (text = '') => {
  const ch = text.trim();
  if (!ch) return '•';
  const code = ch.charCodeAt(0);
  if (code === 0xf0b7 || ch === '·') return '•';
  if (code === 0xf0a7 || ch === '§') return '▪';
  if (code === 0xf0d8 || code === 0xf0e8) return '➢';
  if (code === 0xf0fc) return '✓';
  if (ch === 'o') return '◦';
  if (code >= 0xf000) return '•';
  return ch;
};

const loadXml = async (zip, path) => {
  const f = zip.file(path);
  if (!f) return null;
  return new DOMParser().parseFromString(await f.async('string'), 'application/xml');
};

const parseRels = (doc) => {
  const map = {};
  if (!doc) return map;
  [...doc.getElementsByTagName('Relationship')].forEach((r) => {
    map[r.getAttribute('Id')] = { target: r.getAttribute('Target'), external: r.getAttribute('TargetMode') === 'External' };
  });
  return map;
};

const parseStyles = (doc) => {
  const styles = {};
  if (!doc) return styles;
  const defSp = doc.getElementsByTagNameNS(W, 'pPrDefault')[0]?.getElementsByTagNameNS(W, 'spacing')[0];
  if (defSp) styles.__default = { spacing: { before: wAttr(defSp, 'before'), after: wAttr(defSp, 'after'), line: wAttr(defSp, 'line'), lineRule: wAttr(defSp, 'lineRule') } };
  [...doc.getElementsByTagNameNS(W, 'style')].forEach((s) => {
    const id = wAttr(s, 'styleId');
    const name = (wAttr(kid(s, 'name'), 'val') || '').toLowerCase();
    const basedOn = wAttr(kid(s, 'basedOn'), 'val');
    const pPr = kid(s, 'pPr');
    const numPr = pPr ? kid(pPr, 'numPr') : null;
    const sp = pPr ? kid(pPr, 'spacing') : null;
    styles[id] = {
      name,
      basedOn,
      spacing: sp ? { before: wAttr(sp, 'before'), after: wAttr(sp, 'after'), line: wAttr(sp, 'line'), lineRule: wAttr(sp, 'lineRule') } : null,
      contextual: pPr ? isOn(kid(pPr, 'contextualSpacing')) : false,
      rPr: kid(s, 'rPr'),
      jc: pPr ? wAttr(kid(pPr, 'jc'), 'val') : null,
      numId: numPr ? wAttr(kid(numPr, 'numId'), 'val') : null,
      ilvl: numPr ? wAttr(kid(numPr, 'ilvl'), 'val') : null
    };
  });
  return styles;
};

const parseNumbering = (doc) => {
  const abstract = {};
  const nums = {};
  if (!doc) return { abstract, nums };
  [...doc.getElementsByTagNameNS(W, 'abstractNum')].forEach((a) => {
    const levels = {};
    kids(a, 'lvl').forEach((l) => {
      levels[wAttr(l, 'ilvl')] = {
        fmt: wAttr(kid(l, 'numFmt'), 'val') || 'decimal',
        text: wAttr(kid(l, 'lvlText'), 'val') ?? '%1.',
        start: Number(wAttr(kid(l, 'start'), 'val') || 1)
      };
    });
    abstract[wAttr(a, 'abstractNumId')] = levels;
  });
  [...doc.getElementsByTagNameNS(W, 'num')].forEach((n) => {
    const overrides = {};
    kids(n, 'lvlOverride').forEach((o) => {
      const so = kid(o, 'startOverride');
      if (so) overrides[wAttr(o, 'ilvl')] = Number(wAttr(so, 'val'));
    });
    nums[wAttr(n, 'numId')] = { abstractId: wAttr(kid(n, 'abstractNumId'), 'val'), overrides };
  });
  return { abstract, nums };
};

export async function docxToHtml(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.doc')) {
    throw new Error('Old .doc files can’t be read here. Open it in Word and save it as .docx, then try again.');
  }
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error('This file isn’t a valid Word document (.docx).');
  }
  const doc = await loadXml(zip, 'word/document.xml');
  if (!doc) throw new Error('This file isn’t a valid Word document (.docx).');

  const rels = parseRels(await loadXml(zip, 'word/_rels/document.xml.rels'));
  const styles = parseStyles(await loadXml(zip, 'word/styles.xml'));
  const numbering = parseNumbering(await loadXml(zip, 'word/numbering.xml'));
  const counters = {}; // numId → [count per level]
  const warnings = new Set();
  const imageCache = {};

  const styleChain = (id) => {
    const chain = [];
    let cur = id;
    let guard = 0;
    while (cur && styles[cur] && guard < 12) { chain.push(styles[cur]); cur = styles[cur].basedOn; guard += 1; }
    return chain;
  };

  const headingLevel = (styleId) => {
    for (const s of styleChain(styleId)) {
      if (s.name === 'title') return 1;
      if (s.name === 'subtitle') return 2;
      const m = /^heading (\d)$/.exec(s.name);
      if (m) return Math.min(6, Number(m[1]));
    }
    const m = /^heading(\d)$/i.exec(styleId || '');
    return m ? Math.min(6, Number(m[1])) : 0;
  };

  const imageFromRel = async (rid) => {
    const rel = rels[rid];
    if (!rel || rel.external) return null;
    if (imageCache[rid] !== undefined) return imageCache[rid];
    const path = rel.target.startsWith('/') ? rel.target.slice(1) : `word/${rel.target.replace(/^\.\//, '')}`;
    const f = zip.file(path);
    const ext = (path.split('.').pop() || '').toLowerCase();
    if (!f || !MIME[ext] || ext === 'tif' || ext === 'tiff') {
      warnings.add('Some images use a format browsers can’t show (like EMF or WMF) and were left out.');
      imageCache[rid] = null;
      return null;
    }
    imageCache[rid] = `data:${MIME[ext]};base64,${await f.async('base64')}`;
    return imageCache[rid];
  };

  const runStyle = (rPr) => {
    if (!rPr) return { css: [], tags: [] };
    const css = [];
    const tags = [];
    if (isOn(kid(rPr, 'b'))) tags.push('strong');
    if (isOn(kid(rPr, 'i'))) tags.push('em');
    const u = kid(rPr, 'u');
    if (u && wAttr(u, 'val') !== 'none') tags.push('u');
    if (isOn(kid(rPr, 'strike')) || isOn(kid(rPr, 'dstrike'))) tags.push('s');
    const va = wAttr(kid(rPr, 'vertAlign'), 'val');
    if (va === 'superscript') tags.push('sup');
    if (va === 'subscript') tags.push('sub');
    const color = wAttr(kid(rPr, 'color'), 'val');
    if (color && color !== 'auto' && /^[0-9a-f]{6}$/i.test(color)) css.push(`color:#${color}`);
    const sz = Number(wAttr(kid(rPr, 'sz'), 'val'));
    if (sz) css.push(`font-size:${sz / 2}pt`);
    const hl = wAttr(kid(rPr, 'highlight'), 'val');
    const shd = wAttr(kid(rPr, 'shd'), 'fill');
    if (hl && HIGHLIGHT[hl]) css.push(`background-color:${HIGHLIGHT[hl]}`);
    else if (shd && /^[0-9a-f]{6}$/i.test(shd)) css.push(`background-color:#${shd}`);
    const font = wAttr(kid(rPr, 'rFonts'), 'ascii');
    if (font) css.push(`font-family:'${font.replace(/'/g, '')}', Calibri, Arial, sans-serif`);
    if (isOn(kid(rPr, 'caps'))) css.push('text-transform:uppercase');
    if (isOn(kid(rPr, 'vanish'))) css.push('display:none');
    return { css, tags };
  };

  const wrapRun = (html, rPr) => {
    if (!html) return '';
    const { css, tags } = runStyle(rPr);
    let out = html;
    tags.forEach((t) => { out = `<${t}>${out}</${t}>`; });
    return css.length ? `<span style="${css.join(';')}">${out}</span>` : out;
  };

  // Paragraph content → array of segments (a page break starts a new segment)
  const renderInline = async (nodes, segs) => {
    for (const node of nodes) {
      const n = node.localName;
      if (n === 'r') {
        const rPr = kid(node, 'rPr');
        let html = '';
        for (const c of node.children) {
          const cn = c.localName;
          if (cn === 't') html += esc(c.textContent);
          else if (cn === 'tab') html += '\t';
          else if (cn === 'noBreakHyphen') html += '‑';
          else if (cn === 'softHyphen') html += '';
          else if (cn === 'sym') html += bulletChar(String.fromCharCode(parseInt(wAttr(c, 'char') || '2022', 16)));
          else if (cn === 'br' || cn === 'cr') {
            if (wAttr(c, 'type') === 'page') {
              segs[segs.length - 1] += wrapRun(html, rPr);
              html = '';
              segs.push('');
            } else html += '<br>';
          } else if (cn === 'drawing' || cn === 'pict' || cn === 'object') {
            const blip = descendant(c, 'blip');
            const rid = blip ? blip.getAttributeNS(R, 'embed') || blip.getAttribute('r:embed') : (descendant(c, 'imagedata')?.getAttributeNS(R, 'id') || descendant(c, 'imagedata')?.getAttribute('r:id'));
            const src = rid ? await imageFromRel(rid) : null;
            if (src) {
              const ext = descendant(c, 'extent');
              const cx = Number(ext?.getAttribute('cx'));
              const width = cx ? Math.round(cx / 9525) : null;
              html += `<img src="${src}" alt=""${width ? ` style="width:${width}px"` : ''}>`;
            }
          }
        }
        segs[segs.length - 1] += wrapRun(html, rPr);
      } else if (n === 'hyperlink') {
        const rid = node.getAttributeNS(R, 'id') || node.getAttribute('r:id');
        const href = rid && rels[rid]?.external ? rels[rid].target : null;
        const inner = [''];
        await renderInline(kids(node), inner);
        const text = inner.join('');
        segs[segs.length - 1] += href && /^(https?:|mailto:)/i.test(href) ? `<a href="${esc(href)}">${text}</a>` : text;
      } else if (['ins', 'smartTag', 'fldSimple', 'customXml', 'sdtContent', 'moveTo'].includes(n)) {
        await renderInline(kids(node), segs);
      } else if (n === 'sdt') {
        await renderInline(kids(kid(node, 'sdtContent')), segs);
      }
      // del, moveFrom, bookmarks, proofErr, comments: skipped
    }
  };

  const listMarker = (numId, ilvl) => {
    const num = numbering.nums[numId];
    const levels = num && numbering.abstract[num.abstractId];
    if (!levels) return null;
    const lvl = levels[ilvl] || levels['0'];
    if (!lvl) return null;
    const c = counters[numId] || (counters[numId] = []);
    const level = Number(ilvl);
    const start = (l) => num.overrides[l] ?? levels[l]?.start ?? 1;
    c[level] = c[level] == null ? start(level) : c[level] + 1;
    for (let d = level + 1; d < 9; d += 1) c[d] = null; // deeper levels restart
    if (lvl.fmt === 'bullet') return { text: bulletChar(lvl.text), ordered: false };
    const text = lvl.text.replace(/%(\d)/g, (_, k) => {
      const l = Number(k) - 1;
      const v = c[l] ?? start(l);
      return formatNumber(v, levels[l]?.fmt || 'decimal');
    });
    return { text, ordered: true };
  };

  const renderParagraph = async (p) => {
    const pPr = kid(p, 'pPr');
    const styleId = wAttr(kid(pPr, 'pStyle'), 'val');
    const chain = styleChain(styleId);
    const level = headingLevel(styleId);
    const css = [];
    const jc = wAttr(kid(pPr, 'jc'), 'val') || chain.find((s) => s.jc)?.jc;
    if (jc === 'center') css.push('text-align:center');
    else if (jc === 'right' || jc === 'end') css.push('text-align:right');
    else if (jc === 'both' || jc === 'distribute') css.push('text-align:justify');
    const shd = wAttr(kid(pPr, 'shd'), 'fill');
    if (shd && /^[0-9a-f]{6}$/i.test(shd)) css.push(`background-color:#${shd}`);

    // Paragraph spacing: paragraph → style chain → document default (twentieths of a point)
    const spEl = kid(pPr, 'spacing');
    const pick = (key) => {
      const own = spEl ? wAttr(spEl, key) : null;
      if (own != null) return own;
      for (const st of chain) if (st.spacing && st.spacing[key] != null) return st.spacing[key];
      return styles.__default?.spacing?.[key] ?? null;
    };
    const contextual = (pPr && isOn(kid(pPr, 'contextualSpacing'))) || chain.some((st) => st.contextual);

    const numPr = kid(pPr, 'numPr');
    const numId = wAttr(kid(numPr, 'numId'), 'val') || chain.find((s) => s.numId)?.numId;
    const ilvl = wAttr(kid(numPr, 'ilvl'), 'val') || chain.find((s) => s.ilvl)?.ilvl || '0';
    let marker = '';
    if (numId && numId !== '0') {
      const m = listMarker(numId, ilvl);
      if (m) {
        css.push(`padding-left:${1.75 * (Number(ilvl) + 1)}em`);
        marker = `<span class="doc-marker">${esc(m.text)}</span>`;
      }
    } else {
      const ind = kid(pPr, 'ind');
      const left = Number(wAttr(ind, 'left') || wAttr(ind, 'start') || 0);
      if (left > 0) css.push(`padding-left:${(left / 20).toFixed(1)}pt`);
      const first = Number(wAttr(ind, 'firstLine') || 0);
      if (first > 0) css.push(`text-indent:${(first / 20).toFixed(1)}pt`);
    }

    if (!level) {
      const after = Number(pick('after'));
      const beforeSp = Number(pick('before'));
      if (!contextual && !marker) {
        if (after > 0) css.push(`margin-bottom:${(after / 20).toFixed(1)}pt`);
        if (beforeSp > 0) css.push(`margin-top:${(beforeSp / 20).toFixed(1)}pt`);
      }
      const line = Number(pick('line'));
      const rule = pick('lineRule');
      if (line > 0 && (!rule || rule === 'auto')) css.push(`line-height:${Math.max(1, line / 240).toFixed(2)}`);
    }

    const segs = [''];
    await renderInline(kids(p), segs);
    const tag = level ? `h${level}` : 'p';
    const style = css.length ? ` style="${css.join(';')}"` : '';
    const before = pPr && isOn(kid(pPr, 'pageBreakBefore')) ? PAGE_BREAK : '';
    return before + segs.map((s, i) => {
      const body = (i === 0 ? marker : '') + s;
      // A paragraph that only holds a page break shouldn't leave blank lines around it
      if (!body && segs.length > 1) return '';
      return `<${tag}${style}>${body || '<br>'}</${tag}>`;
    }).join(PAGE_BREAK);
  };

  const renderTable = async (tbl) => {
    const rows = kids(tbl, 'tr');
    const grid = []; // grid[r][c] = { cell, rowspan } | 'merged'
    const cellsOut = [];
    for (let r = 0; r < rows.length; r += 1) {
      grid[r] = [];
      let col = 0;
      const rowCells = [];
      for (const tc of kids(rows[r], 'tc')) {
        const tcPr = kid(tc, 'tcPr');
        const span = Number(wAttr(kid(tcPr, 'gridSpan'), 'val') || 1);
        const vMerge = kid(tcPr, 'vMerge');
        const vm = vMerge ? (wAttr(vMerge, 'val') || 'continue') : null;
        if (vm === 'continue') {
          // extend the cell above in this column
          for (let up = r - 1; up >= 0; up -= 1) {
            const above = grid[up][col];
            if (above && above !== 'merged') { above.rowspan += 1; break; }
          }
          for (let k = 0; k < span; k += 1) grid[r][col + k] = 'merged';
        } else {
          const entry = { tc, span, rowspan: 1, shd: wAttr(kid(tcPr, 'shd'), 'fill') };
          for (let k = 0; k < span; k += 1) grid[r][col + k] = k === 0 ? entry : 'merged';
          rowCells.push(entry);
        }
        col += span;
      }
      cellsOut.push(rowCells);
    }
    let html = '<table>';
    for (let r = 0; r < cellsOut.length; r += 1) {
      html += '<tr>';
      for (const cell of cellsOut[r]) {
        const inner = await renderBlocks(kids(cell.tc));
        const attrs = [];
        if (cell.span > 1) attrs.push(`colspan="${cell.span}"`);
        if (cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`);
        if (cell.shd && /^[0-9a-f]{6}$/i.test(cell.shd)) attrs.push(`style="background-color:#${cell.shd}"`);
        html += `<td${attrs.length ? ` ${attrs.join(' ')}` : ''}>${inner || '<br>'}</td>`;
      }
      html += '</tr>';
    }
    return `${html}</table>`;
  };

  const renderBlocks = async (nodes) => {
    let html = '';
    for (const node of nodes) {
      const n = node.localName;
      if (n === 'p') html += await renderParagraph(node);
      else if (n === 'tbl') html += await renderTable(node);
      else if (n === 'sdt') html += await renderBlocks(kids(kid(node, 'sdtContent')));
      else if (n === 'customXml' || n === 'ins') html += await renderBlocks(kids(node));
    }
    return html;
  };

  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('This Word document has no content.');
  const html = await renderBlocks(kids(body));

  const core = await loadXml(zip, 'docProps/core.xml');
  const title = core?.getElementsByTagNameNS('*', 'title')[0]?.textContent?.trim() || '';

  return { html, title, warnings: [...warnings] };
}

const PAGE_BREAK = '<div class="html2pdf__page-break doc-page-break"></div>';
