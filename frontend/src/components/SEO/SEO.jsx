import { useEffect } from 'react';

const DEFAULT_TITLE = 'DocsApp - Modern Document Creation & Collaboration Workspace';
const DEFAULT_DESCRIPTION = 'DocsApp is a fast, elegant, and modern web application for writing, editing, and managing your documents. Features distraction-free rich text editing, side-by-side view, version history, and one-click PDF export.';

/**
 * Lightweight React 19-compatible SEO component that manages page titles and metadata.
 */
const SEO = ({ title, description, canonicalUrl, ogType = 'website' }) => {
  useEffect(() => {
    // 1. Page Title
    const formattedTitle = title ? `${title} | DocsApp` : DEFAULT_TITLE;
    document.title = formattedTitle;

    // Helper to update or create meta tags
    const updateMeta = (selector, attributeName, attributeValue, content) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const currentDesc = description || DEFAULT_DESCRIPTION;

    // 2. Standard Meta Description
    updateMeta('meta[name="description"]', 'name', 'description', currentDesc);

    // 3. Open Graph Meta Tags
    updateMeta('meta[property="og:title"]', 'property', 'og:title', formattedTitle);
    updateMeta('meta[property="og:description"]', 'property', 'og:description', currentDesc);
    updateMeta('meta[property="og:type"]', 'property', 'og:type', ogType);

    // 4. Twitter Card Meta Tags
    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', formattedTitle);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', currentDesc);

    // 5. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (canonicalUrl) {
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonicalUrl);
    }
  }, [title, description, canonicalUrl, ogType]);

  return null;
};

export default SEO;
