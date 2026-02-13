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

    if (action === 'fetch_page') {
      return await handleFetchPage(body, headers);
    }

    if (action === 'analyze_page') {
      return await handleAnalyzePage(body, headers);
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown action: ${action}` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function handleFetchPage({ url }, headers) {
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
  if (!response.ok) {
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }),
    };
  }

  const html = await response.text();
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
    };
  }

  const userMessage = buildUserMessage(
    page_type,
    sprint_number,
    page_content,
    course_id,
    existing_data
  );

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!apiResponse.ok) {
    const errBody = await apiResponse.text();
    return {
      statusCode: apiResponse.status,
      headers,
      body: JSON.stringify({ error: `Claude API error: ${errBody}` }),
    };
  }

  const response = await apiResponse.json();

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Parse JSON from response (handle markdown code fences)
  const jsonStr = text.replace(/```json\n?|```\n?/g, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(jsonStr);
  } catch (parseErr) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        error: 'Failed to parse Claude response as JSON',
        raw: text.slice(0, 2000),
      }),
    };
  }

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
