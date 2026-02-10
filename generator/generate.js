#!/usr/bin/env node

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const LAYER_COLORS = {
  philosophy: { bg: '#ede9fe', fg: '#6d28d9', accent: '#8b5cf6' },
  science:    { bg: '#dbeafe', fg: '#1d4ed8', accent: '#3b82f6' },
  psychology: { bg: '#dcfce7', fg: '#16a34a', accent: '#22c55e' },
  engineering:{ bg: '#ffedd5', fg: '#ea580c', accent: '#f97316' },
  business:   { bg: '#fef3c7', fg: '#d97706', accent: '#f59e0b' },
};

const LAYER_LABELS = {
  philosophy: 'Philosophy',
  science: 'Science',
  psychology: 'Psychology',
  engineering: 'Engineering',
  business: 'Business',
};

const CAPABILITY_SHORT = {
  sdl: 'SDL',
  integrative_solver: 'IS',
  adaptive_builder: 'AB',
  mental_model: 'MM',
};

const TYPE_LABELS = {
  reflection: 'Reflection',
  demo: 'Demonstration',
  activity: 'Activity',
  peer: 'Peer',
  goal: 'Goal Setting',
};

// ---------------------------------------------------------------------------
// LOAD SCHEMA
// ---------------------------------------------------------------------------

const schemaPath = process.argv[2] || './schemas/cst395.yaml';
if (!fs.existsSync(schemaPath)) {
  console.error(`Schema not found: ${schemaPath}`);
  process.exit(1);
}

const raw = yaml.load(fs.readFileSync(schemaPath, 'utf8'));
const course = raw.course;
const sprints = raw.sprints || [];

// ---------------------------------------------------------------------------
// OUTPUT SETUP
// ---------------------------------------------------------------------------

