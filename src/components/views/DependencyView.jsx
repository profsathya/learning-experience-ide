import { useCourseData } from '../../hooks/useCourseData';
import AssignmentCard from '../AssignmentCard';

export default function DependencyView({ onSelectAssignment, selected }) {
  const { data } = useCourseData();
  const assignments = data.assignments || [];

  // Topological sort
  const ordered = [];
  const visited = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    const a = assignments.find((x) => x.id === id);
    if (!a) return;
    (a.requires || []).forEach((r) => visit(r));
    visited.add(id);
    ordered.push(a);
  }

  assignments.forEach((a) => visit(a.id));

  return (
    <div>
      <p className="text-[0.78rem] text-slate-500 mb-3.5">
        Topological dependency order. Each assignment appears after its
        prerequisites.
      </p>
      {ordered.map((a, i) => (
        <div key={a.id} className="flex gap-2.5 mb-[3px]">
          <div className="flex flex-col items-center" style={{ minWidth: 18 }}>
            <div
              className="w-[9px] h-[9px] rounded-full mt-[10px]"
              style={{
                backgroundColor: selected === a.id ? '#14b8a6' : '#cbd5e1',
              }}
            />
            {i < ordered.length - 1 && (
              <div className="w-[2px] flex-1 bg-slate-200" />
            )}
          </div>
          <div className="flex-1">
            <AssignmentCard
              assignment={a}
              onClick={onSelectAssignment}
              selected={selected}
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}
