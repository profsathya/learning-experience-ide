import { useCourseData } from '../../hooks/useCourseData';
import AssignmentCard from '../AssignmentCard';

export default function TimelineView({ onSelectAssignment, selected }) {
  const { data } = useCourseData();
  const weeks = data.weeks || [];
  const assignments = data.assignments || [];

  return (
    <div>
      {weeks.map((w) => (
        <div key={w.number} className="mb-[22px]">
          {/* Week header */}
          <div className="flex items-baseline gap-2 mb-1.5">
            <div
              className="text-[0.68rem] font-bold px-2 py-[2px] rounded"
              style={{ color: '#14b8a6', backgroundColor: '#14b8a60c' }}
            >
              W{w.number}
            </div>
            <h4 className="m-0 text-[0.88rem] text-slate-900">{w.title}</h4>
            <span className="text-[0.66rem] text-slate-400 italic">
              {w.spectrum_focus}
            </span>
          </div>

          {/* Hook */}
          <div
            className="text-[0.78rem] text-slate-500 italic mb-1.5 pl-2"
            style={{ borderLeft: '2px solid #e2e8f0' }}
          >
            {w.hook}
          </div>

          {/* Assignments */}
          {assignments
            .filter((a) => a.week === w.number)
            .map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onClick={onSelectAssignment}
                selected={selected}
              />
            ))}

          {/* Misconceptions */}
          {(w.misconceptions || []).length > 0 && (
            <div
              className="p-[6px_10px] bg-red-50 rounded-md mt-1.5"
              style={{ borderLeft: '3px solid #ef4444' }}
            >
              <div className="text-[0.62rem] font-bold text-red-600 mb-[3px] uppercase">
                Misconceptions
              </div>
              {w.misconceptions.map((m, i) => (
                <div key={i} className="text-[0.75rem] text-slate-500 mb-[2px]">
                  <span className="text-red-500">&#10007;</span> {m.belief}{' '}
                  &rarr;{' '}
                  <span className="text-green-600">{m.reality}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
