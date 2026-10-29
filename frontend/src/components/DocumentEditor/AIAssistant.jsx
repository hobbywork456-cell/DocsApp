import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { Paper, Box, Typography, IconButton, Menu, MenuItem, TextField, Button, Tooltip, Chip, ListItemText } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TuneIcon from '@mui/icons-material/Tune';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/StopCircleOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/AddCircleOutlined';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import './AIAssistant.css';

const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/api/ai`;
const MODEL_STORAGE_KEY = 'ai-assistant-model';

// One-click actions per editor type: label + the instruction sent to the model
const QUICK_ACTIONS = {
  doc: [
    { label: 'Improve writing', prompt: 'Improve the writing: make it clearer, more concise and better structured, keeping the meaning.' },
    { label: 'Fix grammar', prompt: 'Fix all spelling, grammar and punctuation mistakes. Change nothing else.' },
    { label: 'Summarize', prompt: 'Summarize the key points as a short bulleted list.' },
    { label: 'Make shorter', prompt: 'Rewrite it to be about half as long without losing important information.' },
    { label: 'Make longer', prompt: 'Expand it with more detail, examples and explanation.' },
    { label: 'Professional tone', prompt: 'Rewrite it in a polished, professional business tone.' },
    { label: 'Continue writing', prompt: 'Continue writing from where the text ends, in the same style and tone. Return only the new text.' },
    { label: 'Outline', prompt: 'Create a clear outline with headings and sub-points for this topic.' }
  ],
  sheet: [
    { label: 'Analyse data', prompt: 'Analyse this spreadsheet data: key insights, trends and anything unusual, as bullet points.' },
    { label: 'Summarize figures', prompt: 'Summarize the most important numbers and totals in a short paragraph.' },
    { label: 'Suggest formulas', prompt: 'Suggest useful spreadsheet formulas for this data (Excel syntax) and explain what each does.' },
    { label: 'Write a report', prompt: 'Write a short business report based on this data with a title, summary and key findings.' }
  ],
  ppt: [
    { label: 'Speaker notes', prompt: 'Write concise speaker notes for each slide, labelled by slide number.' },
    { label: 'Improve slides', prompt: 'Suggest clearer, punchier titles and bullet points for each slide.' },
    { label: 'Summarize deck', prompt: 'Summarize this presentation in 5 bullet points.' },
    { label: 'Add a slide', prompt: 'Draft the content (title and 3-5 bullets) for one more slide that would strengthen this deck.' }
  ]
};

const parseSse = (buffer, onEvent) => {
  const events = buffer.split('\n\n');
  const rest = events.pop();
  events.forEach((block) => {
    const line = block.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return;
    try {
      onEvent(JSON.parse(line.slice(6)));
    } catch {
      // ignore malformed keep-alive lines
    }
  });
  return rest;
};

const AIAssistant = ({ open, onClose, docType = 'doc', getContext, selectionText = '', onInsert, canInsert = true }) => {
  const nodeRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const outputRef = useRef(null);

  const [models, setModels] = useState([]);
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem(MODEL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [lastRequest, setLastRequest] = useState(null); // { prompt, usedSelection }
  const [streamText, setStreamText] = useState('');
  const [resultHtml, setResultHtml] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [status, setStatus] = useState('idle'); // idle | waiting | streaming | done | error
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const busy = status === 'waiting' || status === 'streaming';
  const hasSelection = Boolean(selectionText && selectionText.trim());

  // Load the model list once the panel is first opened
  useEffect(() => {
    if (!open || models.length) return;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/models`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setModels(data.models || []);
        setModel((m) => (data.models || []).some((x) => x.id === m) ? m : data.defaultModel);
        if (!data.configured) setError('The AI assistant is not configured on the server (GEMINI_API_KEY missing).');
      })
      .catch(() => {});
  }, [open, models.length]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Stop any request when the panel closes or unmounts
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (status === 'streaming' && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [streamText, status]);

  const run = useCallback(async (instruction) => {
    const text = (instruction ?? prompt).trim();
    if (!text || busy) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const context = getContext ? getContext() : {};
    setLastRequest({ prompt: text, usedSelection: Boolean(context.selection && context.selection.trim()) });
    setStreamText('');
    setResultHtml('');
    setModelUsed('');
    setError('');
    setStatus('waiting');
    if (instruction === undefined) setPrompt('');

    try {
      const response = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ prompt: text, model, context }),
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = parseSse(buffer, (evt) => {
          if (evt.type === 'model') {
            setModelUsed(evt.label || evt.model);
            setStatus('streaming');
          } else if (evt.type === 'chunk') {
            setStreamText((t) => t + evt.text);
          } else if (evt.type === 'done') {
            finished = true;
            setResultHtml(evt.html);
            setStreamText(evt.text);
            setStatus('done');
          } else if (evt.type === 'error') {
            finished = true;
            setError(evt.message);
            setStatus('error');
          }
        });
      }
      if (!finished) throw new Error('The connection ended before the answer was complete. Please retry.');
    } catch (err) {
      if (err.name === 'AbortError') {
        // Stopped by the user: keep whatever already arrived
        setStatus((s) => (s === 'streaming' ? 'done' : 'idle'));
        return;
      }
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }, [prompt, busy, getContext, model]);

  const stop = () => abortRef.current?.abort();

  const outputHtml = resultHtml || '';
  const outputText = streamText;

  const handleCopy = async () => {
    try {
      if (outputHtml && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({
          'text/html': new Blob([outputHtml], { type: 'text/html' }),
          'text/plain': new Blob([outputText], { type: 'text/plain' })
        })]);
      } else {
        await navigator.clipboard.writeText(outputText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not access the clipboard. Select the text and press Ctrl+C.');
    }
  };

  // Stopped early → no server HTML yet: insert the plain text with paragraph breaks
  const insertable = () => outputHtml || outputText.split(/\n{2,}/).map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')}</p>`).join('');

  const handleInsert = (replace) => {
    onInsert?.(insertable(), { replace });
  };

  const selectModel = (id) => {
    setModel(id);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch {
      // ignore storage errors
    }
    setAnchorEl(null);
  };

  if (!open) return null;

  const actions = QUICK_ACTIONS[docType] || QUICK_ACTIONS.doc;
  const currentModel = models.find((m) => m.id === model);
  const showOutput = status !== 'idle' || outputText;

  return (
    <Draggable nodeRef={nodeRef} handle=".ai-drag-handle" bounds="body" cancel=".ai-no-drag">
      <Paper
        ref={nodeRef}
        elevation={24}
        className="ai-panel"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            if (busy) stop();
            else onClose();
          }
        }}
      >
        {/* Header / drag handle */}
        <Box className="ai-drag-handle ai-header">
          <Typography className="ai-title">
            <AutoAwesomeIcon sx={{ fontSize: 18 }} /> AI Assistant
          </Typography>
          <Box className="ai-no-drag" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title={`Model: ${currentModel?.label || 'Default'}`}>
              <button type="button" className="ai-model-pill" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <TuneIcon sx={{ fontSize: 14 }} /> {currentModel?.label?.replace('Gemini ', '') || 'Model'}
              </button>
            </Tooltip>
            <Tooltip title="Close (Esc)">
              <IconButton size="small" onClick={onClose} sx={{ color: '#0b1410', p: 0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} sx={{ zIndex: 100000 }}
          slotProps={{ paper: { sx: { width: 260, borderRadius: '12px' } } }}>
          {models.map((m) => (
            <MenuItem key={m.id} selected={m.id === model} onClick={() => selectModel(m.id)}>
              <ListItemText primary={m.label} secondary={m.hint}
                slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 600 } }, secondary: { sx: { fontSize: 11.5 } } }} />
            </MenuItem>
          ))}
        </Menu>

        <Box className="ai-body ai-no-drag">
          {/* What the AI will read */}
          <Box className={`ai-context ${hasSelection ? 'has-selection' : ''}`}>
            {hasSelection ? <HighlightAltIcon sx={{ fontSize: 15 }} /> : <TextSnippetOutlinedIcon sx={{ fontSize: 15 }} />}
            <span>
              {hasSelection
                ? `Working on your selection (${selectionText.trim().split(/\s+/).length} words)`
                : `Working on the whole ${docType === 'sheet' ? 'spreadsheet' : docType === 'ppt' ? 'presentation' : 'document'}`}
            </span>
          </Box>

          {/* Quick actions */}
          <Box className="ai-chips">
            {actions.map((a) => (
              <Chip key={a.label} label={a.label} size="small" disabled={busy} onClick={() => run(a.prompt)} className="ai-chip" />
            ))}
          </Box>

          {/* Output */}
          {showOutput ? (
            <Box className="ai-output-wrap">
              {lastRequest && <div className="ai-request">“{lastRequest.prompt.length > 110 ? `${lastRequest.prompt.slice(0, 110)}…` : lastRequest.prompt}”</div>}
              <Box ref={outputRef} className="ai-output">
                {status === 'waiting' && (
                  <div className="ai-thinking"><span /><span /><span /> <em>Thinking…</em></div>
                )}
                {outputHtml ? (
                  <div className="ai-result custom-quill" dangerouslySetInnerHTML={{ __html: outputHtml }} />
                ) : outputText ? (
                  <div className="ai-result ai-streaming">{outputText}<span className="ai-caret" /></div>
                ) : null}
                {error && <div className="ai-error">{error}</div>}
              </Box>
              {modelUsed && status !== 'waiting' && <div className="ai-meta">{modelUsed}{status === 'streaming' ? ' · writing…' : ''}</div>}

              {(status === 'done' || (status === 'error' && outputText)) && outputText && (
                <Box className="ai-actions">
                  {canInsert && lastRequest?.usedSelection && (
                    <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={() => handleInsert(true)} className="ai-primary-btn">
                      Replace selection
                    </Button>
                  )}
                  {canInsert && (
                    <Button size="small" variant={lastRequest?.usedSelection ? 'outlined' : 'contained'} startIcon={<AddIcon />}
                      onClick={() => handleInsert(false)} className={lastRequest?.usedSelection ? 'ai-secondary-btn' : 'ai-primary-btn'}>
                      {lastRequest?.usedSelection ? 'Insert below' : 'Insert'}
                    </Button>
                  )}
                  <Tooltip title={copied ? 'Copied' : 'Copy'}>
                    <IconButton size="small" onClick={handleCopy} className="ai-icon-btn">
                      {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Try again">
                    <IconButton size="small" onClick={() => lastRequest && run(lastRequest.prompt)} className="ai-icon-btn">
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              {!canInsert && status === 'done' && (
                <div className="ai-hint">Copy the result and paste it where you need it.</div>
              )}
            </Box>
          ) : (
            <Box className="ai-empty">
              <AutoAwesomeIcon sx={{ fontSize: 40, color: '#1f8a5b', opacity: 0.25 }} />
              <Typography variant="body2">
                Pick a quick action or describe what you need. Select text first to work on just that part.
              </Typography>
            </Box>
          )}

          {/* Prompt */}
          <Box className="ai-input-row">
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              minRows={1}
              maxRows={5}
              placeholder={hasSelection ? 'What should I do with the selection?' : 'Ask AI to write, edit or explain…'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  run();
                }
              }}
              slotProps={{ input: { className: 'ai-input' } }}
            />
            {busy ? (
              <Tooltip title="Stop">
                <IconButton onClick={stop} className="ai-send-btn stop"><StopIcon /></IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Send (Enter)">
                <span>
                  <IconButton onClick={() => run()} disabled={!prompt.trim()} className="ai-send-btn"><SendIcon fontSize="small" /></IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>
    </Draggable>
  );
};

export default AIAssistant;
