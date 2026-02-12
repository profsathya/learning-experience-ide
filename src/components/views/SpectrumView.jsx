import { useCourseData } from '../../hooks/useCourseData';
import { getReviewStatus } from '../ReviewStatusBadge';

export default function SpectrumView({ onSelectAssignment, selected }) {
  const { data, getLayer } = useCourseData();
  const layers = data.layers || [];
  const assignments = data.assignments || [];

  return (
    <div>
      <p className="text-[0.78rem] text-slate-500 mb-3.5">
        How assignments walk the spectrum across weeks. Each row = one week.
        <strong> ●</strong> = primary layer, <strong>○</strong> = boundary
        crossing, <strong>★</strong> = full spectrum.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full text-[0.78rem]">
          <thead>
            <tr>
              <th className="p-[6px_8px] border-b-2 border-slate-200 w-10" />
              {layers.map((l) => (
                <th
                  key={l.id}
                  className="p-[6px_8px] text-center border-b-2 border-slate-200 font-bold text-[0.72rem]"
                  style={{ color: l.color, backgroundColor: l.color + '06' }}
                >
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((w) => {
              const weekAs = assignments.filter((a) => a.week === w);
              return (
                <tr key={w}>
                  <td className="p-2 font-bold text-[0.72rem] border-b border-slate-100 align-top" style={{ color: '#14b8a6' }}>
                    W{w}
                  </td>
                  {layers.map((l) => {
                    const primary = weekAs.filter((a) => a.primary_layer === l.id);
                    const boundary = weekAs.filter(
                      (a) => a.boundary_layer === l.id && a.primary_layer !== l.id
                    );
                    const full = l.position === 2 ? weekAs.filter((a) => !a.primary_layer) : [];

                    return (
                      <td
                        key={l.id}
                        className="p-1.5 border-b border-slate-100 align-top"
                        style={{ backgroundColor: l.color + '03' }}
                      >
                        {primary.map((a) => (
                          <CellItem
                            key={a.id}
                            a={a}
                            type="primary"
                            layerColor={l.color}
                            selected={selected}
                            onClick={onSelectAssignment}
                            getLayer={getLayer}
                          />
                        ))}
                        {boundary.map((a) => (
                          <CellItem
                            key={a.id}
                            a={a}
                            type="boundary"
                            layerColor={l.color}
                            selected={selected}
                            onClick={onSelectAssignment}
                            getLayer={getLayer}
                          />
                        ))}
                        {full.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => onSelectAssignment(a.id)}
                            className="p-[4px_6px] rounded mb-[3px] cursor-pointer text-[0.72rem] font-semibold"
                            style={{
                              color: '#92400e',
                              backgroundColor: selected === a.id ? '#14b8a610' : '#fef3c708',
                              border: selected === a.id ? '1px solid #14b8a6' : '1px solid #fcd34d30',
                            }}
                          >
                            ★ {a.name}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellItem({ a, type, layerColor, selected, onClick, getLayer }) {
  const isPrimary = type === 'primary';
  const truncName = a.name.length > 16 ? a.name.slice(0, 14) + '...' : a.name;
  const bl = a.boundary_layer ? getLayer(a.boundary_layer) : null;
  const status = getReviewStatus(a);
  const isProposed = status === 'proposed';

  return (
    <div
      onClick={() => onClick(a.id)}
      className="p-[4px_6px] rounded mb-[3px] cursor-pointer text-[0.72rem]"
      style={{
        fontWeight: isPrimary ? 600 : 400,
        color: isPrimary ? '#1e293b' : '#64748b',
        backgroundColor: selected === a.id ? '#14b8a610' : isPrimary ? layerColor + '0a' : 'transparent',
        border: selected === a.id
          ? '1px solid #14b8a6'
          : isProposed
            ? `1px dashed ${layerColor}30`
            : isPrimary
              ? `1px solid ${layerColor}15`
              : `1px dashed ${layerColor}20`,
        opacity: isProposed ? 0.7 : 1,
        fontStyle: isProposed ? 'italic' : 'normal',
      }}
    >
      <span className="text-[0.6rem]" style={{ color: layerColor }}>
        {isPrimary ? '● ' : '○ '}
      </span>
      {truncName}
      {isPrimary && bl && (
        <span className="text-[0.6rem]" style={{ color: bl.color }}>
          {' '}&rarr;{bl.name.slice(0, 4)}
        </span>
      )}
      {isProposed && (
        <span className="text-[0.52rem] ml-0.5" style={{ color: '#d97706' }}>
          {'\uD83D\uDFE1'}
        </span>
      )}
    </div>
  );
}
