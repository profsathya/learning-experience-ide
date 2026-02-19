import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local for the API key (Vite only exposes VITE_ prefixed vars)
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
      if (match) vars[match[1]] = match[2];
    }
    return vars;
  } catch {
    return {};
  }
}

/**
 * Vite plugin that handles /api/analyze-course POST requests directly
 * in the dev server — bypasses Netlify Functions and their 30s timeout.
 */
function apiPlugin() {
  return {
    name: 'api-analyze-course',
    configureServer(server) {
      const env = loadEnvLocal();

      server.middlewares.use('/api/analyze-course', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Read request body
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString());

        const t0 = Date.now();
        console.log(`[api-plugin] action=${body.action}`);

        try {
          if (body.action === 'fetch_page') {
            const result = await handleFetchPage(body.url);
            console.log(`[api-plugin] fetch_page done in ${Date.now() - t0}ms`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          if (body.action === 'analyze_page') {
            const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in .env.local' }));
              return;
            }

            const result = await handleAnalyzePage(body, apiKey);
            console.log(`[api-plugin] analyze_page done in ${Date.now() - t0}ms`);
            res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
            return;
          }

          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unknown action: ${body.action}` }));
        } catch (err) {
          console.error(`[api-plugin] Error after ${Date.now() - t0}ms:`, err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

async function handleFetchPage(url) {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('github.io')) {
    throw new Error('Only github.io URLs are allowed');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  const html = await response.text();
  return { html };
}

const SYSTEM_PROMPT = `You are analyzing a university course page to extract structured data for a course design tool.

## Knowledge Layer Spectrum

Assignments operate on a spectrum: Philosophy → Psychology → Design → Engineering → Business

Each assignment has:
- primary_layer: Where it primarily lives (one of: philosophy, psychology, design, engineering, business)
- boundary_layer: The adjacent layer it reaches into (must be adjacent on the spectrum, or null)
- When BOTH are null, the assignment spans the full spectrum (only demos/final presentations)

Layer definitions:
- Philosophy (position 0): Why does this matter? Values, purpose, meaning.
- Psychology (position 1): How do humans actually behave? Self-knowledge, motivation, habits.
- Design (position 2): What choices/tradeoffs are we making and why? Intentional decisions.
- Engineering (position 3): How do we build something that works? Implementation, feedback loops.
- Business (position 4): Who pays and why? Value exchange, sustainability.

Science is NOT a layer — it's an orthogonal epistemic quality dimension.

## Adjacency Rule
boundary_layer MUST be adjacent to primary_layer:
- philosophy ↔ psychology
- psychology ↔ design
- design ↔ engineering
- engineering ↔ business

## Output Format
Return valid JSON with "assignments" and "weeks" arrays. Each assignment needs: id, name, type (goal|activity|reflection|demo|peer), week, due, time, primary_layer, boundary_layer, pathways, requires, science_q, criteria, red_flags, growth, analysis_notes.

Include analysis_notes explaining your reasoning for each layer assignment.`;

async function handleAnalyzePage(body, apiKey) {
  const { course_id, page_type, sprint_number, page_content, existing_data } = body;

  let userMessage = `Analyze this ${page_type} page for course ${course_id || 'unknown'}`;
  if (sprint_number) userMessage += ` (Sprint ${sprint_number})`;
  userMessage += ` and extract structured course data.\n\n## Page Content\n\n${page_content}\n\n`;
  if (existing_data) {
    userMessage += `## Already Confirmed Data\n\n${JSON.stringify(existing_data, null, 2)}\n`;
  }
  userMessage += `\nReturn ONLY valid JSON matching the output schema.`;

  console.log(`[api-plugin] Calling Claude API (${userMessage.length} char message)...`);
  const t0 = Date.now();

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  console.log(`[api-plugin] Claude API: HTTP ${apiResponse.status} in ${Date.now() - t0}ms`);

  if (!apiResponse.ok) {
    const errBody = await apiResponse.text();
    return { status: apiResponse.status, data: { error: `Claude API error: ${errBody}` } };
  }

  const response = await apiResponse.json();
  console.log(`[api-plugin] Usage: ${JSON.stringify(response.usage || {})}`);

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const jsonStr = text.replace(/```json\n?|```\n?/g, '').trim();

  try {
    const analysis = JSON.parse(jsonStr);
    return { status: 200, data: analysis };
  } catch {
    return { status: 422, data: { error: 'Failed to parse Claude response', raw: text.slice(0, 2000) } };
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  base: './',
});
