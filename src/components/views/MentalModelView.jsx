import { useState, useRef, useCallback, useMemo } from 'react';
import { useCourseData } from '../../hooks/useCourseData';
import { getTypeStyle } from '../tags/TypeBadge';
import { getReviewStatus } from '../ReviewStatusBadge';

// Layer column order (left → right)
const LAYER_ORDER = ['philosophy', 'psychology', 'design', 'engineering', 'business'];
const LAYER_POSITIONS = {
  philosophy:  { start: 0,  center: 10 },
  psychology:  { start: 20, center: 30 },
  design:      { start: 40, center: 50 },
  engineering: { start: 60, center: 70 },
  business:    { start: 80, center: 90 },
};
const COL_WIDTH = 20; // each column is 20%

export default function MentalModelView({ onSelect, selected, filters }) {
  const { data, getLayer } = useCourseData();
  const layers = data.layers || [];
  const assignments = data.assignments || [];
  const weeks = data.weeks || [];
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  // Apply filters
  const filtered = useMemo(() => {
    if (!filters) return assignments;
    return assignments.filter((a) => {
      if (filters.pathway && filters.pathway !== 'all') {
        if (!(a.pathways || []).includes(filters.pathway)) return false;
      }
      if (filters.type && filters.type !== 'all') {
        if (a.type !== filters.type) return false;
      }
      if (filters.status && filters.status !== 'all') {
        if (getReviewStatus(a) !== filters.status) return false;
      }
      return true;
    });
  }, [assignments, filters]);

  // Group by week, sort by dependency order within each week
  const weekGroups = useMemo(() => {
    const weekNums = [...new Set(filtered.map((a) => a.week))].sort((a, b) => a - b);
    return weekNums.map((wNum) => {
      const weekData = weeks.find((w) => w.number === wNum);
      const weekAssignments = filtered.filter((a) => a.week === wNum);
      // Topological sort by requires (dependencies first)
      const sorted = topoSort(weekAssignments, assignments);
      return { number: wNum, title: weekData?.title || `Week ${wNum}`, assignments: sorted };
    });
  }, [filtered, weeks, assignments]);

  // Get bar position as percentages
  const getBarStyle = useCallback(
    (a) => {
      // Demos span full width
      if (!a.primary_layer && !a.boundary_layer) {
        return { left: '0%', width: '100%' };
      }
      const pIdx = LAYER_ORDER.indexOf(a.primary_layer);
      const bIdx = a.boundary_layer ? LAYER_ORDER.indexOf(a.boundary_layer) : pIdx;
      const minIdx = Math.min(pIdx, bIdx);
      const maxIdx = Math.max(pIdx, bIdx);
      const left = minIdx * COL_WIDTH;
      const width = (maxIdx - minIdx + 1) * COL_WIDTH;
      return { left: `${left}%`, width: `${width}%` };
    },
    []
  );

  // Dependency arrow data for hovered/selected assignment
  const depArrows = useMemo(() => {
    const target = hovered || selected;
    if (!target) return [];
    const a = assignments.find((x) => x.id === target);
    if (!a) return [];
    const arrows = [];
    // Incoming: things this assignment requires
    (a.requires || []).forEach((rid) => {
      const req = assignments.find((x) => x.id === rid);
      if (req) arrows.push({ from: rid, to: target, type: 'requires' });
    });
    // Outgoing: things that require this assignment
    assignments.forEach((other) => {
      if ((other.requires || []).includes(target)) {
        arrows.push({ from: target, to: other.id, type: 'enables' });
      }
    });
    return arrows;
  }, [hovered, selected, assignments]);

  return (
    <div ref={containerRef} className="relative">
      {/* Column headers */}
      <SpectrumHeader layers={layers} />

      {/* Week groups */}
      <div className="mt-1">
        {weekGroups.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-12">
            No assignments match the current filters.
          </div>
        )}
        {weekGroups.map((wg) => (
          <WeekGroup key={wg.number} week={wg}>
            {wg.assignments.map((a) => (
              <SpectrumBar
                key={a.id}
                assignment={a}
                style={getBarStyle(a)}
                isSelected={a.id === selected}
                isHovered={a.id === hovered}
                isDimmed={
                  (hovered && a.id !== hovered && !depArrows.some((d) => d.from === a.id || d.to === a.id)) ||
                  false
                }
                isDepTarget={depArrows.some((d) => d.from === a.id || d.to === a.id)}
                onHover={setHovered}
                onClick={() => onSelect(a.id === selected ? null : a.id)}
                getLayer={getLayer}
              />
            ))}
          </WeekGroup>
        ))}
      </div>

      {/* SVG dependency arrows overlay */}
      {depArrows.length > 0 && (
        <DependencyArrows
          arrows={depArrows}
          assignments={assignments}
          containerRef={containerRef}
          getBarStyle={getBarStyle}
        />
      )}
    </div>
  );
}

