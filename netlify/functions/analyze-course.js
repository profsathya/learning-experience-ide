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
- Design (position 2): What choices/tradeoffs are we making and why? Intentional decisions that translate understanding into solutions.
- Engineering (position 3): How do we build something that works? Implementation, systems, feedback loops.
- Business (position 4): Who pays and why? Value exchange, sustainability, stakeholder needs.

Science is NOT a layer — it's an orthogonal epistemic quality dimension. For each assignment, provide a science_q: a question that tests whether the student's work at that assignment's layers is grounded in evidence rather than narrative.

## Adjacency Rule
boundary_layer MUST be adjacent to primary_layer on the spectrum:
- philosophy can boundary to: psychology
- psychology can boundary to: philosophy, design
- design can boundary to: psychology, engineering
- engineering can boundary to: design, business
- business can boundary to: engineering

## Output Format
Return valid JSON matching this schema for each assignment found:
{
  "assignments": [
    {
      "id": "slug-format-id",
      "name": "Assignment Name",
      "type": "goal|activity|reflection|demo|peer",
      "week": 1,
      "due": "Wed|Fri|In-class",
      "time": "15-20m",
      "primary_layer": "psychology",
      "boundary_layer": "design",
      "pathways": ["sdl", "integrative_solver"],
      "requires": ["previous-assignment-id"],
      "science_q": "Does each 'why' go deeper based on evidence?",
      "criteria": [
        {"text": "Criterion description", "layer": "psychology"}
      ],
      "red_flags": ["Warning sign"],
      "growth": ["Positive indicator"],
      "analysis_notes": "Why I assigned these layers: ..."
    }
  ],
  "weeks": [
    {
      "number": 1,
      "title": "Week Title",
      "hook": "Opening question for the week",
      "spectrum_focus": "Philosophy → Psychology boundary",
      "misconceptions": [
        {"belief": "...", "reality": "...", "intervention": "..."}
      ]
    }
  ]
}

Include analysis_notes explaining your reasoning for each layer assignment. The instructor will review these.`;

export const handler = async (event) => {
  const t0 = Date.now();
  console.log(`[analyze-course] START ${event.httpMethod} at ${new Date().toISOString()}`);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { action } = body;
    console.log(`[analyze-course] action=${action} bodySize=${event.body.length} chars`);

    if (action === 'fetch_page') {
      const result = await handleFetchPage(body, headers);
      console.log(`[analyze-course] fetch_page done in ${Date.now() - t0}ms status=${result.statusCode}`);
      return result;
    }

    if (action === 'analyze_page') {
      const result = await handleAnalyzePage(body, headers);
      console.log(`[analyze-course] analyze_page done in ${Date.now() - t0}ms status=${result.statusCode}`);
      return result;
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown action: ${action}` }),
    };
  } catch (err) {
    console.error(`[analyze-course] UNCAUGHT ERROR after ${Date.now() - t0}ms:`, err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function handleFetchPage({ url }, headers) {
  console.log(`[fetch_page] Fetching: ${url}`);
  const t0 = Date.now();

  // Validate URL is from expected domain
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('github.io')) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Only github.io URLs are allowed' }),
    };
  }

  const response = await fetch(url);
  console.log(`[fetch_page] HTTP ${response.status} in ${Date.now() - t0}ms`);

  if (!response.ok) {
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }),
    };
  }

  const html = await response.text();
  console.log(`[fetch_page] Got ${html.length} chars in ${Date.now() - t0}ms total`);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ html }),
  };
}

async function handleAnalyzePage(
  { course_id, page_type, sprint_number, page_content, existing_data },
  headers
) {
  const t0 = Date.now();
  console.log(`[analyze_page] course=${course_id} type=${page_type} sprint=${sprint_number}`);
  console.log(`[analyze_page] page_content length: ${(page_content || '').length} chars`);
  console.log(`[analyze_page] existing_data items: ${existing_data ? existing_data.length : 0}`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[analyze_page] ANTHROPIC_API_KEY is not set!');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
    };
  }
  console.log(`[analyze_page] API key present (${apiKey.slice(0, 10)}...)`);

  const userMessage = buildUserMessage(
    page_type,
    sprint_number,
    page_content,
    course_id,
    existing_data
  );
  console.log(`[analyze_page] User message length: ${userMessage.length} chars`);

  console.log(`[analyze_page] Calling Claude API...`);
  const apiT0 = Date.now();

  const requestBody = {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  };
  console.log(`[analyze_page] Request body size: ${JSON.stringify(requestBody).length} chars`);

  let apiResponse;
  try {
    apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchErr) {
    console.error(`[analyze_page] Fetch to Claude API FAILED after ${Date.now() - apiT0}ms:`, fetchErr.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `Failed to reach Claude API: ${fetchErr.message}` }),
    };
  }

  console.log(`[analyze_page] Claude API responded: HTTP ${apiResponse.status} in ${Date.now() - apiT0}ms`);

  if (!apiResponse.ok) {
    const errBody = await apiResponse.text();
    console.error(`[analyze_page] Claude API error: ${errBody.slice(0, 500)}`);
    return {
      statusCode: apiResponse.status,
      headers,
      body: JSON.stringify({ error: `Claude API error: ${errBody}` }),
    };
  }

  const response = await apiResponse.json();
  console.log(`[analyze_page] Response parsed in ${Date.now() - apiT0}ms, usage: ${JSON.stringify(response.usage || {})}`);

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  console.log(`[analyze_page] Response text length: ${text.length} chars`);

  // Parse JSON from response (handle markdown code fences)
  const jsonStr = text.replace(/```json\n?|```\n?/g, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error(`[analyze_page] JSON parse failed. First 200 chars: ${jsonStr.slice(0, 200)}`);
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        error: 'Failed to parse Claude response as JSON',
        raw: text.slice(0, 2000),
      }),
    };
  }

  console.log(`[analyze_page] SUCCESS: ${(analysis.assignments || []).length} assignments, ${(analysis.weeks || []).length} weeks. Total: ${Date.now() - t0}ms`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(analysis),
  };
}

function buildUserMessage(pageType, sprintNumber, content, courseId, existingData) {
  let msg = `Analyze this ${pageType} page for course ${courseId || 'unknown'}`;
  if (sprintNumber) msg += ` (Sprint ${sprintNumber})`;
  msg += ` and extract structured course data.\n\n`;
  msg += `## Page Content\n\n${content}\n\n`;
  if (existingData) {
    msg += `## Already Confirmed Data\n\nThese assignments are already in the system. Use them for dependency references:\n${JSON.stringify(existingData, null, 2)}\n`;
  }
  msg += `\nReturn ONLY valid JSON matching the output schema. Include analysis_notes for each assignment explaining your layer reasoning.`;
  return msg;
}
