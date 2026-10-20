// Presentation themes, layout definitions, and initial slide templates

export const SLIDE_THEMES = {
  emeraldGradient: {
    id: 'emeraldGradient',
    name: 'DocsApp Gradient',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #1e3a5f 70%, #064e3b 100%)',
    textColor: '#ffffff',
    titleColor: '#60a5fa',
    accentColor: '#4ade80',
    cardBg: 'rgba(255, 255, 255, 0.08)'
  },
  midnightDark: {
    id: 'midnightDark',
    name: 'Midnight Dark',
    bg: '#090d16',
    textColor: '#e2e8f0',
    titleColor: '#38bdf8',
    accentColor: '#a78bfa',
    cardBg: 'rgba(30, 41, 59, 0.6)'
  },
  minimalLight: {
    id: 'minimalLight',
    name: 'Minimal Light',
    bg: '#ffffff',
    textColor: '#334155',
    titleColor: '#326127',
    accentColor: '#2563eb',
    cardBg: '#f8fafc'
  },
  sunsetWarm: {
    id: 'sunsetWarm',
    name: 'Sunset Copper',
    bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 40%, #9a3412 70%, #ea580c 100%)',
    textColor: '#ffffff',
    titleColor: '#fdba74',
    accentColor: '#fbbf24',
    cardBg: 'rgba(255, 255, 255, 0.1)'
  },
  cyberNeon: {
    id: 'cyberNeon',
    name: 'Cyber Violet',
    bg: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
    textColor: '#fafafa',
    titleColor: '#c084fc',
    accentColor: '#e879f9',
    cardBg: 'rgba(192, 132, 252, 0.08)'
  },
  oceanBreeze: {
    id: 'oceanBreeze',
    name: 'Ocean Breeze',
    bg: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0284c7 100%)',
    textColor: '#ffffff',
    titleColor: '#38bdf8',
    accentColor: '#34d399',
    cardBg: 'rgba(255, 255, 255, 0.1)'
  }
};

export const SLIDE_LAYOUTS = [
  {
    id: 'title',
    name: 'Title Slide',
    description: 'Headline and subtitle for presentation or keynote opening'
  },
  {
    id: 'bullets',
    name: 'Title & Bullets',
    description: 'Header with dynamic bullet points and talking cues'
  },
  {
    id: 'two-column',
    name: 'Two Columns',
    description: 'Side-by-side comparison or dual concept layout'
  },
  {
    id: 'three-column',
    name: 'Three Cards',
    description: 'Trio cards for pillars, features, or 3-step processes'
  },
  {
    id: 'metric',
    name: 'Big Number / Stat',
    description: 'High-impact KPI number with description highlight'
  },
  {
    id: 'quote',
    name: 'Quote / Callout',
    description: 'Large quotation marks with author attribution'
  },
  {
    id: 'section',
    name: 'Section Divider',
    description: 'Chapter break slide with accent bar and title'
  },
  {
    id: 'comparison',
    name: 'Comparison Matrix',
    description: 'Option A vs Option B side-by-side feature matrix'
  },
  {
    id: 'media',
    name: 'Media & Caption',
    description: 'Image / media preview block with title and notes'
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Freeform slide for notes, diagram, or custom text'
  }
];

export const getInitialDeck = (docTitle = 'Project Presentation') => ({
  themeId: 'emeraldGradient',
  slides: [
    {
      id: 'slide_1',
      layout: 'title',
      title: docTitle || 'Executive Presentation',
      subtitle: 'Created with DocsApp Presentation Studio • Professional Slide Deck',
      notes: 'Introduce topic, welcome team members, and state meeting objectives.'
    },
    {
      id: 'slide_2',
      layout: 'bullets',
      title: 'Key Objectives & Agenda',
      subtitle: 'Strategic initiatives and milestones for this quarter',
      bullets: [
        'Accelerate collaborative real-time documentation and knowledge sharing',
        'Integrate spreadsheet computational models and live formulas',
        'Present slide decks natively within the workspace with zero friction',
        'Empower cross-functional teams with AI-assisted authoring'
      ],
      notes: 'Walk through each agenda item and solicit early questions.'
    },
    {
      id: 'slide_3',
      layout: 'three-column',
      title: 'Our Core Productivity Pillars',
      subtitle: 'Everything your team needs in one unified workspace',
      col1Title: '📄 Docs',
      col1Text: 'Rich text processing, dictation, media embedding, and clean A4 print publishing.',
      col2Title: '📊 Sheet',
      col2Text: 'Excel & Google Sheets computational grid with formulas, multi-sheet tabs, and CSV export.',
      col3Title: '📽️ PPT',
      col3Text: 'Dynamic slide deck editor with 10+ layout templates, theme presets, and live slideshow mode.',
      notes: 'Highlight how the three models provide a complete Office suite replacement.'
    },
    {
      id: 'slide_4',
      layout: 'metric',
      title: 'Performance & Impact',
      metricNumber: '99.9%',
      metricLabel: 'System Availability & Workflow Efficiency',
      metricDesc: 'Teams save over 4.5 hours per week by consolidating docs, calculations, and presentations.',
      notes: 'Focus on the massive productivity gains.'
    },
    {
      id: 'slide_5',
      layout: 'quote',
      title: 'Customer Feedback',
      quoteText: 'The seamless switching between Docs, Sheet, and PPT has completely eliminated our team tool fragmentation.',
      quoteAuthor: 'Sarah Jenkins',
      quoteRole: 'VP of Product Operations, Horizon Tech',
      notes: 'Reference this testimonial to show real user sentiment.'
    }
  ]
});
