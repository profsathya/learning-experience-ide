const API_BASE = '/api/analyze-course';

/**
 * Fetch a page via the Netlify proxy to avoid CORS issues.
 * Returns the raw HTML string.
 */
async function fetchPageViaProxy(url) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'fetch_page', url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Fetch failed: ${res.status}`);
  }
  const { html } = await res.json();
  return html;
}

/**
 * Extract structured text content from raw HTML using DOMParser.
 * Strips styles/scripts and preserves section structure.
 */
function extractContent(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove noise
  doc.querySelectorAll('style, script, link[rel="stylesheet"], nav, footer').forEach((el) =>
    el.remove()
  );

  const sections = [];

  // Extract sections from structured elements
  doc.querySelectorAll('section, .card, details, .sprint-item, .assignment-card, article').forEach(
    (section) => {
      const heading = section.querySelector('h1, h2, h3, h4, summary');
      const text = section.textContent.trim();
      if (text) {
        sections.push({
          heading: heading?.textContent?.trim() || null,
          content: text,
        });
      }
    }
  );

  // If no sections found, fall back to body text
  if (sections.length === 0) {
    sections.push({
      heading: doc.querySelector('title')?.textContent || url,
      content: doc.body?.textContent?.trim() || '',
    });
  }

  return {
    url,
    title: doc.querySelector('title')?.textContent || url,
    sections,
    raw_text: doc.body?.textContent?.trim() || '',
  };
}

/**
 * Build the page list for a given course.
 * CST395 and CST349 have slightly different page structures.
 */
function getPageList(baseUrl, courseId) {
  const lower = courseId.toLowerCase();
  const pages = [
    { type: 'overview', url: `${baseUrl}${courseId}.html`, label: `${courseId} Overview` },
    { type: 'overview', url: `${baseUrl}${lower}/overview.html`, label: 'Detailed Overview' },
    { type: 'overview', url: `${baseUrl}${lower}/home.html`, label: 'Home / Updates' },
  ];

  // Course-specific pages
  if (courseId === 'CST395') {
    pages.push(
      { type: 'capabilities', url: `${baseUrl}${lower}/capabilities.html`, label: 'Capabilities' },
      { type: 'concepts', url: `${baseUrl}${lower}/concepts.html`, label: 'Concepts' },
      { type: 'other', url: `${baseUrl}${lower}/peer-conversations.html`, label: 'Peer Conversations' },
      { type: 'other', url: `${baseUrl}${lower}/portfolio.html`, label: 'Portfolio' }
    );
  } else if (courseId === 'CST349') {
    pages.push(
      { type: 'capabilities', url: `${baseUrl}${lower}/sdl-dimensions.html`, label: 'SDL Dimensions' },
      { type: 'other', url: `${baseUrl}${lower}/peer-conversations.html`, label: 'Peer Conversations' },
      { type: 'other', url: `${baseUrl}${lower}/portfolio.html`, label: 'Portfolio' }
    );
  }

  // Sprint pages
  for (let i = 1; i <= 4; i++) {
    pages.push({
      type: 'sprint',
      sprint_number: i,
      url: `${baseUrl}${lower}/sprint-${i}.html`,
      label: `Sprint ${i}`,
    });
  }

  return pages;
}

/**
 * Fetch and extract a single page.
 * Returns page metadata + extracted content, or error status.
 */
export async function fetchAndExtractPage(page) {
  try {
    const html = await fetchPageViaProxy(page.url);
    const extracted = extractContent(html, page.url);
    return { ...page, ...extracted, status: 'success' };
  } catch (err) {
    return { ...page, status: 'error', error: err.message };
  }
}

/**
 * Crawl all pages for a course. Fetches sequentially to avoid
 * overwhelming the proxy function.
 */
export async function crawlCourse(baseUrl, courseId, { onPageDone } = {}) {
  const pages = getPageList(baseUrl, courseId);
  const results = [];

  for (const page of pages) {
    const result = await fetchAndExtractPage(page);
    results.push(result);
    if (onPageDone) onPageDone(result, results.length, pages.length);
  }

  return results;
}

/**
 * Send extracted page content to Claude for analysis via the Netlify Function.
 * Content is trimmed to avoid timeouts on large pages.
 */
export async function analyzePage({ courseId, pageType, sprintNumber, pageContent, existingData }) {
  // Trim page content to ~8000 chars to keep API call fast
  const trimmedContent = pageContent.length > 8000
    ? pageContent.slice(0, 8000) + '\n\n[Content truncated for analysis]'
    : pageContent;

  // Only send minimal fields from existing data for dependency context
  const minimalExisting = existingData
    ? existingData.map(({ id, name, type, week, primary_layer, boundary_layer }) => ({
        id, name, type, week, primary_layer, boundary_layer,
      }))
    : undefined;

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze_page',
      course_id: courseId,
      page_type: pageType,
      sprint_number: sprintNumber,
      page_content: trimmedContent,
      existing_data: minimalExisting,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Analysis failed: ${res.status}`);
  }

  return res.json();
}

export { getPageList };
