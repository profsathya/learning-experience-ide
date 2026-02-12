import { useState } from 'react';
import { useCourseData } from '../hooks/useCourseData';
import { EDIT_MODE } from '../config';
import Header from './Header';
import TabBar from './TabBar';
import DetailPanel from './DetailPanel';
import ImportDialog from './ImportDialog';
import MentalModelView from './views/MentalModelView';
import SpectrumView from './views/SpectrumView';
import CoverageView from './views/CoverageView';
import LayerView from './views/LayerView';
import PathwayView from './views/PathwayView';
import TimelineView from './views/TimelineView';
import DependencyView from './views/DependencyView';
import DataTableView from './views/DataTableView';

export default function App() {
  const { loaded, error, data } = useCourseData();

  const [view, setView] = useState('spectrum');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState('psychology');
  const [selectedPathway, setSelectedPathway] = useState('sdl');
  const [showImport, setShowImport] = useState(false);

  // Graph controls (Phase 3)
  const [showPathways, setShowPathways] = useState(false);
  const [showDeps, setShowDeps] = useState(true);
  const [highlightWeek, setHighlightWeek] = useState(null);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading course data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  const layers = data.layers || [];
  const pathways = data.pathways || [];

  function handleChangeView(v) {
    setView(v);
    setSelectedAssignment(null);
  }

  function handleSelectAssignment(id) {
    setSelectedAssignment(id === selectedAssignment ? null : id);
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Header onOpenImport={() => setShowImport(true)} />
      <TabBar activeView={view} onChangeView={handleChangeView} />

      {/* Graph controls bar */}
      {view === 'graph' && (
        <div className="bg-white border-b border-slate-200 py-1.5 px-5 flex gap-3.5 items-center flex-wrap">
          <div className="flex gap-[5px] items-center">
            <span className="text-[0.68rem] text-slate-400 font-semibold">SHOW:</span>
            <ToggleButton active={showDeps} onClick={() => setShowDeps(!showDeps)}>
              Dependencies
            </ToggleButton>
            <ToggleButton active={showPathways} onClick={() => setShowPathways(!showPathways)} activeColor="#0ea5e9">
              Pathways
            </ToggleButton>
          </div>
          <div className="w-px h-[18px] bg-slate-200" />
          <div className="flex gap-[3px] items-center">
            <span className="text-[0.68rem] text-slate-400 font-semibold">WEEK:</span>
            {[null, 1, 2, 3, 4].map((w) => (
              <button
                key={w ?? 'all'}
                onClick={() => setHighlightWeek(w)}
                className="py-[3px] px-2 rounded-full border-none cursor-pointer text-[0.7rem] font-semibold"
                style={{
                  backgroundColor: highlightWeek === w ? '#14b8a618' : '#f1f5f9',
                  color: highlightWeek === w ? '#0f766e' : '#94a3b8',
                }}
              >
                {w ?? 'All'}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[0.66rem] text-slate-400">
            Drag &middot; Hover &middot; Click
          </div>
        </div>
      )}

      {/* Layer sub-selector */}
      {view === 'layers' && (
        <div className="bg-white border-b border-slate-200 py-1.5 px-5 flex gap-[5px]">
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => { setSelectedLayer(l.id); setSelectedAssignment(null); }}
              className="py-[3px] px-3 rounded-full border-none cursor-pointer text-[0.72rem] font-semibold"
              style={{
                backgroundColor: selectedLayer === l.id ? l.color + '18' : '#f1f5f9',
                color: selectedLayer === l.id ? l.color : '#64748b',
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* Pathway sub-selector */}
      {view === 'pathways' && (
        <div className="bg-white border-b border-slate-200 py-1.5 px-5 flex gap-[5px]">
          {pathways.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPathway(p.id); setSelectedAssignment(null); }}
              className="py-[3px] px-3 rounded-full border-none cursor-pointer text-[0.72rem] font-semibold"
              style={{
                backgroundColor: selectedPathway === p.id ? '#14b8a618' : '#f1f5f9',
                color: selectedPathway === p.id ? '#14b8a6' : '#64748b',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div
        className="gap-4 p-4 max-w-[1400px] mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: selectedAssignment ? '1fr 360px' : '1fr',
        }}
      >
        {/* Main view panel */}
        <div
          className="bg-white rounded-xl border border-slate-200 min-w-0"
          style={{ padding: view === 'graph' ? 10 : 18 }}
        >
          {view === 'graph' && (
            <MentalModelView
              onSelect={handleSelectAssignment}
              selected={selectedAssignment}
              showPathways={showPathways}
              showDeps={showDeps}
              highlightWeek={highlightWeek}
            />
          )}
          {view === 'spectrum' && (
            <SpectrumView
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'matrix' && (
            <CoverageView
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'layers' && (
            <LayerView
              layerId={selectedLayer}
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'pathways' && (
            <PathwayView
              pathwayId={selectedPathway}
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'timeline' && (
            <TimelineView
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'deps' && (
            <DependencyView
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
          {view === 'data' && (
            <DataTableView
              onSelectAssignment={handleSelectAssignment}
              selected={selectedAssignment}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedAssignment && (
          <DetailPanel
            assignmentId={selectedAssignment}
            onClose={() => setSelectedAssignment(null)}
          />
        )}
      </div>
      {/* Import Dialog */}
      {EDIT_MODE && showImport && (
        <ImportDialog onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}

function ToggleButton({ active, onClick, activeColor = '#475569', children }) {
  return (
    <button
      onClick={onClick}
      className="py-[3px] px-2.5 rounded-full border-none cursor-pointer text-[0.7rem] font-semibold"
      style={{
        backgroundColor: active ? (activeColor + '18') : '#f1f5f9',
        color: active ? activeColor : '#94a3b8',
      }}
    >
      {children}
    </button>
  );
}
