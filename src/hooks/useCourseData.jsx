import { createContext, useContext, useReducer, useEffect } from 'react';
import { parseYaml, serializeToYaml } from '../utils/yaml-io';

const CourseDataContext = createContext(null);

function courseReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...action.payload, _loaded: true };
    case 'LOAD_ERROR':
      return { _loaded: true, _error: action.error };
    default:
      return state;
  }
}

export function CourseDataProvider({ children }) {
  const [data, dispatch] = useReducer(courseReducer, { _loaded: false });

  useEffect(() => {
    fetch('./data/cst395-sprint1.yaml')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.text();
      })
      .then((text) => dispatch({ type: 'LOAD', payload: parseYaml(text) }))
      .catch((err) => dispatch({ type: 'LOAD_ERROR', error: err.message }));
  }, []);

  const value = {
    data,
    loaded: data._loaded,
    error: data._error,

    // Lookup helpers
    getLayer: (id) => (data.layers || []).find((l) => l.id === id),
    getPathway: (id) => (data.pathways || []).find((p) => p.id === id),
    getAssignment: (id) => (data.assignments || []).find((a) => a.id === id),
    getWeek: (num) => (data.weeks || []).find((w) => w.number === num),
    getCapability: (id) => (data.capabilities || []).find((c) => c.id === id),

    // Derived helpers
    assignmentLayers: (a) => {
      const set = new Set();
      if (a.primary_layer) set.add(a.primary_layer);
      if (a.boundary_layer) set.add(a.boundary_layer);
      if (!a.primary_layer && !a.boundary_layer) {
        (data.layers || []).forEach((l) => set.add(l.id));
      }
      return [...set];
    },

    exportYaml: () => {
      const { _loaded, _error, ...clean } = data;
      return serializeToYaml(clean);
    },
  };

  return (
    <CourseDataContext.Provider value={value}>
      {children}
    </CourseDataContext.Provider>
  );
}

export function useCourseData() {
  const ctx = useContext(CourseDataContext);
  if (!ctx) throw new Error('useCourseData must be used within CourseDataProvider');
  return ctx;
}
