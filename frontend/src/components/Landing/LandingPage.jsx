import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import axios from 'axios';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SEO from '../SEO/SEO';
import PlanCard from '../Subscription/PlanCard';
import './Landing.css';

const API_URL = import.meta.env.VITE_API_URL;

const FEATURES = [
  { icon: ArticleOutlinedIcon, title: 'Documents', text: 'A Word-style editor with fonts, styles, lists, tables, images and page layout.' },
  { icon: GridOnOutlinedIcon, title: 'Spreadsheets', text: 'Excel-style sheets with formulas, number formats, multiple tabs and formatting.' },
  { icon: SlideshowOutlinedIcon, title: 'Presentations', text: 'Build slide decks with themes, shapes and speaker notes, then present full screen.' },
  { icon: GroupsOutlinedIcon, title: 'Team groups', text: 'Invite people into shared groups and work on the same files together.' },
  { icon: AutoAwesomeOutlinedIcon, title: 'AI assistant', text: 'Draft, rewrite and summarise text without leaving the editor.' },
  { icon: FileDownloadOutlinedIcon, title: 'Export anywhere', text: 'Download as .docx, .xlsx, .pptx, PDF, CSV or plain text.' },
  { icon: HistoryOutlinedIcon, title: 'Version history', text: 'Look back at earlier versions and compare documents side by side.' },
  { icon: CloudOutlinedIcon, title: 'Cloud storage', text: 'Every account starts with 25 MB free. Add more any time with a storage plan.' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [tariff, setTariff] = useState(null);
  const [tariffError, setTariffError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_URL}/subscription/tariff`)
      .then((res) => { if (!cancelled) setTariff(res.data); })
      .catch(() => { if (!cancelled) setTariffError(true); });
    return () => { cancelled = true; };
  }, []);

  const freeMB = tariff?.freeStorageMB || 25;
  const symbol = tariff?.currencySymbol || '₹';
  const tiers = tariff?.tiers || [];

  const goSignIn = () => navigate('/login');
  const goSignUp = () => navigate('/login?mode=signup');
  const goDemo = () => navigate('/demo');

  return (
    <div className="lp-root">
      <SEO title="Documents, sheets & slides in one workspace" description="DocsApp: create documents, spreadsheets and presentations, collaborate in groups and export anywhere. Try the free demo without signing up." />

      {/* ── Navigation ── */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <RouterLink to="/" className="lp-brand" aria-label="DocsApp home">
            <span className="lp-brand-mark"><MenuBookIcon sx={{ fontSize: 20 }} /></span>
            <span className="lp-brand-name">DocsApp</span>
          </RouterLink>
          <nav className="lp-nav-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#demo">Free demo</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="lp-nav-actions">
            <Button variant="text" onClick={goSignIn} sx={{ color: 'var(--c-ink)', fontWeight: 700 }}>Sign in</Button>
            <Button variant="contained" disableElevation onClick={goSignUp} sx={{ fontWeight: 700 }}>Sign up</Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Documents · Sheets · Slides</span>
            <h1>Write, calculate and present — all in one calm workspace.</h1>
            <p className="lp-lead">
              DocsApp brings a document editor, a spreadsheet and a presentation builder together, with team groups,
              an AI assistant and one-click export to Office formats.
            </p>
            <div className="lp-hero-ctas">
              <Button
                variant="contained"
                size="large"
                disableElevation
                startIcon={<PlayArrowRoundedIcon />}
                onClick={goDemo}
                sx={{ fontWeight: 800, px: 3, py: 1.4, fontSize: '1rem' }}
              >
                Try the demo — no sign-up
              </Button>
              <Button variant="outlined" size="large" onClick={goSignUp} sx={{ fontWeight: 700, px: 3, py: 1.4, fontSize: '1rem' }}>
                Create free account
              </Button>
            </div>
            <ul className="lp-hero-points">
              <li><CheckRoundedIcon sx={{ fontSize: 18 }} /> {freeMB} MB free cloud storage</li>
              <li><CheckRoundedIcon sx={{ fontSize: 18 }} /> Export to .docx, .xlsx, .pptx &amp; PDF</li>
              <li><CheckRoundedIcon sx={{ fontSize: 18 }} /> Already a member? <button type="button" onClick={goSignIn} className="lp-inline-link">Sign in</button></li>
            </ul>
          </div>

          {/* Product preview (pure CSS illustration of the three editors) */}
          <div className="lp-preview" aria-hidden="true">
            <div className="lp-window lp-window-doc">
              <div className="lp-window-bar"><i /><i /><i /><span>Quarterly report.docx</span></div>
              <div className="lp-window-body">
                <div className="lp-line lp-line-h" />
                <div className="lp-line" /><div className="lp-line" /><div className="lp-line lp-line-s" />
                <div className="lp-line" /><div className="lp-line lp-line-m" />
              </div>
            </div>
            <div className="lp-window lp-window-sheet">
              <div className="lp-window-bar"><i /><i /><i /><span>Budget.xlsx</span></div>
              <div className="lp-sheet">
                {Array.from({ length: 20 }).map((_, i) => <span key={i} className={i < 4 ? 'is-head' : i % 4 === 3 ? 'is-num' : ''} />)}
              </div>
            </div>
            <div className="lp-window lp-window-ppt">
              <div className="lp-window-bar"><i /><i /><i /><span>Pitch.pptx</span></div>
              <div className="lp-slide">
                <div className="lp-slide-title" />
                <div className="lp-slide-bars"><span style={{ height: '40%' }} /><span style={{ height: '65%' }} /><span style={{ height: '50%' }} /><span style={{ height: '85%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Overview</span>
            <h2>Everything your team writes, in one place</h2>
            <p>Familiar Office-style editors in the browser, organised into groups you share with your team.</p>
          </div>
          <div className="lp-feature-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="lp-feature">
                <span className="lp-feature-icon"><Icon sx={{ fontSize: 22 }} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo explainer ── */}
      <section id="demo" className="lp-section lp-demo">
        <div className="lp-container lp-demo-grid">
          <div>
            <span className="lp-eyebrow">Free demo workspace</span>
            <h2>Try it before you sign up</h2>
            <p>
              Open the demo and create one document, one spreadsheet and one presentation — no account, no email.
              Edit them with the full editors, save, and download your files.
            </p>
            <Button variant="contained" size="large" disableElevation startIcon={<PlayArrowRoundedIcon />} onClick={goDemo} sx={{ fontWeight: 800, mt: 1 }}>
              Open demo workspace
            </Button>
          </div>
          <ol className="lp-steps">
            <li><strong>Create</strong><span>Up to 3 files: a document, a sheet and a presentation.</span></li>
            <li><strong>Edit &amp; save</strong><span>Saving keeps them in this browser tab while you work.</span></li>
            <li><strong>Download</strong><span>Export as Word, Excel, PowerPoint or PDF to keep a copy.</span></li>
            <li className="is-warn"><strong>Close = gone</strong><span>Demo files are never stored on our servers. Closing the browser erases them.</span></li>
          </ol>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Pricing</span>
            <h2>Start free. Add storage only when you need it.</h2>
            <p>Every new and existing account gets {freeMB} MB free. Extra storage is added to your account as soon as your payment is confirmed.</p>
          </div>
          <div className="pcard-grid">
            <PlanCard
              free
              freeStorageMB={freeMB}
              currencySymbol={symbol}
              actionLabel="Sign up free"
              onAction={goSignUp}
            />
            {tiers.map((tier) => (
              <PlanCard
                key={tier.id}
                plan={tier}
                currencySymbol={symbol}
                actionLabel="Get started"
                actionVariant="outline"
                onAction={goSignUp}
              />
            ))}
          </div>
          {tariffError && (
            <p className="lp-price-note">Paid plans couldn&apos;t be loaded right now. Sign in to see the current plans.</p>
          )}
          {tiers.length > 0 && (
            <p className="lp-price-note">Sign in, then open <strong>Add Subscription</strong> in your workspace to choose a plan and pay securely with Razorpay (UPI, cards, net banking).</p>
          )}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-cta">
            <h2>Ready to get started?</h2>
            <p>Try the demo right now, or create your free account and keep everything in the cloud.</p>
            <div className="lp-hero-ctas lp-cta-buttons">
              <Button variant="contained" size="large" disableElevation onClick={goDemo} sx={{ fontWeight: 800, bgcolor: '#fff', color: '#2f3a33', '&:hover': { bgcolor: '#f1f4ef' } }}>
                Try the demo
              </Button>
              <Button variant="outlined" size="large" onClick={goSignUp} sx={{ fontWeight: 700, color: '#fff', borderColor: 'rgba(255,255,255,0.7)', bgcolor: 'transparent', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                Sign up free
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-brand-name">DocsApp</span>
          <span>© {new Date().getFullYear()} DocsApp. Cloud documentation workspace.</span>
          <div className="lp-footer-links">
            <button type="button" onClick={goSignIn} className="lp-inline-link">Sign in</button>
            <button type="button" onClick={goSignUp} className="lp-inline-link">Sign up</button>
            <button type="button" onClick={goDemo} className="lp-inline-link">Demo</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
