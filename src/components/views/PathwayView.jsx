import { useCourseData } from '../../hooks/useCourseData';
import AssignmentCard from '../AssignmentCard';

export default function PathwayView({ pathwayId, onSelectAssignment, selected }) {
  const { data, getPathway, getCapability } = useCourseData();
  const pw = getPathway(pathwayId);
  const cap = getCapability(pathwayId);
  const assignments = (data.assignments || []).filter((a) =>
    (a.pathways || []).includes(pathwayId)
  );
  const weeks = data.weeks || [];

  if (!pw) return null;

  // Build weekly thread from week pathway data
  const weekProg = weeks
    .map((w) => {
      const wp = (w.pathways || []).find((p) => p.id === pathwayId);
      return wp ? { week: w.number, ...wp } : null;
    })
    .filter(Boolean);

  return (
    <div>
      <h3 className="m-0 mb-3.5 text-slate-900 text-base font-bold">{pw.name}</h3>

      {/* Sprint progression */}
      {cap && (
        <div className="mb-[18px]">
          <div className="text-[0.72rem] font-bold text-slate-600 mb-1.5 uppercase">
            Sprint Progression
          </div>
          <div className="flex gap-[3px]">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="flex-1 p-[8px_10px] rounded-lg"
                style={{
                  backgroundColor: s === 1 ? '#14b8a60c' : '#f8fafc',
                  border: `1px solid ${s === 1 ? '#14b8a630' : '#e2e8f0'}`,
                }}
              >
                <div className="text-[0.62rem] text-slate-400 font-bold">S{s}</div>
                <div
                  className="text-[0.72rem]"
                  style={{ color: s === 1 ? '#0f172a' : '#94a3b8' }}
                >
                  {cap.progression?.[s] || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly thread */}
      <div className="mb-[18px]">
        <div className="text-[0.72rem] font-bold text-slate-600 mb-1.5 uppercase">
          Weekly Thread
        </div>
        {weekProg.map((wp, i) => (
          <div key={wp.week} className="flex gap-2.5 mb-2.5">
            <div className="flex flex-col items-center" style={{ minWidth: 26 }}>
              <div className="w-[26px] h-[26px] rounded-full bg-teal-500 text-white flex items-center justify-center text-[0.72rem] font-bold">
                {wp.week}
              </div>
              {i < weekProg.length - 1 && (
                <div className="w-[2px] flex-1 mt-[3px]" style={{ backgroundColor: '#14b8a630' }} />
              )}
            </div>
            <div className="flex-1 pb-1.5">
              <div className="text-[0.78rem] font-semibold text-slate-900">
                {wp.this_week}
              </div>
              {wp.builds_on && (
                <div className="text-[0.7rem] text-slate-400 mt-[1px]">
                  &larr; {wp.builds_on}
                </div>
              )}
              {wp.builds_toward && (
                <div className="text-[0.7rem] mt-[1px]" style={{ color: '#14b8a6' }}>
                  &rarr; {wp.builds_toward}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Assignments */}
      <div>
        <div className="text-[0.72rem] font-bold text-slate-600 mb-1.5 uppercase">
          Assignments ({assignments.length})
        </div>
        {assignments.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            onClick={onSelectAssignment}
            selected={selected}
          />
        ))}
      </div>
    </div>
  );
}
