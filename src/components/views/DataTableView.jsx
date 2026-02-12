import { useState, useMemo } from 'react';
import { useCourseData } from '../../hooks/useCourseData';
import { getTypeStyle } from '../tags/TypeBadge';
import { EDIT_MODE } from '../../config';
import ReviewStatusBadge, { getReviewStatus } from '../ReviewStatusBadge';

const TYPES = ['goal', 'activity', 'reflection', 'demo', 'peer'];
const REVIEW_STATUSES = ['proposed', 'confirmed', 'needs_review'];

const BASE_COLUMNS = [
  { key: 'name', label: 'Name', w: 'minmax(140px,1fr)' },
  { key: 'type', label: 'Type', w: '90px' },
  { key: 'week', label: 'Wk', w: '48px' },
  { key: 'due', label: 'Due', w: '70px' },
  { key: 'time', label: 'Time', w: '80px' },
  { key: 'primary_layer', label: 'Primary', w: '100px' },
  { key: 'boundary_layer', label: 'Boundary', w: '100px' },
  { key: 'pathways', label: 'Pathways', w: '120px' },
  { key: 'requires', label: 'Requires', w: '120px' },
  { key: 'science_q', label: 'Science Q', w: 'minmax(120px,1fr)' },
];

export default function DataTableView({ onSelectAssignment, selected }) {
  const {
    data,
    getLayer,
    getPathway,
    getAssignment,
    updateAssignment,
    addAssignment,
    deleteAssignment,
    duplicateAssignment,
    confirmAssignment,
    rejectAssignment,
    setReviewStatus,
  } = useCourseData();

  const layers = data.layers || [];
  const pathways = data.pathways || [];
  const assignments = data.assignments || [];

  const [sortKey, setSortKey] = useState('week');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterType, setFilterType] = useState(null);
  const [filterWeek, setFilterWeek] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [editCell, setEditCell] = useState(null); // { id, key }

  // Add status column when there are any non-confirmed assignments
  const hasImported = assignments.some((a) => a.review_status && a.review_status !== 'confirmed');
  const COLUMNS = hasImported
    ? [{ key: 'review_status', label: 'Status', w: '72px' }, ...BASE_COLUMNS]
    : BASE_COLUMNS;

  const weeks = useMemo(() => {
    const s = new Set(assignments.map((a) => a.week));
    return [...s].sort((a, b) => a - b);
  }, [assignments]);

  const sorted = useMemo(() => {
    let list = [...assignments];
    if (filterType) list = list.filter((a) => a.type === filterType);
    if (filterWeek) list = list.filter((a) => a.week === filterWeek);
    if (filterStatus) list = list.filter((a) => getReviewStatus(a) === filterStatus);
    list.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [assignments, sortKey, sortAsc, filterType, filterWeek, filterStatus]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleAdd() {
    const id = 'new-' + Date.now();
    addAssignment({
      id,
      name: 'New Assignment',
      type: 'activity',
      week: 1,
      due: 'TBD',
      time: '30m',
      primary_layer: 'design',
      boundary_layer: null,
      pathways: [],
      requires: [],
      science_q: '',
      criteria: [],
      red_flags: [],
      growth: [],
    });
  }

  function startEdit(id, key) {
    if (!EDIT_MODE) return;
    setEditCell({ id, key });
  }

  function commitEdit(id, key, value) {
    updateAssignment(id, { [key]: value });
    setEditCell(null);
  }

  function cancelEdit() {
    setEditCell(null);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[0.82rem] font-bold text-slate-700">
          Assignments
        </span>
        <span className="text-[0.68rem] text-slate-400">
          {sorted.length} of {assignments.length}
        </span>

        <div className="ml-auto flex gap-1.5 items-center">
          {/* Status filter (only when there are imported items) */}
          {hasImported && (
            <select
              className="text-[0.72rem] border border-slate-200 rounded px-1.5 py-[3px] bg-white text-slate-600"
              value={filterStatus || ''}
              onChange={(e) => setFilterStatus(e.target.value || null)}
            >
              <option value="">All statuses</option>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Type filter */}
          <select
            className="text-[0.72rem] border border-slate-200 rounded px-1.5 py-[3px] bg-white text-slate-600"
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value || null)}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Week filter */}
          <select
            className="text-[0.72rem] border border-slate-200 rounded px-1.5 py-[3px] bg-white text-slate-600"
            value={filterWeek || ''}
            onChange={(e) =>
              setFilterWeek(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">All weeks</option>
            {weeks.map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>

          {EDIT_MODE && (
            <button
              onClick={handleAdd}
              className="text-[0.72rem] font-semibold px-2.5 py-[4px] rounded border-none cursor-pointer"
              style={{ backgroundColor: '#14b8a618', color: '#0f766e' }}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <div
          className="min-w-[900px]"
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS.map((c) => c.w).join(' '),
          }}
        >
          {/* Header */}
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="px-2 py-[6px] text-[0.66rem] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none bg-slate-50 border-b border-slate-200"
              style={{ display: 'flex', alignItems: 'center', gap: 3 }}
            >
              {col.label}
              {sortKey === col.key && (
                <span className="text-slate-500">{sortAsc ? '\u25B2' : '\u25BC'}</span>
              )}
            </div>
          ))}

          {/* Rows */}
          {sorted.map((a) => (
            <TableRow
              key={a.id}
              assignment={a}
              isSelected={a.id === selected}
              editCell={editCell}
              layers={layers}
              pathways={pathways}
              assignments={assignments}
              hasStatusColumn={hasImported}
              getLayer={getLayer}
              getPathway={getPathway}
              getAssignment={getAssignment}
              onSelect={() => onSelectAssignment(a.id)}
              onStartEdit={startEdit}
              onCommitEdit={commitEdit}
              onCancelEdit={cancelEdit}
              onDelete={() => deleteAssignment(a.id)}
              onDuplicate={() => duplicateAssignment(a.id)}
              onConfirm={() => confirmAssignment(a.id)}
              onReject={() => rejectAssignment(a.id)}
              onSetStatus={(s) => setReviewStatus(a.id, s)}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center text-slate-400 text-[0.78rem] py-8">
            No assignments match filters
          </div>
        )}
      </div>
    </div>
  );
}

