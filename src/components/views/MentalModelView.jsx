import { useCourseData } from '../../hooks/useCourseData';

export default function MentalModelView({ onSelect, selected, showPathways, showDeps, highlightWeek }) {
  const { data } = useCourseData();
  const layers = data.layers || [];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 text-5xl mb-4">&#9673;</div>
      <h3 className="text-slate-600 font-semibold mb-2">Mental Model Graph</h3>
      <p className="text-slate-400 text-sm max-w-md">
        Canvas-based force-directed graph with layer zone columns. Coming in Phase 3.
      </p>
      <div className="flex gap-1 mt-4">
        {layers.map((l) => (
          <div
            key={l.id}
            className="px-3 py-1 rounded text-xs font-semibold"
            style={{ backgroundColor: l.color + '15', color: l.color }}
          >
            {l.name}
          </div>
        ))}
      </div>
    </div>
  );
}