const outputDir = path.resolve('./output');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanOutput() {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  ensureDir(outputDir);
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function layerTag(layerId) {
  const label = LAYER_LABELS[layerId] || layerId;
  return `<span class="layer-tag layer-${escapeHtml(layerId)}">${escapeHtml(label)}</span>`;
}

function capabilityShort(id) {
  return CAPABILITY_SHORT[id] || id;
}

function pathwayName(id) {
  const names = {
    sdl: 'Self-Directed Learning',
    integrative_solver: 'Integrative Solver',
    adaptive_builder: 'Adaptive Builder',
    mental_model: 'Mental Model',
  };
  return names[id] || id;
}

function destinationName(id) {
  const dest = (course.outcomes.destinations || []).find(d => d.id === id);
  return dest ? dest.name : id;
}

function breadcrumb(parts, assetPrefix) {
  return `
    <nav class="breadcrumb">
      <div class="breadcrumb-inner">
        ${parts.map((p, i) =>
          i === parts.length - 1
            ? `<span class="current">${escapeHtml(p.label)}</span>`
            : `<a href="${assetPrefix}${p.href}">${escapeHtml(p.label)}</a><span class="sep">&rsaquo;</span>`
        ).join(' ')}
      </div>
    </nav>`;
}

function htmlShell({ title, themeColor, breadcrumbHtml, bodyContent, assetPrefix }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetPrefix}assets/styles.css">
  <style>:root { --theme-color: ${themeColor || '#14b8a6'}; }</style>
</head>
<body>
  ${breadcrumbHtml}
  <main class="container">
    ${bodyContent}
  </main>
  <script src="${assetPrefix}assets/nav.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// LEVEL 1: COURSE OVERVIEW
// ---------------------------------------------------------------------------

function generateCourseOverview() {
  const bc = breadcrumb([{ label: course.id }], '');

  const coreTension = (course.pedagogy && course.pedagogy.core_tensions && course.pedagogy.core_tensions[0]) || '';

  // Destinations
  const destinationsHtml = (course.outcomes.destinations || []).map(d => `
    <div class="outcome-item" title="${escapeHtml(d.description)}">
      <span class="outcome-dot"></span>
      <div>
        <strong>${escapeHtml(d.name)}</strong>
        <p class="outcome-desc">${escapeHtml(d.description)}</p>
      </div>
    </div>
  `).join('');

  // Capabilities with progression
  const capabilitiesHtml = (course.outcomes.capabilities || []).map(c => {
    const prog = c.progression || {};
    const sprintKeys = Object.keys(prog).sort();
    const progressionHtml = sprintKeys.map((k, i) => {
      const label = k.replace('sprint_', 'S');
      return `<span class="progression-step" title="${escapeHtml(prog[k])}">${label}</span>${i < sprintKeys.length - 1 ? '<span class="progression-arrow">&rarr;</span>' : ''}`;
    }).join('');
    return `
    <div class="outcome-item" title="${escapeHtml(c.description)}">
      <span class="outcome-dot"></span>
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        <div class="progression">${progressionHtml}</div>
      </div>
    </div>`;
  }).join('');

  // Layers
  const layersHtml = (course.layers || []).map(l => `
    <div class="layer-chip layer-${escapeHtml(l.id)}" title="${escapeHtml(l.question)}">
      ${escapeHtml(l.name)}
    </div>
  `).join('');

  // Sprints
  const sprintsHtml = sprints.map(s => {
    const destNames = (s.outcome_focus.destinations || []).map(d => destinationName(d)).join(', ');
    const capNames = (s.outcome_focus.capabilities || []).map(c => capabilityShort(c)).join(', ');
    const weekRange = s.weeks && s.weeks.length > 0
      ? `Weeks ${s.weeks[0].course_week}–${s.weeks[s.weeks.length - 1].course_week}`
      : '';
    return `
    <a href="sprint-${s.number}/index.html" class="card clickable sprint-card">
      <div class="sprint-card-header">
        <h3>Sprint ${s.number}: ${escapeHtml(s.name)} (${escapeHtml(s.stakeholder)})</h3>
        <span class="week-range">${weekRange}</span>
      </div>
      <div class="sprint-arc-mini">
        <span class="arc-from">FROM: ${escapeHtml(truncate(s.arc.starting_point, 80))}</span>
        <span class="arc-arrow">&rarr;</span>
        <span class="arc-to">TO: ${escapeHtml(truncate(s.arc.ending_point, 80))}</span>
      </div>
      <div class="sprint-focus">
        FOCUS: ${escapeHtml(destNames)}${capNames ? ', ' + escapeHtml(capNames) : ''}
      </div>
    </a>`;
  }).join('');

  const body = `
    <header class="course-header">
      <h1>${escapeHtml(course.id)}: ${escapeHtml(course.name)}</h1>
      <p class="meta">${course.units} units &middot; ${escapeHtml(course.semester)}</p>
    </header>

    ${coreTension ? `
    <section class="section">
      <h2>Core Tension</h2>
      <div class="card tension-card">
        <p class="tension-text">&ldquo;${escapeHtml(coreTension)}&rdquo;</p>
      </div>
    </section>` : ''}

    <section class="section outcomes-grid">
      <div class="outcomes-col">
        <h2>Destinations</h2>
        <p class="subtitle">What students become</p>
        ${destinationsHtml}
      </div>
      <div class="outcomes-col">
        <h2>Capabilities</h2>
        <p class="subtitle">Observable skills</p>
        ${capabilitiesHtml}
      </div>
    </section>

    <section class="section">
      <h2>Knowledge Layers</h2>
      <div class="layers-row">
        ${layersHtml}
      </div>
    </section>

    <section class="section">
      <h2>Sprints</h2>
      ${sprintsHtml}
    </section>
  `;

  const html = htmlShell({
    title: `${course.id}: ${course.name}`,
    themeColor: course.theme_color,
    breadcrumbHtml: bc,
    bodyContent: body,
    assetPrefix: '',
  });

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('  index.html');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ---------------------------------------------------------------------------
// LEVEL 2: SPRINT VIEW
// ---------------------------------------------------------------------------

function generateSprintView(sprint) {
  const sprintDir = path.join(outputDir, `sprint-${sprint.number}`);
  ensureDir(sprintDir);

  const bc = breadcrumb([
    { label: course.id, href: 'index.html' },
    { label: `Sprint ${sprint.number}` },
  ], '../');

  // Transformation arc
  const arc = sprint.arc || {};

  // Outcome focus
  const destNames = (sprint.outcome_focus.destinations || []).map(d => destinationName(d));
  const capNames = (sprint.outcome_focus.capabilities || []).map(c => pathwayName(c));

  // Demonstration
  const demo = sprint.demonstration || {};
  const demoQuestionsHtml = (demo.core_questions || []).map(q =>
    `<li>${escapeHtml(q)}</li>`
  ).join('');

  // Weeks
  const weeksHtml = (sprint.weeks || []).map((w, i) => {
    const assignCount = (w.assignments || []).length;
    const isLast = i === sprint.weeks.length - 1;
    return `
    <div class="week-flow-item">
      <a href="week-${w.number}.html" class="card clickable week-card">
        <div class="week-card-number">Week ${w.number}</div>
        <div class="week-card-title">${escapeHtml(w.title)}</div>
        <div class="week-card-meta">${assignCount} assignment${assignCount !== 1 ? 's' : ''}</div>
        ${isLast && demo.format ? '<div class="week-demo-badge">DEMO WEEK</div>' : ''}
      </a>
      ${i < sprint.weeks.length - 1 ? '<div class="week-flow-arrow">&rarr;</div>' : ''}
    </div>`;
  }).join('');

  const body = `
    <header class="page-header">
      <h1>Sprint ${sprint.number}: ${escapeHtml(sprint.name)}</h1>
      <p class="meta">Stakeholder: ${escapeHtml(sprint.stakeholder)}</p>
    </header>

    <section class="section">
      <h2>Transformation Arc</h2>
      <div class="card arc-card">
        <div class="arc-endpoints">
          <div class="arc-box arc-from-box">
            <div class="arc-label">FROM</div>
            <p>${escapeHtml(arc.starting_point)}</p>
          </div>
          <div class="arc-connector">&longrightarrow;</div>
          <div class="arc-box arc-to-box">
            <div class="arc-label">TO</div>
            <p>${escapeHtml(arc.ending_point)}</p>
          </div>
        </div>
        ${arc.key_insight ? `
        <div class="arc-insight">
          <strong>Key Insight:</strong> &ldquo;${escapeHtml(arc.key_insight)}&rdquo;
        </div>` : ''}
        ${arc.common_failure ? `
        <div class="arc-failure">
          <strong>Common Failure:</strong> ${escapeHtml(arc.common_failure)}
        </div>` : ''}
      </div>
    </section>

    <section class="section">
      <h2>Outcome Focus</h2>
      <div class="card">
        <p><strong>Destinations:</strong> ${destNames.map(n => escapeHtml(n)).join(', ') || 'None specified'}</p>
        <p><strong>Capabilities:</strong> ${capNames.map(n => escapeHtml(n)).join(', ') || 'None specified'}</p>
      </div>
    </section>

    ${demo.format ? `
    <section class="section">
      <h2>Demonstration</h2>
      <div class="card">
        <p><strong>Format:</strong> ${escapeHtml(demo.format)}</p>
        <p><strong>Duration:</strong> ${escapeHtml(demo.duration)}</p>
        ${demoQuestionsHtml ? `
        <div class="demo-questions">
          <strong>Core questions students must answer:</strong>
          <ul>${demoQuestionsHtml}</ul>
        </div>` : ''}
      </div>
    </section>` : ''}

    <section class="section">
      <h2>Weeks</h2>
      <div class="week-flow">
        ${weeksHtml}
      </div>
    </section>
  `;

  const html = htmlShell({
    title: `Sprint ${sprint.number}: ${sprint.name} — ${course.id}`,
    themeColor: course.theme_color,
    breadcrumbHtml: bc,
    bodyContent: body,
    assetPrefix: '../',
  });

  fs.writeFileSync(path.join(sprintDir, 'index.html'), html);
  console.log(`  sprint-${sprint.number}/index.html`);
}

// ---------------------------------------------------------------------------
// LEVEL 3: WEEK VIEW
// ---------------------------------------------------------------------------

function generateWeekView(sprint, week, weekIndex) {
  const sprintDir = path.join(outputDir, `sprint-${sprint.number}`);
  ensureDir(sprintDir);

  const weeks = sprint.weeks || [];
  const prevWeek = weekIndex > 0 ? weeks[weekIndex - 1] : null;
  const nextWeek = weekIndex < weeks.length - 1 ? weeks[weekIndex + 1] : null;

  const bc = breadcrumb([
    { label: course.id, href: 'index.html' },
    { label: `Sprint ${sprint.number}`, href: `sprint-${sprint.number}/index.html` },
    { label: `Week ${week.number}` },
  ], '../');

  // Hook
  const hook = week.hook || {};
  const hookHtml = hook.question ? `
    <section class="section">
      <h2>The Hook</h2>
      <div class="card hook-card">
        <p class="hook-question">&ldquo;${escapeHtml(hook.question)}&rdquo;</p>
        <div class="hook-answers">
          <div class="hook-answer hook-weak">
            <div class="hook-answer-label">Weak Answer</div>
            <p>${escapeHtml(hook.weak_answer)}</p>
          </div>
          <div class="hook-answer hook-strong">
            <div class="hook-answer-label">Strong Answer</div>
            <p>${escapeHtml(hook.strong_answer)}</p>
          </div>
        </div>
      </div>
    </section>` : '';

  // Pathways
  const pathwaysHtml = (week.pathways || []).map(p => `
    <div class="pathway-item">
      <div class="pathway-name">${escapeHtml(p.name)}</div>
      <div class="pathway-detail"><strong>This week:</strong> ${escapeHtml(p.this_week)}</div>
      ${p.builds_on ? `<div class="pathway-detail"><strong>Builds on:</strong> ${escapeHtml(p.builds_on)}</div>` : ''}
      ${p.builds_toward ? `<div class="pathway-detail"><strong>Builds toward:</strong> ${escapeHtml(p.builds_toward)}</div>` : ''}
    </div>
  `).join('');

  // Misconceptions
  const miscHtml = (week.misconceptions || []).length > 0
    ? week.misconceptions.map(m => `
      <div class="misconception-item">
        <div class="misconception-belief"><span class="misc-x">&cross;</span> BELIEF: ${escapeHtml(m.belief)}</div>
        <div class="misconception-reality"><strong>REALITY:</strong> ${escapeHtml(m.reality)}</div>
        <div class="misconception-intervention"><strong>INTERVENTION:</strong> ${escapeHtml(m.intervention)}</div>
      </div>
    `).join('')
    : '<p class="empty">No misconceptions defined yet</p>';

  // Assignments
  const assignDir = path.join(sprintDir, `week-${week.number}`);
  const assignmentsHtml = (week.assignments || []).map(a => {
    const typeLabel = TYPE_LABELS[a.type] || a.type;
    const pathwayTags = (a.pathways || []).map(p =>
      `<span class="pathway-tag">${escapeHtml(capabilityShort(p) || p)}</span>`
    ).join(' ');
    const layerTags = (a.layer_focus || []).map(l => layerTag(l)).join(' ');

    return `
    <a href="week-${week.number}/${a.id}.html" class="card clickable assignment-card">
      <div class="assignment-card-header">
        <strong>${escapeHtml(a.name)}</strong>
        <span class="assignment-type">${escapeHtml(typeLabel)}</span>
      </div>
      <div class="assignment-card-meta">
        Due: ${escapeHtml(a.due_day)} &middot; ${escapeHtml(a.time_estimate)}
      </div>
      <div class="assignment-card-tags">
        ${pathwayTags} ${layerTags}
      </div>
    </a>`;
  }).join('');

  // Nav
  const prevHtml = prevWeek
    ? `<a href="week-${prevWeek.number}.html" class="nav-prev">&laquo; Week ${prevWeek.number}: ${escapeHtml(prevWeek.title)}</a>`
    : '<span></span>';
  const nextHtml = nextWeek
    ? `<a href="week-${nextWeek.number}.html" class="nav-next">Week ${nextWeek.number}: ${escapeHtml(nextWeek.title)} &raquo;</a>`
    : '<span></span>';

  const body = `
    <header class="page-header">
      <h1>Week ${week.number}: ${escapeHtml(week.title)}</h1>
      <p class="meta">Course Week ${week.course_week}</p>
    </header>

    ${hookHtml}

    ${pathwaysHtml ? `
    <section class="section">
      <h2>Pathways Being Developed</h2>
      <div class="card">
        ${pathwaysHtml}
      </div>
    </section>` : ''}

    <section class="section">
      <h2>Misconceptions to Address</h2>
      <div class="card">
        ${miscHtml}
      </div>
    </section>

    <section class="section">
      <h2>Assignments</h2>
      ${assignmentsHtml || '<p class="empty">No assignments defined yet</p>'}
    </section>

    <nav class="page-nav">
      ${prevHtml}
      ${nextHtml}
    </nav>
  `;

  const html = htmlShell({
    title: `Week ${week.number}: ${week.title} — Sprint ${sprint.number} — ${course.id}`,
    themeColor: course.theme_color,
    breadcrumbHtml: bc,
    bodyContent: body,
    assetPrefix: '../',
  });

  fs.writeFileSync(path.join(sprintDir, `week-${week.number}.html`), html);
  console.log(`  sprint-${sprint.number}/week-${week.number}.html`);
}

// ---------------------------------------------------------------------------
// LEVEL 4: ASSIGNMENT VIEW
// ---------------------------------------------------------------------------

function generateAssignmentView(sprint, week, assignment, assignIndex) {
  const assignDir = path.join(outputDir, `sprint-${sprint.number}`, `week-${week.number}`);
  ensureDir(assignDir);

  const assignments = week.assignments || [];
  const prevAssign = assignIndex > 0 ? assignments[assignIndex - 1] : null;
  const nextAssign = assignIndex < assignments.length - 1 ? assignments[assignIndex + 1] : null;

  const bc = breadcrumb([
    { label: course.id, href: 'index.html' },
    { label: `Sprint ${sprint.number}`, href: `sprint-${sprint.number}/index.html` },
    { label: `Week ${week.number}`, href: `sprint-${sprint.number}/week-${week.number}.html` },
    { label: assignment.name },
  ], '../../');

  const typeLabel = TYPE_LABELS[assignment.type] || assignment.type;

  // Connections
  const pathwayTags = (assignment.pathways || []).map(p =>
    `<span class="pathway-tag">${escapeHtml(capabilityShort(p) || p)}</span>`
  ).join(' ');
  const layerTags = (assignment.layer_focus || []).map(l => layerTag(l)).join(' ');

  // Requires (clickable links)
  const requiresHtml = (assignment.requires || []).length > 0
    ? assignment.requires.map(reqId => {
        // Find the assignment in this sprint
        const link = findAssignmentLink(sprint, reqId);
        if (link) {
          return `<a href="../../${link.href}" class="requires-link">${escapeHtml(link.name)}</a>`;
        }
        return `<span class="requires-link">${escapeHtml(reqId)}</span>`;
      }).join(', ')
    : 'None';

  // Analysis
  const analysis = assignment.analysis || {};

  const criteriaHtml = (analysis.quality_criteria || []).map((qc, i) => `
    <div class="criterion-item">
      <div class="criterion-header">
        <span class="criterion-num">${i + 1}.</span>
        <span class="criterion-text">${escapeHtml(qc.criterion)}</span>
        ${qc.layer ? layerTag(qc.layer) : ''}
      </div>
      <div class="criterion-examples">
        <div class="example-weak">
          <div class="example-label">WEAK</div>
          <p>${escapeHtml(qc.weak_example)}</p>
        </div>
        <div class="example-strong">
          <div class="example-label">STRONG</div>
          <p>${escapeHtml(qc.strong_example)}</p>
        </div>
      </div>
    </div>
  `).join('');

  const redFlagsHtml = (analysis.red_flags || []).map(f =>
    `<li>${escapeHtml(f)}</li>`
  ).join('');

  const growthHtml = (analysis.growth_indicators || []).map(g =>
    `<li>${escapeHtml(g)}</li>`
  ).join('');

  // Canvas
  const canvas = assignment.canvas || {};

  // Nav
  const prevHtml = prevAssign
    ? `<a href="${prevAssign.id}.html" class="nav-prev">&laquo; ${escapeHtml(prevAssign.name)}</a>`
    : '<span></span>';
  const nextHtml = nextAssign
    ? `<a href="${nextAssign.id}.html" class="nav-next">${escapeHtml(nextAssign.name)} &raquo;</a>`
    : '<span></span>';

  const body = `
    <header class="page-header">
      <h1>${escapeHtml(assignment.name)}</h1>
      <p class="meta">Type: ${escapeHtml(typeLabel)}</p>
    </header>

    <section class="section">
      <h2>Logistics</h2>
      <div class="card logistics-card">
        <div class="logistics-grid">
          <div><strong>Due:</strong> ${escapeHtml(assignment.due_day)}</div>
          <div><strong>Time estimate:</strong> ${escapeHtml(assignment.time_estimate)}</div>
          <div><strong>Requires:</strong> ${requiresHtml}</div>
          ${canvas.points !== undefined ? `<div><strong>Points:</strong> ${canvas.points}</div>` : ''}
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Connections</h2>
      <div class="card">
        <div class="connections-grid">
          <div>
            <strong>Pathways</strong>
            <div class="tag-group">${pathwayTags || '<span class="empty-inline">None</span>'}</div>
          </div>
          <div>
            <strong>Knowledge Layers</strong>
            <div class="tag-group">${layerTags || '<span class="empty-inline">None</span>'}</div>
          </div>
        </div>
      </div>
    </section>

    ${criteriaHtml ? `
    <section class="section">
      <h2>Quality Criteria</h2>
      <div class="card">
        ${criteriaHtml}
      </div>
    </section>` : ''}

    ${(redFlagsHtml || growthHtml) ? `
    <section class="section flags-grid">
      ${redFlagsHtml ? `
      <div class="card flags-card red-flags-card">
        <h3>Red Flags</h3>
        <p class="flags-subtitle">Shallow work</p>
        <ul>${redFlagsHtml}</ul>
      </div>` : ''}
      ${growthHtml ? `
      <div class="card flags-card growth-card">
        <h3>Growth Indicators</h3>
        <p class="flags-subtitle">Real learning</p>
        <ul>${growthHtml}</ul>
      </div>` : ''}
    </section>` : ''}

    <nav class="page-nav">
      ${prevHtml}
      ${nextHtml}
    </nav>
  `;

  const html = htmlShell({
    title: `${assignment.name} — Week ${week.number} — Sprint ${sprint.number} — ${course.id}`,
    themeColor: course.theme_color,
    breadcrumbHtml: bc,
    bodyContent: body,
    assetPrefix: '../../',
  });

  fs.writeFileSync(path.join(assignDir, `${assignment.id}.html`), html);
  console.log(`  sprint-${sprint.number}/week-${week.number}/${assignment.id}.html`);
}

function findAssignmentLink(sprint, assignId) {
  for (const w of (sprint.weeks || [])) {
    for (const a of (w.assignments || [])) {
      if (a.id === assignId) {
        return {
          href: `sprint-${sprint.number}/week-${w.number}/${a.id}.html`,
          name: a.name,
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// ASSET COPYING
// ---------------------------------------------------------------------------

function copyAssets() {
  const assetsDir = path.join(outputDir, 'assets');
  ensureDir(assetsDir);

  // Copy styles.css if it exists in project root, otherwise look in templates
  const possibleStylePaths = [
    path.resolve('./assets/styles.css'),
    path.resolve('./templates/styles.css'),
  ];
  const stylesSource = possibleStylePaths.find(p => fs.existsSync(p));

  // Copy nav.js
  const possibleJsPaths = [
    path.resolve('./assets/nav.js'),
    path.resolve('./templates/nav.js'),
  ];
  const jsSource = possibleJsPaths.find(p => fs.existsSync(p));

  if (stylesSource) {
    fs.copyFileSync(stylesSource, path.join(assetsDir, 'styles.css'));
  } else {
    console.log('  [warn] No styles.css found — generating placeholder');
    fs.writeFileSync(path.join(assetsDir, 'styles.css'), '/* placeholder */');
  }

  if (jsSource) {
    fs.copyFileSync(jsSource, path.join(assetsDir, 'nav.js'));
  } else {
    console.log('  [warn] No nav.js found — generating placeholder');
    fs.writeFileSync(path.join(assetsDir, 'nav.js'), '// placeholder');
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

console.log(`Generating course site for ${course.id}: ${course.name}`);
console.log(`Schema: ${schemaPath}`);
console.log('');

cleanOutput();

generateCourseOverview();

for (const sprint of sprints) {
  generateSprintView(sprint);

  for (let wi = 0; wi < (sprint.weeks || []).length; wi++) {
    const week = sprint.weeks[wi];
    generateWeekView(sprint, week, wi);

    for (let ai = 0; ai < (week.assignments || []).length; ai++) {
      generateAssignmentView(sprint, week, week.assignments[ai], ai);
    }
  }
}

copyAssets();

console.log('');
console.log(`Done! Generated site in ${outputDir}/`);
console.log(`Open ${outputDir}/index.html to view.`);
