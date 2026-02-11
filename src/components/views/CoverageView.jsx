import { useState } from 'react';
import { useCourseData } from '../../hooks/useCourseData';
import AssignmentCard from '../AssignmentCard';

export default function CoverageView({ onSelectAssignment, selected }) {
  const { data, getPathway, getLayer, assignmentLayers } = useCourseData();
  const layers = data.layers || [];
  const pathways = data.pathways || [];
  const assignments = data.assignments || [];

  const [matrixFilter, setMatrixFilter] = useState(null);

  const filtered = matrixFilter
    ? assignments.filter((a) => {
        const aLayers = assignmentLayers(a);
        return (
          (a.pathways || []).includes(matrixFilter.pathway) &&
          aLayers.includes(matrixFilter.layer)
        );
      })
    : null;

  return (
    <div>
      <p className="text-[0.78rem] text-slate-500 mb-3.5">
        Cells show assignments at each pathway × layer intersection.{' '}
        <strong>●</strong> = primary layer, <strong>○</strong> = boundary
        crossing. Click to filter.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full text-[0.78rem]">
          <thead>
            <tr>
              <th className="p-[6px_10px] text-left border-b-2 border-slate-200 text-slate-500 font-semibold text-[0.7rem]" />
              {layers.map((l) => (
                <th
                  key={l.id}
                  className="p-[6px_8px] text-center border-b-2 border-slate-200 font-bold text-[0.72rem]"
                  style={{ color: l.color }}
                >
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pathways.map((p) => (
              <tr key={p.id}>
                <td className="p-[6px_10px] font-semibold text-slate-700 border-b border-slate-50 text-[0.75rem]">
                  {p.abbr}
                </td>
                {layers.map((l) => {
                  const primary = assignments.filter(
                    (a) => (a.pathways || []).includes(p.id) && a.primary_layer === l.id
                  ).length;
                  const boundary = assignments.filter(
                    (a) => (a.pathways || []).includes(p.id) && a.boundary_layer === l.id
                  ).length;
                  const full = assignments.filter(
                    (a) => (a.pathways || []).includes(p.id) && !a.primary_layer
                  ).length;
                  const total = primary + boundary + full;
                  const isActive =
                    matrixFilter?.pathway === p.id && matrixFilter?.layer === l.id;

                  return (
                    <td
                      key={l.id}
                      onClick={() =>
                        setMatrixFilter(
                          total > 0 ? { pathway: p.id, layer: l.id } : null
                        )
                      }
                      className="p-[6px_8px] text-center border-b border-slate-50"
                      style={{
                        cursor: total > 0 ? 'pointer' : 'default',
                        backgroundColor: isActive ? '#14b8a612' : total > 0 ? l.color + '06' : 'transparent',
                        border: isActive ? '2px solid #14b8a6' : '2px solid transparent',
                      }}
                    >
                      {total > 0 ? (
                        <span style={{ color: l.color, fontWeight: 600 }}>
                          {'●'.repeat(primary + full)}
                          {'○'.repeat(boundary)}
                        </span>
                      ) : (
                        <span className="text-slate-200">&middot;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered && (
        <div className="mt-3.5">
          <div className="text-[0.72rem] font-bold text-slate-600 mb-1.5 uppercase">
            {getPathway(matrixFilter.pathway)?.abbr} ×{' '}
            {getLayer(matrixFilter.layer)?.name} ({filtered.length})
          </div>
          {filtered.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onClick={onSelectAssignment}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
