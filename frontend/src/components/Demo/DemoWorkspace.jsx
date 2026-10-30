import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, Menu, MenuItem, ListItemText, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, CircularProgress, Snackbar, Alert, useMediaQuery
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import AddIcon from '@mui/icons-material/Add';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Side-effect import: registers the custom Quill formats (fonts, sizes, dividers, images…)
// and loads the editor styles, so the demo editor behaves exactly like the real one.
import '../DocumentEditor/DocumentEditor';
import WordRibbonToolbar from '../DocumentEditor/WordRibbonToolbar';
import SpreadsheetEditor from '../DocumentEditor/SpreadsheetEditor';
import PresentationEditor from '../DocumentEditor/PresentationEditor';
import SEO from '../SEO/SEO';
import {
  downloadDocAsPdf, downloadDocAsWord, downloadDocAsText,
  downloadSheetAsXlsx, downloadSheetAsCsv, downloadSheetAsPdf,
  downloadPptAsPptx, downloadPptAsPdf
} from '../../utils/documentExporter';
import { DEMO_TYPES, DEMO_LIMIT, getTypeMeta, createDemoDoc, loadDemoDocs, persistDemoDocs } from './demoStore';
import DemoTool, { DEMO_TOOLS } from './tools/DemoTools';
import './Demo.css';

const TYPE_ICONS = {
  doc: ArticleOutlinedIcon,
  sheet: GridOnOutlinedIcon,
  ppt: SlideshowOutlinedIcon
};

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // images are kept inline in the tab, so keep them small

