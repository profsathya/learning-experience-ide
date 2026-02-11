import TypeBadge from './tags/TypeBadge';
import LayerBadge from './tags/LayerBadge';

export default function AssignmentCard({ assignment, onClick, selected, compact = false }) {
  const isSelected = selected === assignment.id;

  return (
    <div
      onClick={() => onClick(assignment.id)}
      className="rounded-lg cursor-pointer transition-all mb-[5px]"
      style={{
        padding: compact ? '7px 10px' : '10px 14px',
        border: isSelected ? '2px solid #14b8a6' : '1px solid #e2e8f0',
        backgroundColor: isSelected ? '#f0fdfa' : '#fff',
        boxShadow: isSelected ? '0 0 0 3px #14b8a618' : 'none',
      }}
    >
      <div className="flex justify-between items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-slate-800 mb-[3px]"
            style={{ fontSize: compact ? '0.78rem' : '0.82rem' }}
          >
            {assignment.name}
          </div>
          <div className="flex flex-wrap gap-[3px] items-center">
            <TypeBadge type={assignment.type} />
            {!compact && assignment.primary_layer && (
              <LayerBadge id={assignment.primary_layer} isPrimary />
            )}
            {!compact && assignment.boundary_layer && (
              <LayerBadge id={assignment.boundary_layer} />
            )}
            {!compact && !assignment.primary_layer && (
              <span className="text-[0.6rem] text-slate-400 font-semibold italic">
                Full spectrum
              </span>
            )}
          </div>
        </div>
        <div className="text-[0.68rem] text-slate-400 whitespace-nowrap">
          W{assignment.week}
        </div>
      </div>
    </div>
  );
}
