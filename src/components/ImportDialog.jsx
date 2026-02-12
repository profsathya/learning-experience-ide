import { useState, useCallback } from 'react';
import { useCourseData } from '../hooks/useCourseData';
import { crawlCourse, analyzePage, getPageList } from '../utils/page-crawler';
import { extractAnalysisNotes } from '../utils/import-merge';
import { getTypeStyle } from './tags/TypeBadge';

const BASE_URL = 'https://profsathya.github.io/Common-Curriculum/';
const COURSES = ['CST395', 'CST349'];

export default function ImportDialog({ onClose }) {
  const { data, importProposed, getLayer } = useCourseData();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [courseId, setCourseId] = useState('CST395');
  const [selectedSprints, setSelectedSprints] = useState([1]);

  // Step 2 state
  const [pages, setPages] = useState([]);
  const [fetchStatus, setFetchStatus] = useState('idle'); // idle | fetching | done | error
  const [expandedPage, setExpandedPage] = useState(null);

  // Step 3 state
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // idle | analyzing | done
  const [analysisResults, setAnalysisResults] = useState([]); // { assignments, weeks, analysisNotes }
  const [pageAnalysisStatus, setPageAnalysisStatus] = useState({}); // url → 'pending' | 'analyzing' | 'done' | 'error'
  const [proposedActions, setProposedActions] = useState({}); // id → 'confirm' | 'reject' | null

  // --- Step 1: Configure ---
  function toggleSprint(n) {
    setSelectedSprints((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n].sort()
    );
  }

  async function handleFetch() {
    setFetchStatus('fetching');
    setPages([]);

    try {
      const results = await crawlCourse(BASE_URL, courseId, {
        onPageDone: (result) => {
          setPages((prev) => [...prev, result]);
        },
      });
      setPages(results);
      setFetchStatus('done');
      setStep(2);
    } catch (err) {
      setFetchStatus('error');
    }
  }

  // --- Step 2: Review Pages ---
  function getFilteredPages() {
    // Filter to relevant pages for selected sprints
    return pages.filter((p) => {
      if (p.type === 'sprint') return selectedSprints.includes(p.sprint_number);
      if (p.type === 'overview' || p.type === 'capabilities' || p.type === 'concepts')
        return true;
      return false;
    });
  }

  async function handleAnalyzeAll() {
    const relevantPages = getFilteredPages().filter((p) => p.status === 'success');
    setAnalysisStatus('analyzing');
    setStep(3);

    const allAssignments = [];
    const allWeeks = [];
    const allNotes = new Map();

    // Get existing confirmed data for context
    const confirmedData = (data.assignments || []).filter(
      (a) => !a.review_status || a.review_status === 'confirmed'
    );

    for (const page of relevantPages) {
      setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'analyzing' }));

      try {
        // Build content string from sections
        const content = page.sections
          ? page.sections.map((s) => (s.heading ? `## ${s.heading}\n${s.content}` : s.content)).join('\n\n')
          : page.raw_text || '';

        const result = await analyzePage({
          courseId,
          pageType: page.type,
          sprintNumber: page.sprint_number,
          pageContent: content,
          existingData: confirmedData.length > 0 ? confirmedData : undefined,
        });

        if (result.assignments) {
          const notes = extractAnalysisNotes(result.assignments);
          notes.forEach((v, k) => allNotes.set(k, v));
          allAssignments.push(...result.assignments);
        }
        if (result.weeks) {
          allWeeks.push(...result.weeks);
        }

        setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'done' }));
      } catch (err) {
        setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'error' }));
      }
    }

    setAnalysisResults({ assignments: allAssignments, weeks: allWeeks, analysisNotes: allNotes });
    setAnalysisStatus('done');
  }

  async function handleAnalyzeSingle(page) {
    setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'analyzing' }));

    try {
      const content = page.sections
        ? page.sections.map((s) => (s.heading ? `## ${s.heading}\n${s.content}` : s.content)).join('\n\n')
        : page.raw_text || '';

      const confirmedData = (data.assignments || []).filter(
        (a) => !a.review_status || a.review_status === 'confirmed'
      );

      const result = await analyzePage({
        courseId,
        pageType: page.type,
        sprintNumber: page.sprint_number,
        pageContent: content,
        existingData: confirmedData.length > 0 ? confirmedData : undefined,
      });

      setAnalysisResults((prev) => {
        const existing = prev.assignments || [];
        const existingWeeks = prev.weeks || [];
        const existingNotes = prev.analysisNotes || new Map();
        const newNotes = extractAnalysisNotes(result.assignments || []);
        newNotes.forEach((v, k) => existingNotes.set(k, v));
        return {
          assignments: [...existing, ...(result.assignments || [])],
          weeks: [...existingWeeks, ...(result.weeks || [])],
          analysisNotes: existingNotes,
        };
      });

      setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'done' }));
      if (step < 3) setStep(3);
    } catch (err) {
      setPageAnalysisStatus((prev) => ({ ...prev, [page.url]: 'error' }));
    }
  }

  // --- Step 3: Review & Import ---
  function toggleAction(id, action) {
    setProposedActions((prev) => ({
      ...prev,
      [id]: prev[id] === action ? null : action,
    }));
  }

  function handleImportConfirmed() {
    const results = analysisResults.assignments || [];
    const confirmed = results.filter(
      (a) => proposedActions[a.id] === 'confirm' || !proposedActions[a.id]
    );
    const rejected = new Set(
      results.filter((a) => proposedActions[a.id] === 'reject').map((a) => a.id)
    );
    const toImport = confirmed.filter((a) => !rejected.has(a.id));

    importProposed(toImport, analysisResults.weeks || []);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-h-[85vh] flex flex-col"
        style={{ width: 720, maxWidth: '95vw' }}
      >
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-[0.92rem] font-bold text-slate-900 m-0">
              Import from Course Site
            </h2>
            <div className="text-[0.72rem] text-slate-400 mt-0.5">
              Step {step} of 3 &middot;{' '}
              {step === 1 ? 'Configure' : step === 2 ? 'Review Pages' : 'Review Analysis'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 text-lg"
          >
            &#10005;
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-5 pt-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-[3px] flex-1 rounded-full"
              style={{
                backgroundColor: s <= step ? '#14b8a6' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <Step1Configure
              courseId={courseId}
              setCourseId={setCourseId}
              selectedSprints={selectedSprints}
              toggleSprint={toggleSprint}
              fetchStatus={fetchStatus}
              onFetch={handleFetch}
            />
          )}
          {step === 2 && (
            <Step2ReviewPages
              pages={pages}
              expandedPage={expandedPage}
              setExpandedPage={setExpandedPage}
              pageAnalysisStatus={pageAnalysisStatus}
              onAnalyzeSingle={handleAnalyzeSingle}
              onAnalyzeAll={handleAnalyzeAll}
              onBack={() => setStep(1)}
              selectedSprints={selectedSprints}
            />
          )}
          {step === 3 && (
            <Step3ReviewAnalysis
              analysisResults={analysisResults}
              analysisStatus={analysisStatus}
              pageAnalysisStatus={pageAnalysisStatus}
              proposedActions={proposedActions}
              toggleAction={toggleAction}
              getLayer={getLayer}
              onImport={handleImportConfirmed}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step 1 ---
function Step1Configure({ courseId, setCourseId, selectedSprints, toggleSprint, fetchStatus, onFetch }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[0.72rem] font-semibold text-slate-500 uppercase block mb-1">
          Course
        </label>
        <div className="flex gap-2">
          {COURSES.map((c) => (
            <button
              key={c}
              onClick={() => setCourseId(c)}
              className="px-3 py-1.5 rounded-lg border cursor-pointer text-[0.8rem] font-semibold"
              style={{
                borderColor: courseId === c ? '#14b8a6' : '#e2e8f0',
                backgroundColor: courseId === c ? '#14b8a618' : '#fff',
                color: courseId === c ? '#0f766e' : '#64748b',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[0.72rem] font-semibold text-slate-500 uppercase block mb-1">
          Base URL
        </label>
        <div className="text-[0.78rem] text-slate-600 bg-slate-50 rounded px-3 py-2 font-mono">
          {BASE_URL}
        </div>
      </div>

      <div>
        <label className="text-[0.72rem] font-semibold text-slate-500 uppercase block mb-1">
          Sprints to Import
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => toggleSprint(n)}
              className="px-3 py-1.5 rounded-lg border cursor-pointer text-[0.8rem] font-semibold"
              style={{
                borderColor: selectedSprints.includes(n) ? '#14b8a6' : '#e2e8f0',
                backgroundColor: selectedSprints.includes(n) ? '#14b8a618' : '#fff',
                color: selectedSprints.includes(n) ? '#0f766e' : '#64748b',
              }}
            >
              Sprint {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onFetch}
        disabled={fetchStatus === 'fetching' || selectedSprints.length === 0}
        className="mt-3 px-4 py-2 rounded-lg border-none cursor-pointer text-[0.82rem] font-bold"
        style={{
          backgroundColor: fetchStatus === 'fetching' ? '#94a3b8' : '#14b8a6',
          color: '#fff',
          opacity: selectedSprints.length === 0 ? 0.5 : 1,
        }}
      >
        {fetchStatus === 'fetching' ? 'Fetching Pages...' : 'Fetch Pages'}
      </button>
    </div>
  );
}

// --- Step 2 ---
function Step2ReviewPages({
  pages,
  expandedPage,
  setExpandedPage,
  pageAnalysisStatus,
  onAnalyzeSingle,
  onAnalyzeAll,
  onBack,
  selectedSprints,
}) {
  const filteredPages = pages.filter((p) => {
    if (p.type === 'sprint') return selectedSprints.includes(p.sprint_number);
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.78rem] text-slate-500">
          {pages.filter((p) => p.status === 'success').length} of {pages.length} pages fetched
          successfully
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer text-[0.76rem] font-semibold"
          >
            Back
          </button>
          <button
            onClick={onAnalyzeAll}
            className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-[0.76rem] font-bold"
            style={{ backgroundColor: '#14b8a6', color: '#fff' }}
          >
            Analyze All with Claude
          </button>
        </div>
      </div>

      {filteredPages.map((page) => (
        <div
          key={page.url}
          className="border border-slate-200 rounded-lg overflow-hidden"
        >
          <div
            className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer"
            onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
          >
            <div className="flex items-center gap-2">
              <StatusDot status={page.status} />
              <span className="text-[0.78rem] font-semibold text-slate-700">
                {page.label}
              </span>
              <span className="text-[0.66rem] text-slate-400">{page.type}</span>
              {pageAnalysisStatus[page.url] && (
                <AnalysisStatusPill status={pageAnalysisStatus[page.url]} />
              )}
            </div>
            <div className="flex items-center gap-2">
              {page.status === 'success' && !pageAnalysisStatus[page.url] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyzeSingle(page);
                  }}
                  className="text-[0.68rem] font-semibold px-2 py-[2px] rounded border-none cursor-pointer"
                  style={{ backgroundColor: '#8b5cf618', color: '#7c3aed' }}
                >
                  Analyze
                </button>
              )}
              <span className="text-slate-400 text-[0.7rem]">
                {expandedPage === page.url ? '\u25B2' : '\u25BC'}
              </span>
            </div>
          </div>
          {expandedPage === page.url && page.status === 'success' && (
            <div className="px-3 py-2 text-[0.72rem] text-slate-500 max-h-[200px] overflow-y-auto bg-white">
              {(page.sections || []).map((s, i) => (
                <div key={i} className="mb-2">
                  {s.heading && (
                    <div className="font-bold text-slate-700 mb-0.5">{s.heading}</div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {s.content.slice(0, 500)}
                    {s.content.length > 500 && '...'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {expandedPage === page.url && page.status === 'error' && (
            <div className="px-3 py-2 text-[0.72rem] text-red-500">
              Error: {page.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Step 3 ---
function Step3ReviewAnalysis({
  analysisResults,
  analysisStatus,
  pageAnalysisStatus,
  proposedActions,
  toggleAction,
  getLayer,
  onImport,
  onBack,
}) {
  const assignments = analysisResults.assignments || [];
  const analysisNotes = analysisResults.analysisNotes || new Map();

  const confirmedCount = assignments.filter(
    (a) => proposedActions[a.id] === 'confirm' || !proposedActions[a.id]
  ).length;
  const rejectedCount = assignments.filter((a) => proposedActions[a.id] === 'reject').length;

  return (
    <div className="space-y-3">
      {analysisStatus === 'analyzing' && (
        <div className="text-center py-6">
          <div className="text-[0.82rem] text-slate-500 mb-2">Analyzing pages with Claude...</div>
          <div className="flex gap-1 justify-center flex-wrap">
            {Object.entries(pageAnalysisStatus).map(([url, status]) => (
              <AnalysisStatusPill key={url} status={status} />
            ))}
          </div>
        </div>
      )}

      {assignments.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[0.78rem] text-slate-500">
              {assignments.length} assignments found &middot;{' '}
              <span className="text-green-600">{confirmedCount} to import</span>
              {rejectedCount > 0 && (
                <span className="text-red-500"> &middot; {rejectedCount} rejected</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer text-[0.76rem] font-semibold"
              >
                Back
              </button>
              <button
                onClick={onImport}
                disabled={confirmedCount === 0}
                className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-[0.76rem] font-bold"
                style={{
                  backgroundColor: confirmedCount > 0 ? '#14b8a6' : '#94a3b8',
                  color: '#fff',
                }}
              >
                Import {confirmedCount} Assignments
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {assignments.map((a) => {
              const st = getTypeStyle(a.type);
              const action = proposedActions[a.id];
              const primary = a.primary_layer ? getLayer(a.primary_layer) : null;
              const boundary = a.boundary_layer ? getLayer(a.boundary_layer) : null;
              const notes = analysisNotes.get(a.id);

              return (
                <ProposedRow
                  key={a.id}
                  assignment={a}
                  typeStyle={st}
                  primary={primary}
                  boundary={boundary}
                  notes={notes}
                  action={action}
                  onToggle={toggleAction}
                />
              );
            })}
          </div>
        </>
      )}

      {analysisStatus === 'done' && assignments.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-[0.82rem]">
          No assignments were extracted. Try analyzing different pages.
        </div>
      )}
    </div>
  );
}

function ProposedRow({ assignment: a, typeStyle, primary, boundary, notes, action, onToggle }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        borderColor: action === 'reject' ? '#fca5a520' : action === 'confirm' ? '#86efac40' : '#e2e8f0',
        backgroundColor: action === 'reject' ? '#fef2f208' : '#fff',
        opacity: action === 'reject' ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Type badge */}
        <span
          className="text-[0.64rem] font-semibold px-1.5 py-[1px] rounded-full shrink-0"
          style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
        >
          {typeStyle.label}
        </span>

        {/* Name */}
        <span className="text-[0.78rem] font-semibold text-slate-800 flex-1 min-w-0 truncate">
          {a.name}
        </span>

        {/* Week */}
        <span className="text-[0.68rem] text-slate-400 shrink-0">W{a.week}</span>

        {/* Layer badges */}
        {primary && (
          <span
            className="text-[0.6rem] font-semibold px-1.5 py-[1px] rounded-full shrink-0"
            style={{ backgroundColor: primary.color + '18', color: primary.color }}
          >
            {primary.name}
          </span>
        )}
        {boundary && (
          <>
            <span className="text-slate-300 text-[0.6rem]">&rarr;</span>
            <span
              className="text-[0.6rem] font-semibold px-1.5 py-[1px] rounded-full shrink-0"
              style={{ backgroundColor: boundary.color + '18', color: boundary.color }}
            >
              {boundary.name}
            </span>
          </>
        )}
        {!a.primary_layer && !a.boundary_layer && (
          <span className="text-[0.6rem] text-slate-400 italic">Full spectrum</span>
        )}

        {/* Notes toggle */}
        {notes && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-[0.62rem] px-1.5 py-[1px] rounded border bg-slate-50 text-slate-400 cursor-pointer border-slate-200"
            title="Show analysis notes"
          >
            Notes
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-1 shrink-0 ml-1">
          <button
            onClick={() => onToggle(a.id, 'confirm')}
            className="text-[0.66rem] px-1.5 py-[2px] rounded border cursor-pointer font-semibold"
            style={{
              borderColor: action === 'confirm' ? '#86efac' : '#e2e8f0',
              backgroundColor: action === 'confirm' ? '#dcfce7' : '#fff',
              color: action === 'confirm' ? '#15803d' : '#94a3b8',
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => onToggle(a.id, 'reject')}
            className="text-[0.66rem] px-1.5 py-[2px] rounded border cursor-pointer font-semibold"
            style={{
              borderColor: action === 'reject' ? '#fca5a5' : '#e2e8f0',
              backgroundColor: action === 'reject' ? '#fef2f2' : '#fff',
              color: action === 'reject' ? '#dc2626' : '#94a3b8',
            }}
          >
            Reject
          </button>
        </div>
      </div>

      {/* Expandable notes */}
      {showNotes && notes && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
          <div className="text-[0.66rem] font-semibold text-slate-400 uppercase mb-0.5">
            Claude's Reasoning
          </div>
          <div className="text-[0.72rem] text-slate-600 leading-relaxed">{notes}</div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const color = status === 'success' ? '#22c55e' : status === 'error' ? '#ef4444' : '#94a3b8';
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function AnalysisStatusPill({ status }) {
  const config = {
    pending: { bg: '#f1f5f9', color: '#94a3b8', label: 'Pending' },
    analyzing: { bg: '#8b5cf618', color: '#7c3aed', label: 'Analyzing...' },
    done: { bg: '#dcfce7', color: '#15803d', label: 'Done' },
    error: { bg: '#fef2f2', color: '#dc2626', label: 'Error' },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className="text-[0.6rem] font-semibold px-1.5 py-[1px] rounded-full"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}
