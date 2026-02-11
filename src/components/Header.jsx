import { useCourseData } from '../hooks/useCourseData';

export default function Header() {
  const { data } = useCourseData();
  const course = data.course || {};
  const layers = data.layers || [];

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: course.theme_color || '#14b8a6' }}
        />
        <span className="text-[0.82rem] font-bold text-slate-900">
          {course.id}
        </span>
        <span className="text-[0.78rem] text-slate-500">{course.name}</span>
        <span className="text-[0.68rem] text-slate-400 ml-2">
          Sprint 1 &middot; Course Design IDE
        </span>
      </div>

      {/* Spectrum mini-legend */}
      <div className="flex gap-[1px] items-center">
        {layers.map((l, i) => (
          <span key={l.id} className="flex items-center">
            <span
              className="text-[0.6rem] font-semibold px-1"
              style={{ color: l.color }}
            >
              {l.name}
            </span>
            {i < layers.length - 1 && (
              <span className="text-slate-200 text-[0.7rem]">&rarr;</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
