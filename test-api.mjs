#!/usr/bin/env node
/**
 * Standalone test script — bypasses Netlify, tests each step independently.
 *
 * Usage:
 *   node test-api.mjs              # Run all tests
 *   node test-api.mjs fetch        # Test only page fetch
 *   node test-api.mjs api          # Test only Claude API (tiny payload)
 *   node test-api.mjs function     # Test via Netlify Function (needs netlify dev running)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
  console.log('✓ Loaded .env.local');
} catch {
  console.log('⚠ No .env.local found, using existing env vars');
}

const testMode = process.argv[2] || 'all';

// ── Test 1: Can we fetch a page from GitHub Pages? ──
async function testFetch() {
  console.log('\n═══ TEST: Fetch page from GitHub Pages ═══');
  const url = 'https://profsathya.github.io/Common-Curriculum/CST395.html';
  const t0 = Date.now();

  try {
    const res = await fetch(url);
    const html = await res.text();
    console.log(`✓ Fetched ${url}`);
    console.log(`  Status: ${res.status}`);
    console.log(`  Size: ${html.length} chars`);
    console.log(`  Time: ${Date.now() - t0}ms`);
    return html;
  } catch (err) {
    console.error(`✗ Fetch failed: ${err.message}`);
    console.log(`  Time: ${Date.now() - t0}ms`);
    return null;
  }
}

// ── Test 2: Can we call the Claude API directly? ──
async function testClaudeApi() {
  console.log('\n═══ TEST: Claude API direct call (tiny payload) ═══');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('✗ ANTHROPIC_API_KEY not set in .env.local or environment');
    return null;
  }
  console.log(`  API key: ${apiKey.slice(0, 12)}...`);

  const t0 = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Return exactly this JSON: {"test": true}' }],
      }),
    });

    console.log(`  HTTP status: ${res.status}`);
    console.log(`  Time to response: ${Date.now() - t0}ms`);

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`✗ API error: ${errBody.slice(0, 500)}`);
      return null;
    }

    const data = await res.json();
    console.log(`  Total time: ${Date.now() - t0}ms`);
    console.log(`  Usage: ${JSON.stringify(data.usage)}`);
    console.log(`  Response: ${data.content[0]?.text?.slice(0, 100)}`);
    console.log('✓ Claude API works');
    return data;
  } catch (err) {
    console.error(`✗ API call failed: ${err.message}`);
    console.log(`  Time: ${Date.now() - t0}ms`);
    return null;
  }
}

// ── Test 3: Can we call the Claude API with a realistic payload? ──
async function testClaudeApiRealistic() {
  console.log('\n═══ TEST: Claude API with realistic course content ═══');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('✗ ANTHROPIC_API_KEY not set');
    return null;
  }

  const sampleContent = `
## Sprint 2: Acquaintance
Focus: Someone else's challenge

### Week 5: Finding Your Acquaintance
- Goal Setting: Identify an acquaintance with a challenge you can help with
- Due: Wednesday, 15-20min

### Week 6: Understanding Their Problem
- 5 Whys Analysis: Interview acquaintance, apply 5 Whys
- Reflection: What did you learn about someone else's perspective?
- Due: Wednesday/Friday

### Week 7: Designing for Someone Else
- Design Decision Analysis: Design a solution for your acquaintance
- Symbiotic Thinking Dojo: Use AI collaboration to refine design
- Reflection: How is designing for someone else different?

### Week 8: Demo
- Sprint 2 Demo: Present acquaintance project
- Final Reflection: Compare Sprint 1 (self) vs Sprint 2 (other)
  `.trim();

  console.log(`  Content size: ${sampleContent.length} chars`);
  const t0 = Date.now();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: 'You analyze course pages and return JSON with assignments. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Extract assignments from this sprint page. Return JSON with "assignments" array. Each assignment needs: id, name, type (goal/activity/reflection/demo), week, due.\n\n${sampleContent}`,
        }],
      }),
    });

    console.log(`  HTTP status: ${res.status}`);
    console.log(`  Time to response: ${Date.now() - t0}ms`);

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`✗ API error: ${errBody.slice(0, 500)}`);
      return null;
    }

    const data = await res.json();
    console.log(`  Total time: ${Date.now() - t0}ms`);
    console.log(`  Usage: ${JSON.stringify(data.usage)}`);
    const text = data.content[0]?.text || '';
    console.log(`  Response length: ${text.length} chars`);
    console.log(`  First 200 chars: ${text.slice(0, 200)}`);
    console.log('✓ Realistic API call works');
    return data;
  } catch (err) {
    console.error(`✗ Failed: ${err.message}`);
    console.log(`  Time: ${Date.now() - t0}ms`);
    return null;
  }
}

// ── Test 4: Call through Netlify Function (needs netlify dev running) ──
async function testNetlifyFunction() {
  console.log('\n═══ TEST: Netlify Function (needs netlify dev on :8888) ═══');
  const t0 = Date.now();

  try {
    // First test fetch_page action
    console.log('  Testing fetch_page action...');
    const fetchRes = await fetch('http://localhost:8888/api/analyze-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch_page',
        url: 'https://profsathya.github.io/Common-Curriculum/CST395.html',
      }),
    });
    console.log(`  fetch_page: HTTP ${fetchRes.status} in ${Date.now() - t0}ms`);

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      console.log(`  ✓ fetch_page returned ${(data.html || '').length} chars of HTML`);
    } else {
      const err = await fetchRes.text();
      console.error(`  ✗ fetch_page error: ${err.slice(0, 300)}`);
    }

    // Then test analyze_page with minimal content
    console.log('\n  Testing analyze_page action (minimal content)...');
    const t1 = Date.now();
    const analyzeRes = await fetch('http://localhost:8888/api/analyze-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_page',
        course_id: 'CST395',
        page_type: 'sprint',
        sprint_number: 2,
        page_content: 'Sprint 2 Week 5: Goal Setting (Wed, 15min). Week 6: 5 Whys (Wed). Week 7: Design Analysis (Wed). Week 8: Demo (In-class).',
      }),
    });
    console.log(`  analyze_page: HTTP ${analyzeRes.status} in ${Date.now() - t1}ms`);

    if (analyzeRes.ok) {
      const data = await analyzeRes.json();
      console.log(`  ✓ analyze_page returned ${(data.assignments || []).length} assignments`);
    } else {
      const err = await analyzeRes.text();
      console.error(`  ✗ analyze_page error: ${err.slice(0, 300)}`);
    }

  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.log('  ⚠ Cannot connect to localhost:8888 — is netlify dev running?');
    } else {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }
}

// ── Run tests ──
async function main() {
  console.log('Course Design IDE — API Diagnostics');
  console.log('====================================\n');

  if (testMode === 'all' || testMode === 'fetch') {
    await testFetch();
  }
  if (testMode === 'all' || testMode === 'api') {
    await testClaudeApi();
    await testClaudeApiRealistic();
  }
  if (testMode === 'all' || testMode === 'function') {
    await testNetlifyFunction();
  }

  console.log('\n====================================');
  console.log('Done.');
}

main().catch(console.error);
