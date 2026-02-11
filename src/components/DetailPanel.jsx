import { useCourseData } from '../hooks/useCourseData';
import TypeBadge from './tags/TypeBadge';
import LayerBadge from './tags/LayerBadge';
import PathwayBadge from './tags/PathwayBadge';

export default function DetailPanel({ assignmentId, onClose }) {
  const { getAssignment, getLayer, data } = useCourseData();
  const a = getAssignment(assignmentId);
  if (!a) return null;

  const assignments = data.assignments || [];
  const deps = (a.requires || []).map((r) => assignments.find((x) => x.id === r)).filter(Boolean);
  const dependents = assignments.filter((x) => (x.requires || []).includes(a.id));
  const isFullSpectrum = !a.primary_layer && !a.boundary_layer;
  const layers = data.layers || [];

  return (
    <div className="sticky top-4 self-start">
      <div className="flex justify-end mb-1.5">
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-sm text-slate-400 hover:text-slate-600"
        >
          &#10005;
        </button>
      </div>
      <div className="p-[18px] bg-white rounded-xl border border-slate-200 text-[0.8rem]">
        {/* Header */}
        <div className="flex justify-between mb-3.5">
          <div>
            <h3 className="m-0 text-base font-bold text-slate-900">{a.name}</h3>
            <div className="text-slate-500 mt-[3px] text-xs">
              Week {a.week} &middot; {a.due} &middot; {a.time}
            </div>
          </div>
          <TypeBadge type={a.type} />
        </div>

        {/* Spectrum Position */}
        <div className="mb-3.5">
          <div className="text-[0.66rem] text-slate-400 font-semibold mb-1 uppercase">
            Spectrum Position
          </div>
          {isFullSpectrum ? (
            <div className="flex gap-[3px] flex-wrap">
              {layers.map((l) => (
                <LayerBadge key={l.id} id={l.id} isPrimary size="md" />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {a.primary_layer && (
                <LayerBadge id={a.primary_layer} isPrimary size="md" />
              )}
              {a.boundary_layer && (
                <>
                  <span className="text-slate-400 text-[0.7rem]">&rarr;</span>
                  <LayerBadge id={a.boundary_layer} size="md" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Science Question */}
        <div className="mb-3.5 p-2 bg-sky-50 rounded-md" style={{ borderLeft: '3px solid #3b82f6' }}>
          <div className="text-[0.64rem] text-blue-500 font-bold mb-[2px] uppercase">
            Science (epistemic quality)
          </div>
          <div className="text-[0.78rem] text-slate-800">{a.science_q}</div>
        </div>

        {/* Pathways */}
        <div className="mb-3.5">
          <div className="text-[0.66rem] text-slate-400 font-semibold mb-[3px] uppercase">
            Pathways
          </div>
          <div className="flex gap-[3px] flex-wrap">
            {(a.pathways || []).map((p) => (
              <PathwayBadge key={p} id={p} size="md" />
            ))}
          </div>
        </div>

        {/* Dependencies */}
        {deps.length > 0 && (
          <div className="mb-2 text-xs">
            <span className="text-slate-400 font-semibold">REQUIRES: </span>
            <span className="text-slate-600">
              {deps.map((d) => d.name).join(' → ')}
            </span>
          </div>
        )}
        {dependents.length > 0 && (
          <div className="mb-3.5 text-xs">
            <span className="text-slate-400 font-semibold">FEEDS INTO: </span>
            <span className="text-slate-600">
              {dependents.map((d) => d.name).join(', ')}
            </span>
          </div>
        )}

        {/* Quality Criteria */}
        <div className="mb-3.5">
          <div className="text-[0.72rem] font-bold text-slate-900 mb-1.5">
            Quality Criteria
          </div>
          {(a.criteria || []).map((c, i) => {
            const layer = getLayer(c.layer);
            return (
              <div
                key={i}
                className="p-[6px_10px] bg-slate-50 rounded-md mb-[3px]"
                style={{ borderLeft: `3px solid ${layer?.color || '#94a3b8'}` }}
              >
                <div className="text-[0.77rem] text-slate-800">{c.text}</div>
                {layer && (
                  <span
                    className="text-[0.6rem] font-semibold"
                    style={{ color: layer.color }}
                  >
                    {layer.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Red Flags & Growth */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[0.66rem] font-bold text-red-600 mb-1">
              RED FLAGS
            </div>
            {(a.red_flags || []).map((r, i) => (
              <div key={i} className="text-[0.73rem] text-slate-500 py-[2px]">
                &#9888; {r}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[0.66rem] font-bold text-green-600 mb-1">
              GROWTH
            </div>
            {(a.growth || []).map((g, i) => (
              <div key={i} className="text-[0.73rem] text-slate-500 py-[2px]">
                &#10022; {g}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
