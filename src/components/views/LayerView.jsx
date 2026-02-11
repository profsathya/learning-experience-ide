import { useCourseData } from '../../hooks/useCourseData';
import AssignmentCard from '../AssignmentCard';

export default function LayerView({ layerId, onSelectAssignment, selected }) {
  const { data, getLayer } = useCourseData();
  const layer = getLayer(layerId);
  const assignments = data.assignments || [];
  const weeks = data.weeks || [];

  if (!layer) return null;

  const primary = assignments.filter((a) => a.primary_layer === layerId);
  const boundary = assignments.filter((a) => a.boundary_layer === layerId);
  const full = assignments.filter((a) => !a.primary_layer);

  // Group by week (deduplicated)
  const weekGroups = {};
  [...primary, ...boundary, ...full].forEach((a) => {
    if (!weekGroups[a.week]) weekGroups[a.week] = [];
    if (!weekGroups[a.week].find((x) => x.id === a.id)) {
      weekGroups[a.week].push(a);
    }
  });

  return (
    <div>
      {/* Layer header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: layer.color + '15' }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: layer.color }}
          />
        </div>
        <div>
          <h3 className="m-0 text-base font-bold text-slate-900">{layer.name}</h3>
          <p className="m-0 text-[0.8rem] text-slate-500 italic">{layer.question}</p>
        </div>
      </div>

      {/* Science lens */}
      <div
        className="p-2 bg-sky-50 rounded-md mb-3.5 text-[0.75rem] text-slate-800"
        style={{ borderLeft: '3px solid #3b82f6' }}
      >
        <span className="text-[0.64rem] text-blue-500 font-bold">SCIENCE LENS: </span>
        {layer.science}
      </div>

      {/* Counts */}
      <div className="flex gap-3 mb-4 text-[0.75rem] text-slate-600">
        <span>
          <strong style={{ color: layer.color }}>{primary.length}</strong> primary
        </span>
        <span>
          <strong style={{ color: layer.color + '88' }}>{boundary.length}</strong>{' '}
          boundary
        </span>
        <span>
          <strong className="text-slate-400">{full.length}</strong> full spectrum
        </span>
      </div>

      {/* Week sparkline */}
      <div className="flex gap-1.5 mb-[18px]">
        {[1, 2, 3, 4].map((w) => {
          const count = weekGroups[w]?.length || 0;
          const hasPrimary = weekGroups[w]?.some((a) => a.primary_layer === layerId);
          return (
            <div
              key={w}
              className="flex-1 text-center rounded-lg"
              style={{
                padding: '10px 6px',
                backgroundColor: count > 0 ? layer.color + (hasPrimary ? '12' : '06') : '#f8fafc',
                border: `1px solid ${count > 0 ? layer.color + '25' : '#e2e8f0'}`,
              }}
            >
              <div className="text-[0.68rem] text-slate-400 font-semibold">W{w}</div>
              <div
                className="text-lg font-bold"
                style={{ color: count > 0 ? layer.color : '#e2e8f0' }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignments by week */}
      {[1, 2, 3, 4].map((w) =>
        weekGroups[w] ? (
          <div key={w} className="mb-2.5">
            <div className="text-[0.68rem] text-slate-400 font-semibold mb-[3px]">
              Week {w}: {weeks.find((wk) => wk.number === w)?.title}
            </div>
            {weekGroups[w].map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onClick={onSelectAssignment}
                selected={selected}
                compact
              />
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
