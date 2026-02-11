const VIEWS = [
  { id: 'graph',    label: 'Mental Model', icon: '◉' },
  { id: 'spectrum', label: 'Spectrum',     icon: '⟷' },
  { id: 'matrix',   label: 'Coverage',    icon: '▦' },
  { id: 'layers',   label: 'By Layer',    icon: '◎' },
  { id: 'pathways', label: 'By Pathway',  icon: '⟿' },
  { id: 'timeline', label: 'Timeline',    icon: '↓' },
  { id: 'deps',     label: 'Dependencies', icon: '⟶' },
  { id: 'data',     label: 'Data Table',   icon: '☰' },
];

export { VIEWS };

export default function TabBar({ activeView, onChangeView }) {
  return (
    <div className="bg-white border-b border-slate-200 px-5 flex gap-0 overflow-x-auto">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChangeView(v.id)}
          className="py-[9px] px-3.5 border-none bg-transparent cursor-pointer text-[0.78rem] whitespace-nowrap"
          style={{
            fontWeight: activeView === v.id ? 700 : 500,
            color: activeView === v.id ? '#14b8a6' : '#64748b',
            borderBottom: activeView === v.id ? '2px solid #14b8a6' : '2px solid transparent',
          }}
        >
          {v.icon} {v.label}
        </button>
      ))}
    </div>
  );
}