const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── Rich-text editor for the demo (same ribbon + Quill setup as the workspace editor) ──
const DemoDocEditor = ({ content, onChange }) => {
  const quillRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [showParagraphMarks, setShowParagraphMarks] = useState(false);

  const modules = useMemo(() => ({
    history: { delay: 500, maxStack: 100, userOnly: true },
    clipboard: { matchVisual: false },
    table: true,
    toolbar: false
  }), []);

  // Images are read straight into the document (no upload — nothing leaves the browser)
  const insertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      if (file.size > MAX_IMAGE_BYTES) {
        window.dispatchEvent(new CustomEvent('demo-toast', { detail: { severity: 'warning', message: 'Demo images must be under 1.5 MB. Sign up to upload larger files.' } }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        const range = quill.getSelection(true) || { index: quill.getLength() };
        quill.insertEmbed(range.index, 'image', reader.result, 'user');
        quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const insertTable = useCallback((rows, cols) => {
    const table = quillRef.current?.getEditor()?.getModule('table');
    if (table) table.insertTable(rows, cols);
  }, []);

  const toggleListen = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.dispatchEvent(new CustomEvent('demo-toast', { detail: { severity: 'info', message: 'Speech dictation is not supported in this browser.' } }));
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const transcript = event.results[event.resultIndex][0].transcript;
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const sel = quill.getSelection(true) || { index: quill.getLength() };
      quill.insertText(sel.index, `${transcript} `, 'user');
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <div className="demo-editor-doc">
      <WordRibbonToolbar
        quillRef={quillRef}
        isListening={isListening}
        toggleListen={toggleListen}
        content={content}
        onInsertImage={insertImage}
        onInsertTable={insertTable}
        showParagraphMarks={showParagraphMarks}
        setShowParagraphMarks={setShowParagraphMarks}
      />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        // Only real typing marks the file as changed (Quill also fires once while normalising on load)
        onChange={(val, _delta, source) => onChange(val, source === 'user')}
        modules={modules}
        placeholder="Start typing your document…"
        className={`flex-1 flex flex-col min-h-0 custom-quill ${showParagraphMarks ? 'show-paragraph-marks' : ''}`}
      />
    </div>
  );
};

const DemoWorkspace = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState(() => loadDemoDocs());
  const [activeId, setActiveId] = useState(() => loadDemoDocs()[0]?.id || null);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // tools live only in memory; /demo?tool=img2pdf opens a tool directly (used by the landing page)
  const [activeTool, setActiveTool] = useState(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tool');
      return DEMO_TOOLS.some((x) => x.id === t) ? t : null;
    } catch {
      return null;
    }
  });
  // Phones and tablets: card home screen, and the chosen file or tool opens full screen
  const isCompact = useMediaQuery('(max-width: 960px)');
  const [mobileOpen, setMobileOpen] = useState(() => Boolean(activeTool));
  const pushedRef = useRef(false);

  // The phone's back button/gesture closes the full-screen view instead of leaving the demo
  useEffect(() => {
    const onPop = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        setMobileOpen(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openFullScreen = () => {
    setMobileOpen(true);
    if (!pushedRef.current) {
      window.history.pushState({ demoItem: true }, '');
      pushedRef.current = true;
    }
  };
  const closeFullScreen = () => {
    if (pushedRef.current) window.history.back(); // popstate handler closes the view
    else setMobileOpen(false);
  };

  const [toast, setToastState] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);
  const setToast = useCallback((t) => {
    if (t) setToastState(t);
    setToastOpen(Boolean(t));
  }, []);

  const activeDoc = docs.find((d) => d.id === activeId) || null;
  const activeMeta = activeDoc ? getTypeMeta(activeDoc.type) : null;
  const isDirty = activeDoc ? dirtyIds.has(activeDoc.id) : false;

  // Toasts raised from inside the editors
  useEffect(() => {
    const onToast = (e) => setToast(e.detail);
    window.addEventListener('demo-toast', onToast);
    return () => window.removeEventListener('demo-toast', onToast);
  }, [setToast]);

  // Warn before the tab is closed or reloaded while demo work exists
  useEffect(() => {
    if (docs.length === 0) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [docs.length]);

  const markDirty = (id) => setDirtyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  // Writes the current working copy of every file into this tab's sessionStorage
  const saveDocs = useCallback((nextDocs, savedId) => {
    const ok = persistDemoDocs(nextDocs);
    if (!ok) {
      setToast({ severity: 'error', message: 'This browser tab is out of demo space (images take the most room). Download your file now, or sign up for 25 MB of free cloud storage.' });
      return false;
    }
    setDirtyIds((prev) => {
      const next = new Set(prev);
      if (savedId) next.delete(savedId); else next.clear();
      return next;
    });
    return true;
  }, [setToast]);

  const handleCreate = (type) => {
    setActiveTool(null);
    const existing = docs.find((d) => d.type === type);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const doc = createDemoDoc(type);
    const next = [...docs, doc];
    setDocs(next);
    setActiveId(doc.id);
    persistDemoDocs(next);
  };

  const updateActive = (patch, userEdit = true) => {
    if (!activeDoc) return;
    setDocs((prev) => prev.map((d) => (d.id === activeDoc.id ? { ...d, ...patch } : d)));
    if (userEdit) markDirty(activeDoc.id);
  };

  const handleSave = () => {
    if (!activeDoc) return false;
    const savedAt = Date.now();
    const next = docs.map((d) => (d.id === activeDoc.id ? { ...d, savedAt } : d));
    if (!saveDocs(next, activeDoc.id)) return false;
    setDocs(next);
    setToast({ severity: 'success', message: `"${activeDoc.title || activeMeta.label}" saved in this browser tab. You can download it now.` });
    return true;
  };

  const handleDownload = async (formatId) => {
    setDownloadAnchor(null);
    if (!activeDoc) return;
    // Download always reflects the latest edits, so save first if needed
    if (isDirty || !activeDoc.savedAt) {
      if (!handleSave()) return;
    }
    const title = (activeDoc.title || activeMeta.defaultTitle).trim();
    const content = activeDoc.content;
    setDownloading(true);
    try {
      const key = `${activeDoc.type}:${formatId}`;
      const actions = {
        'doc:docx': () => downloadDocAsWord(title, content),
        'doc:pdf': () => downloadDocAsPdf(title, content),
        'doc:txt': () => downloadDocAsText(title, content),
        'sheet:xlsx': () => downloadSheetAsXlsx(title, content),
        'sheet:csv': () => downloadSheetAsCsv(title, content),
        'sheet:pdf': () => downloadSheetAsPdf(title, content),
        'ppt:pptx': () => downloadPptAsPptx(title, content),
        'ppt:pdf': () => downloadPptAsPdf(title, content)
      };
      await actions[key]?.();
    } catch (err) {
      console.error('[Demo download]', err);
      setToast({ severity: 'error', message: 'Download failed. Please try again.' });
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    const next = docs.filter((d) => d.id !== id);
    setDocs(next);
    persistDemoDocs(next);
    setDirtyIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    if (activeId === id) setActiveId(next[0]?.id || null);
  };

  const usedCount = docs.length;

  const editorSurface = activeDoc ? (
    <div className="demo-editor-surface">
      {activeDoc.type === 'sheet' ? (
        <SpreadsheetEditor
          key={activeDoc.id}
          content={activeDoc.content}
          onChange={(content) => updateActive({ content })}
        />
      ) : activeDoc.type === 'ppt' ? (
        <PresentationEditor
          key={activeDoc.id}
          content={activeDoc.content}
          docTitle={activeDoc.title}
          onChange={(content) => updateActive({ content })}
        />
      ) : (
        <DemoDocEditor
          key={activeDoc.id}
          content={activeDoc.content}
          onChange={(content, userEdit) => updateActive({ content }, userEdit)}
        />
      )}
    </div>
  ) : null;

  const downloadMenu = activeDoc ? (
    <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
      {activeMeta.formats.map((f) => (
        <MenuItem key={f.id} onClick={() => handleDownload(f.id)}>
          <ListItemText primary={f.label} />
        </MenuItem>
      ))}
    </Menu>
  ) : null;

  const docStatus = (doc) => (dirtyIds.has(doc.id) ? 'Unsaved changes' : doc.savedAt ? `Saved ${formatTime(doc.savedAt)}` : 'Not saved yet');

  const deleteDialog = (
    <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
      <DialogTitle sx={{ fontWeight: 800 }}>Delete this demo file?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          It is removed from this tab for good. You can then create a new one in its place.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
        <Button color="error" variant="contained" disableElevation onClick={handleDelete}>Delete</Button>
      </DialogActions>
    </Dialog>
  );

  const toastEl = (
    <Snackbar
      open={toastOpen}
      autoHideDuration={5000}
      onClose={() => setToast(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={toast?.severity || 'info'} variant="filled" onClose={() => setToast(null)}>{toast?.message || ''}</Alert>
    </Snackbar>
  );

  /* ── Phones & tablets ─────────────────────────────────── */
  if (isCompact) {
    const openTool = (id) => { setActiveTool(id); openFullScreen(); };
    const openDoc = (type) => { handleCreate(type); openFullScreen(); };
    const fullTool = mobileOpen && activeTool ? DEMO_TOOLS.find((t) => t.id === activeTool) : null;
    const fullDoc = mobileOpen && !activeTool ? activeDoc : null;

    return (
      <Box className="demo-root demo-m">
        <SEO title="Free Demo Workspace" description="Try DocsApp free: create a document, a spreadsheet and a presentation, or use free PDF and image tools, without signing up." />

        {fullTool || fullDoc ? (
          /* ── Full-screen file or tool ── */
          <div className="demo-m-full" role="dialog" aria-modal="true" aria-label={fullTool ? fullTool.label : (fullDoc.title || activeMeta.label)}>
            <header className="demo-m-bar">
              <IconButton onClick={closeFullScreen} aria-label="Back to all files and tools" edge="start">
                <ArrowBackIcon />
              </IconButton>
              {fullTool ? (
                <strong className="demo-m-bar-title">{fullTool.label}</strong>
              ) : (
                <>
                  <input
                    className="demo-title-input demo-m-title-input"
                    value={fullDoc.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    aria-label="File name"
                    maxLength={120}
                  />
                  <IconButton
                    onClick={handleSave}
                    disabled={!isDirty && Boolean(fullDoc.savedAt)}
                    aria-label="Save"
                    className={isDirty ? 'demo-m-dirty' : ''}
                  >
                    <SaveOutlinedIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => setDownloadAnchor(e.currentTarget)}
                    disabled={downloading || (!fullDoc.savedAt && !isDirty)}
                    aria-label="Download"
                    color="primary"
                  >
                    {downloading ? <CircularProgress size={20} /> : <FileDownloadOutlinedIcon />}
                  </IconButton>
                  {downloadMenu}
                </>
              )}
            </header>
            {fullDoc && (
              <div className={`demo-m-status ${isDirty ? 'is-dirty' : ''}`}>
                {isDirty ? 'Unsaved changes — tap save to keep them in this tab' : fullDoc.savedAt ? 'Saved in this tab. Download to keep a copy.' : 'Not saved yet'}
              </div>
            )}
            <div className="demo-m-content">
              {fullTool ? <DemoTool key={fullTool.id} toolId={fullTool.id} notify={setToast} /> : editorSurface}
            </div>
          </div>
        ) : (
          /* ── Home: cards ── */
          <>
            <header className="demo-topbar">
              <RouterLink to="/" className="demo-brand">
                <span className="demo-brand-mark"><MenuBookIcon sx={{ fontSize: 20 }} /></span>
                <span className="demo-brand-name">DocsApp</span>
              </RouterLink>
              <div className="demo-topbar-spacer" />
              <Button variant="text" size="small" onClick={() => navigate('/login')} sx={{ color: 'var(--c-ink)', fontWeight: 700 }}>Sign in</Button>
              <Button variant="contained" size="small" disableElevation onClick={() => navigate('/login?mode=signup')} sx={{ fontWeight: 700 }}>Sign up</Button>
            </header>

            <div className="demo-m-home">
              <div className="demo-m-intro">
                <h1>Demo workspace</h1>
                <p>No sign-up needed. Everything stays in this browser tab and is erased when you close it, so download what you want to keep.</p>
              </div>

              <section aria-labelledby="demo-m-files">
                <div className="demo-m-section-head">
                  <h2 id="demo-m-files">Your files</h2>
                  <span className="demo-count">{usedCount}/{DEMO_LIMIT}</span>
                </div>
                <div className="demo-m-grid">
                  {DEMO_TYPES.map((meta) => {
                    const Icon = TYPE_ICONS[meta.type];
                    const doc = docs.find((d) => d.type === meta.type);
                    return (
                      <div key={meta.type} className={`demo-m-card demo-slot-${meta.type} ${doc ? 'is-used' : ''}`}>
                        <button type="button" className="demo-m-card-main" onClick={() => openDoc(meta.type)}>
                          <span className="demo-slot-icon"><Icon sx={{ fontSize: 24 }} /></span>
                          <span className="demo-m-card-text">
                            <strong>{doc ? (doc.title || meta.defaultTitle) : meta.label}</strong>
                            <span>{doc ? docStatus(doc) : meta.blurb}</span>
                          </span>
                          <span className="demo-m-card-cta">{doc ? 'Open' : 'Create'}{doc ? <ChevronRightIcon sx={{ fontSize: 18 }} /> : <AddIcon sx={{ fontSize: 18 }} />}</span>
                        </button>
                        {doc && (
                          <IconButton size="small" className="demo-m-card-delete" onClick={() => setConfirmDelete(doc.id)} aria-label={`Delete ${meta.label}`}>
                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section aria-labelledby="demo-m-tools">
                <div className="demo-m-section-head">
                  <h2 id="demo-m-tools">Free tools</h2>
                </div>
                <div className="demo-m-grid">
                  {DEMO_TOOLS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <div key={t.id} className="demo-m-card demo-slot-tool">
                        <button type="button" className="demo-m-card-main" onClick={() => openTool(t.id)}>
                          <span className="demo-slot-icon"><Icon sx={{ fontSize: 24 }} /></span>
                          <span className="demo-m-card-text">
                            <strong>{t.label}</strong>
                            <span>{t.blurb}</span>
                          </span>
                          <span className="demo-m-card-cta">Open<ChevronRightIcon sx={{ fontSize: 18 }} /></span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <p className="demo-m-foot">
                The demo allows one document, one spreadsheet and one presentation.{' '}
                <RouterLink to="/login?mode=signup">Create a free account</RouterLink> for unlimited files and 25 MB of cloud storage.
              </p>
            </div>
          </>
        )}

        {deleteDialog}
        {toastEl}
      </Box>
    );
  }

  return (
    <Box className="demo-root">
      <SEO title="Free Demo Workspace" description="Try DocsApp free: create a document, a spreadsheet and a presentation without signing up." />

      {/* ── Top bar ── */}
      <header className="demo-topbar">
        <RouterLink to="/" className="demo-brand">
          <span className="demo-brand-mark"><MenuBookIcon sx={{ fontSize: 20 }} /></span>
          <span className="demo-brand-name">DocsApp</span>
        </RouterLink>
        <span className="demo-pill">Demo workspace</span>
        <div className="demo-topbar-spacer" />
        <Button variant="text" onClick={() => navigate('/login')} sx={{ color: 'var(--c-ink)', fontWeight: 700 }}>Sign in</Button>
        <Button variant="contained" disableElevation onClick={() => navigate('/login?mode=signup')} sx={{ fontWeight: 700 }}>
          Sign up free
        </Button>
      </header>

      {/* ── Demo notice ── */}
      <div className="demo-notice" role="note">
        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        <span>
          <strong>Demo mode — no sign-up needed.</strong> Your files and tool results stay only in this browser tab and are never uploaded or stored in our database.
          Closing the tab or browser erases them, so <strong>download</strong> anything you want to keep.
        </span>
        <RouterLink to="/login?mode=signup" className="demo-notice-link">Get 25 MB free cloud storage →</RouterLink>
      </div>

      <div className="demo-body">
        {/* ── File slots (one of each type) ── */}
        <aside className="demo-sidebar" aria-label="Demo files">
          <div className="demo-sidebar-head">
            <span>Your demo files</span>
            <span className="demo-count">{usedCount}/{DEMO_LIMIT}</span>
          </div>
          {DEMO_TYPES.map((meta) => {
            const Icon = TYPE_ICONS[meta.type];
            const doc = docs.find((d) => d.type === meta.type);
            const isActive = !activeTool && doc && doc.id === activeId;
            return (
              <div
                key={meta.type}
                className={`demo-slot demo-slot-${meta.type} ${isActive ? 'is-active' : ''} ${doc ? 'is-used' : ''}`}
              >
                <button type="button" className="demo-slot-main" onClick={() => handleCreate(meta.type)}>
                  <span className="demo-slot-icon"><Icon sx={{ fontSize: 22 }} /></span>
                  <span className="demo-slot-text">
                    <span className="demo-slot-title">{doc ? (doc.title || meta.defaultTitle) : `New ${meta.label}`}</span>
                    <span className="demo-slot-sub">
                      {doc
                        ? (dirtyIds.has(doc.id) ? 'Unsaved changes' : doc.savedAt ? `Saved ${formatTime(doc.savedAt)}` : 'Not saved yet')
                        : meta.blurb}
                    </span>
                  </span>
                  {!doc && <AddIcon sx={{ fontSize: 20, color: 'var(--c-accent)' }} />}
                </button>
                {doc && (
                  <Tooltip title="Delete demo file">
                    <IconButton size="small" className="demo-slot-delete" onClick={() => setConfirmDelete(doc.id)} aria-label={`Delete ${meta.label}`}>
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            );
          })}
          <div className="demo-sidebar-head demo-tools-head">
            <span>Free tools</span>
          </div>
          {DEMO_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.id} className={`demo-slot demo-slot-tool is-used ${activeTool === t.id ? 'is-active' : ''}`}>
                <button type="button" className="demo-slot-main" onClick={() => setActiveTool(t.id)}>
                  <span className="demo-slot-icon"><Icon sx={{ fontSize: 22 }} /></span>
                  <span className="demo-slot-text">
                    <span className="demo-slot-title">{t.label}</span>
                    <span className="demo-slot-sub">{t.blurb}</span>
                  </span>
                </button>
              </div>
            );
          })}
          <div className="demo-sidebar-foot">
            The free demo allows one document, one spreadsheet and one presentation.
            <RouterLink to="/login?mode=signup"> Create an account</RouterLink> for unlimited files, groups and cloud saving.
          </div>
        </aside>

        {/* ── Editor ── */}
        <main className="demo-main">
          {activeTool ? (
            <DemoTool key={activeTool} toolId={activeTool} notify={setToast} />
          ) : !activeDoc ? (
            <div className="demo-empty">
              <h1>Pick something to create</h1>
              <p>Everything works like the full app — edit, format, then save and download. No account needed.</p>
              <div className="demo-empty-grid">
                {DEMO_TYPES.map((meta) => {
                  const Icon = TYPE_ICONS[meta.type];
                  return (
                    <button key={meta.type} type="button" className={`demo-empty-card demo-slot-${meta.type}`} onClick={() => handleCreate(meta.type)}>
                      <span className="demo-slot-icon"><Icon sx={{ fontSize: 28 }} /></span>
                      <strong>{meta.label}</strong>
                      <span>{meta.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <h2 className="demo-empty-sub">Or use a free tool</h2>
              <div className="demo-empty-tools">
                {DEMO_TOOLS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} type="button" className="demo-tool-chip" onClick={() => setActiveTool(t.id)}>
                      <Icon sx={{ fontSize: 20 }} />
                      <span><strong>{t.label}</strong><em>{t.blurb}</em></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="demo-editor-shell">
              <div className="demo-editor-bar">
                <input
                  className="demo-title-input"
                  value={activeDoc.title}
                  onChange={(e) => updateActive({ title: e.target.value })}
                  aria-label="File name"
                  maxLength={120}
                />
                <span className={`demo-save-state ${isDirty ? 'is-dirty' : ''}`}>
                  {isDirty
                    ? 'Unsaved changes'
                    : activeDoc.savedAt
                      ? <><CheckCircleOutlineIcon sx={{ fontSize: 15 }} /> Saved in this tab</>
                      : 'Not saved yet'}
                </span>
                <div className="demo-topbar-spacer" />
                <Button
                  variant="outlined"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSave}
                  disabled={!isDirty && Boolean(activeDoc.savedAt)}
                >
                  Save
                </Button>
                <Tooltip title={!activeDoc.savedAt && !isDirty ? 'Save your file first, then download it' : ''}>
                  <span>
                    <Button
                      variant="contained"
                      disableElevation
                      startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
                      onClick={(e) => setDownloadAnchor(e.currentTarget)}
                      disabled={downloading || (!activeDoc.savedAt && !isDirty)}
                    >
                      Download
                    </Button>
                  </span>
                </Tooltip>
                {downloadMenu}
              </div>

              {editorSurface}
            </div>
          )}
        </main>
      </div>

      {deleteDialog}
      {toastEl}
    </Box>
  );
};

export default DemoWorkspace;