function TableRow({
  assignment: a,
  isSelected,
  editCell,
  layers,
  pathways,
  assignments,
  hasStatusColumn,
  getLayer,
  getPathway,
  getAssignment,
  onSelect,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  onConfirm,
  onReject,
  onSetStatus,
}) {
  const isEditing = (key) => EDIT_MODE && editCell?.id === a.id && editCell?.key === key;
  const st = getTypeStyle(a.type);
  const status = getReviewStatus(a);
  const isProposed = status === 'proposed';

  const cellClass =
    'px-2 py-[5px] text-[0.74rem] border-b border-slate-100 flex items-center min-h-[32px]' +
    (isSelected ? ' bg-teal-50' : isProposed ? ' bg-amber-50/30' : ' hover:bg-slate-50');

  return (
    <>
      {/* Status column */}
      {hasStatusColumn && (
        <div className={cellClass}>
          <ReviewStatusBadge assignment={a} />
          {EDIT_MODE && isProposed && (
            <button
              onClick={onConfirm}
              className="text-[0.56rem] ml-1 px-1 py-0 rounded border border-green-200 bg-green-50 text-green-600 cursor-pointer font-semibold"
              title="Confirm"
            >
              OK
            </button>
          )}
        </div>
      )}

      {/* Name */}
      <div className={cellClass} style={{ cursor: 'pointer' }}>
        {isEditing('name') ? (
          <input
            autoFocus
            defaultValue={a.name}
            className="w-full text-[0.74rem] border border-slate-300 rounded px-1 py-0.5"
            onBlur={(e) => onCommitEdit(a.id, 'name', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit(a.id, 'name', e.target.value);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <span
            className="truncate font-medium text-slate-700 cursor-pointer"
            onClick={onSelect}
            onDoubleClick={() => onStartEdit(a.id, 'name')}
            title={a.name}
            style={isProposed ? { fontStyle: 'italic' } : undefined}
          >
            {a.name}
          </span>
        )}
      </div>

      {/* Type */}
      <div className={cellClass}>
        {isEditing('type') ? (
          <select
            autoFocus
            defaultValue={a.type}
            className="text-[0.72rem] border border-slate-300 rounded px-0.5 py-0.5"
            onChange={(e) => onCommitEdit(a.id, 'type', e.target.value)}
            onBlur={onCancelEdit}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <span
            className="text-[0.68rem] font-semibold px-1.5 py-[1px] rounded-full cursor-pointer"
            style={{ backgroundColor: st.bg, color: st.text }}
            onDoubleClick={() => onStartEdit(a.id, 'type')}
          >
            {st.label}
          </span>
        )}
      </div>

      {/* Week */}
      <div className={cellClass}>
        {isEditing('week') ? (
          <input
            autoFocus
            type="number"
            min={1}
            max={4}
            defaultValue={a.week}
            className="w-full text-[0.74rem] border border-slate-300 rounded px-1 py-0.5"
            onBlur={(e) => onCommitEdit(a.id, 'week', Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit(a.id, 'week', Number(e.target.value));
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <span
            className="text-slate-600 cursor-pointer"
            onDoubleClick={() => onStartEdit(a.id, 'week')}
          >
            {a.week}
          </span>
        )}
      </div>

      {/* Due */}
      <div className={cellClass}>
        {isEditing('due') ? (
          <input
            autoFocus
            defaultValue={a.due}
            className="w-full text-[0.74rem] border border-slate-300 rounded px-1 py-0.5"
            onBlur={(e) => onCommitEdit(a.id, 'due', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit(a.id, 'due', e.target.value);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <span
            className="text-slate-500 text-[0.72rem] cursor-pointer"
            onDoubleClick={() => onStartEdit(a.id, 'due')}
          >
            {a.due}
          </span>
        )}
      </div>

      {/* Time */}
      <div className={cellClass}>
        {isEditing('time') ? (
          <input
            autoFocus
            defaultValue={a.time}
            className="w-full text-[0.74rem] border border-slate-300 rounded px-1 py-0.5"
            onBlur={(e) => onCommitEdit(a.id, 'time', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit(a.id, 'time', e.target.value);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <span
            className="text-slate-500 text-[0.72rem] cursor-pointer"
            onDoubleClick={() => onStartEdit(a.id, 'time')}
          >
            {a.time}
          </span>
        )}
      </div>

      {/* Primary Layer */}
      <div className={cellClass}>
        {isEditing('primary_layer') ? (
          <select
            autoFocus
            defaultValue={a.primary_layer || ''}
            className="text-[0.72rem] border border-slate-300 rounded px-0.5 py-0.5"
            onChange={(e) =>
              onCommitEdit(a.id, 'primary_layer', e.target.value || null)
            }
            onBlur={onCancelEdit}
          >
            <option value="">None</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        ) : (
          <LayerPill
            layerId={a.primary_layer}
            getLayer={getLayer}
            onDoubleClick={() => onStartEdit(a.id, 'primary_layer')}
          />
        )}
      </div>

      {/* Boundary Layer */}
      <div className={cellClass}>
        {isEditing('boundary_layer') ? (
          <select
            autoFocus
            defaultValue={a.boundary_layer || ''}
            className="text-[0.72rem] border border-slate-300 rounded px-0.5 py-0.5"
            onChange={(e) =>
              onCommitEdit(a.id, 'boundary_layer', e.target.value || null)
            }
            onBlur={onCancelEdit}
          >
            <option value="">None</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        ) : (
          <LayerPill
            layerId={a.boundary_layer}
            getLayer={getLayer}
            onDoubleClick={() => onStartEdit(a.id, 'boundary_layer')}
          />
        )}
      </div>

      {/* Pathways */}
      <div className={cellClass}>
        {isEditing('pathways') ? (
          <MultiSelect
            options={pathways.map((p) => ({ value: p.id, label: p.abbr }))}
            selected={a.pathways || []}
            onCommit={(val) => onCommitEdit(a.id, 'pathways', val)}
            onCancel={onCancelEdit}
          />
        ) : (
          <div
            className="flex gap-[2px] flex-wrap cursor-pointer"
            onDoubleClick={() => onStartEdit(a.id, 'pathways')}
          >
            {(a.pathways || []).map((pid) => {
              const pw = getPathway(pid);
              return pw ? (
                <span
                  key={pid}
                  className="text-[0.6rem] font-semibold px-1 rounded"
                  style={{ backgroundColor: pw.color + '18', color: pw.color }}
                >
                  {pw.abbr}
                </span>
              ) : null;
            })}
            {(a.pathways || []).length === 0 && (
              <span className="text-slate-300 text-[0.68rem]">&mdash;</span>
            )}
          </div>
        )}
      </div>

      {/* Requires */}
      <div className={cellClass}>
        {isEditing('requires') ? (
          <MultiSelect
            options={assignments
              .filter((x) => x.id !== a.id)
              .map((x) => ({ value: x.id, label: x.name.length > 20 ? x.name.slice(0, 18) + '\u2026' : x.name }))}
            selected={a.requires || []}
            onCommit={(val) => onCommitEdit(a.id, 'requires', val)}
            onCancel={onCancelEdit}
          />
        ) : (
          <div
            className="flex gap-[2px] flex-wrap cursor-pointer"
            onDoubleClick={() => onStartEdit(a.id, 'requires')}
          >
            {(a.requires || []).map((rid) => {
              const req = getAssignment(rid);
              return (
                <span
                  key={rid}
                  className="text-[0.6rem] px-1 rounded bg-slate-100 text-slate-500"
                >
                  {req ? (req.name.length > 12 ? req.name.slice(0, 10) + '\u2026' : req.name) : rid}
                </span>
              );
            })}
            {(a.requires || []).length === 0 && (
              <span className="text-slate-300 text-[0.68rem]">&mdash;</span>
            )}
          </div>
        )}
      </div>

      {/* Science Q */}
      <div className={cellClass}>
        {isEditing('science_q') ? (
          <input
            autoFocus
            defaultValue={a.science_q || ''}
            className="w-full text-[0.72rem] border border-slate-300 rounded px-1 py-0.5"
            onBlur={(e) => onCommitEdit(a.id, 'science_q', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit(a.id, 'science_q', e.target.value);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <div className="flex items-center gap-1 w-full">
            <span
              className="truncate text-slate-500 text-[0.68rem] flex-1 cursor-pointer"
              onDoubleClick={() => onStartEdit(a.id, 'science_q')}
              title={a.science_q}
            >
              {a.science_q || '\u2014'}
            </span>
            {/* Row actions (edit mode only) */}
            {EDIT_MODE && (
              <div className="flex gap-[2px] ml-auto shrink-0">
                <button
                  onClick={onDuplicate}
                  className="text-[0.62rem] text-slate-400 hover:text-slate-600 px-1 py-0 border-none bg-transparent cursor-pointer"
                  title="Duplicate"
                >
                  &#10697;
                </button>
                <button
                  onClick={onDelete}
                  className="text-[0.62rem] text-slate-400 hover:text-red-500 px-1 py-0 border-none bg-transparent cursor-pointer"
                  title="Delete"
                >
                  &#10005;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function LayerPill({ layerId, getLayer, onDoubleClick }) {
  if (!layerId) {
    return (
      <span
        className="text-slate-300 text-[0.68rem] cursor-pointer"
        onDoubleClick={onDoubleClick}
      >
        &mdash;
      </span>
    );
  }
  const l = getLayer(layerId);
  if (!l) return <span className="text-slate-300">{layerId}</span>;
  return (
    <span
      className="text-[0.66rem] font-semibold px-1.5 py-[1px] rounded-full cursor-pointer"
      style={{ backgroundColor: l.color + '18', color: l.color }}
      onDoubleClick={onDoubleClick}
    >
      {l.name}
    </span>
  );
}

function MultiSelect({ options, selected, onCommit, onCancel }) {
  const [value, setValue] = useState([...selected]);

  function toggle(val) {
    setValue((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  return (
    <div className="flex flex-col gap-[2px] text-[0.68rem]">
      <div className="flex flex-wrap gap-[2px] max-h-[80px] overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            className="px-1 py-0 border rounded text-[0.64rem] cursor-pointer"
            style={{
              borderColor: value.includes(o.value) ? '#14b8a6' : '#e2e8f0',
              backgroundColor: value.includes(o.value) ? '#14b8a618' : '#fff',
              color: value.includes(o.value) ? '#0f766e' : '#94a3b8',
              fontWeight: value.includes(o.value) ? 600 : 400,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onCommit(value)}
          className="text-[0.62rem] font-semibold px-1.5 py-0 rounded border-none cursor-pointer"
          style={{ backgroundColor: '#14b8a6', color: '#fff' }}
        >
          OK
        </button>
        <button
          onClick={onCancel}
          className="text-[0.62rem] px-1.5 py-0 rounded border border-slate-200 bg-white text-slate-500 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