/* ── Column Headers ─────────────────────────────────────── */
function SpectrumHeader({ layers }) {
  return (
    <div className="flex border-b border-slate-200 pb-2 mb-1">
      {LAYER_ORDER.map((lid) => {
        const layer = layers.find((l) => l.id === lid);
        if (!layer) return null;
        return (
          <div key={lid} className="text-center" style={{ width: `${COL_WIDTH}%` }}>
            <div className="text-[0.72rem] font-bold" style={{ color: layer.color }}>
              {layer.name}
            </div>
            <div className="text-[0.58rem] text-slate-400 italic leading-tight mt-[1px]">
              {layer.question}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Week Group ─────────────────────────────────────────── */
function WeekGroup({ week, children }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span
          className="text-[0.66rem] font-bold px-2 py-[2px] rounded-full"
          style={{ backgroundColor: '#14b8a618', color: '#0f766e' }}
        >
          W{week.number}
        </span>
        <span className="text-[0.68rem] text-slate-500 font-medium">{week.title}</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="relative space-y-[5px] pl-1 pr-1">{children}</div>
    </div>
  );
}

/* ── Spectrum Bar ───────────────────────────────────────── */
function SpectrumBar({ assignment, style, isSelected, isHovered, isDimmed, isDepTarget, onHover, onClick, getLayer }) {
  const a = assignment;
  const ts = getTypeStyle(a.type);
  const reviewStatus = getReviewStatus(a);
  const isDemo = !a.primary_layer && !a.boundary_layer;
  const primaryLayer = a.primary_layer ? getLayer(a.primary_layer) : null;
  const active = isSelected || isHovered;

  return (
    <div
      className="relative"
      style={{ height: 34 }}
      onMouseEnter={() => onHover(a.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      data-assignment-id={a.id}
    >
      {/* Bar */}
      <div
        className="absolute top-0 rounded-md cursor-pointer flex items-center gap-1.5 px-2.5 transition-all duration-150"
        style={{
          ...style,
          height: '100%',
          backgroundColor: active ? ts.bg : (ts.bg + 'cc'),
          border: `1.5px ${reviewStatus === 'proposed' ? 'dashed' : 'solid'} ${active ? ts.text + '60' : ts.border}`,
          opacity: isDimmed ? 0.2 : (reviewStatus === 'proposed' ? 0.75 : 1),
          boxShadow: active ? `0 2px 8px ${ts.text}18` : 'none',
          zIndex: active ? 10 : 1,
        }}
      >
        {/* Primary layer dot */}
        {primaryLayer && (
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ backgroundColor: primaryLayer.color }}
          />
        )}
        {isDemo && (
          <span className="text-[0.65rem]" style={{ color: ts.text }}>★</span>
        )}

        {/* Name */}
        <span
          className="text-[0.7rem] font-semibold truncate"
          style={{
            color: ts.text,
            fontStyle: reviewStatus === 'proposed' ? 'italic' : 'normal',
          }}
        >
          {a.name}
        </span>

        {/* Type label */}
        <span
          className="text-[0.56rem] uppercase font-bold tracking-wider flex-shrink-0 opacity-60"
          style={{ color: ts.text }}
        >
          {ts.label}
        </span>

        {/* Review status indicator */}
        {reviewStatus === 'proposed' && (
          <span className="text-[0.5rem] flex-shrink-0">🟡</span>
        )}
        {reviewStatus === 'needs_review' && (
          <span className="text-[0.5rem] flex-shrink-0">⚠️</span>
        )}

        {/* Due date */}
        <span className="text-[0.56rem] text-slate-400 flex-shrink-0 ml-auto">{a.due}</span>
      </div>

      {/* Tooltip on hover */}
      {isHovered && (
        <BarTooltip assignment={a} barStyle={style} getLayer={getLayer} />
      )}
    </div>
  );
}

/* ── Tooltip ────────────────────────────────────────────── */
function BarTooltip({ assignment, barStyle, getLayer }) {
  const a = assignment;
  const ts = getTypeStyle(a.type);
  const pl = a.primary_layer ? getLayer(a.primary_layer) : null;
  const bl = a.boundary_layer ? getLayer(a.boundary_layer) : null;
  const layerText = pl ? `${pl.name}${bl ? ' → ' + bl.name : ''}` : 'Full spectrum';

  // Position tooltip above the bar, aligned to bar's left edge
  const leftPct = parseFloat(barStyle.left) || 0;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: '100%',
        left: `${Math.max(5, Math.min(leftPct, 65))}%`,
        marginBottom: 6,
      }}
    >
      <div
        className="rounded-lg px-3 py-2 shadow-lg text-left whitespace-nowrap"
        style={{ backgroundColor: '#0f172aee', minWidth: 180 }}
      >
        <div className="text-white text-[0.72rem] font-bold">{a.name}</div>
        <div className="text-slate-400 text-[0.62rem] mt-[2px]">
          {ts.label} · Week {a.week} · {a.due} · {a.time}
        </div>
        <div className="text-slate-400 text-[0.62rem] mt-[1px]">{layerText}</div>
        {(a.pathways || []).length > 0 && (
          <div className="text-slate-500 text-[0.56rem] mt-[2px]">
            Pathways: {(a.pathways || []).join(', ')}
          </div>
        )}
        {(a.requires || []).length > 0 && (
          <div className="text-slate-500 text-[0.56rem] mt-[1px]">
            Requires: {(a.requires || []).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SVG Dependency Arrows ──────────────────────────────── */
function DependencyArrows({ arrows, assignments, containerRef, getBarStyle }) {
  const container = containerRef.current;
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();

  // Find DOM elements for each assignment bar
  const getBarCenter = (id) => {
    const el = container.querySelector(`[data-assignment-id="${id}"]`);
    if (!el) return null;
    const bar = el.querySelector('.absolute');
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
    };
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <defs>
        <marker id="arrow-head" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M0,0 L6,2.5 L0,5 Z" fill="#475569" fillOpacity="0.6" />
        </marker>
      </defs>
      {arrows.map((arrow, i) => {
        const from = getBarCenter(arrow.from);
        const to = getBarCenter(arrow.to);
        if (!from || !to) return null;

        // Curve the line: go from bottom of "from" to top of "to"
        const x1 = from.x;
        const y1 = from.bottom;
        const x2 = to.x;
        const y2 = to.top;
        const midY = (y1 + y2) / 2;
        const cpOffset = Math.min(Math.abs(x2 - x1) * 0.3, 40);

        return (
          <path
            key={i}
            d={`M${x1},${y1} C${x1},${midY - cpOffset} ${x2},${midY + cpOffset} ${x2},${y2}`}
            fill="none"
            stroke="#475569"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="4,3"
            markerEnd="url(#arrow-head)"
          />
        );
      })}
    </svg>
  );
}

/* ── Topological Sort ───────────────────────────────────── */
function topoSort(weekAssignments, allAssignments) {
  const ids = new Set(weekAssignments.map((a) => a.id));
  const sorted = [];
  const visited = new Set();

  function visit(a) {
    if (visited.has(a.id)) return;
    visited.add(a.id);
    (a.requires || []).forEach((rid) => {
      if (ids.has(rid)) {
        const req = weekAssignments.find((x) => x.id === rid);
        if (req) visit(req);
      }
    });
    sorted.push(a);
  }

  weekAssignments.forEach((a) => visit(a));
  return sorted;
}
