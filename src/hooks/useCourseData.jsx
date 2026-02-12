import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { parseYaml, serializeToYaml } from '../utils/yaml-io';
import { mergeProposed, mergeWeeks } from '../utils/import-merge';

const CourseDataContext = createContext(null);

function courseReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...action.payload, _loaded: true, _dirty: false };
    case 'LOAD_ERROR':
      return { _loaded: true, _error: action.error };

    case 'UPDATE_ASSIGNMENT': {
      const assignments = (state.assignments || []).map((a) => {
        if (a.id !== action.id) return a;
        const updated = { ...a, ...action.changes };
        // If an imported assignment is edited, mark it as hybrid
        if (a.source === 'imported' && a.review_status !== 'confirmed') {
          updated.source = 'hybrid';
        }
        return updated;
      });
      return { ...state, assignments, _dirty: true };
    }

    case 'ADD_ASSIGNMENT': {
      const assignment = {
        ...action.assignment,
        review_status: action.assignment.review_status || 'confirmed',
        source: action.assignment.source || 'manual',
      };
      const assignments = [...(state.assignments || []), assignment];
      return { ...state, assignments, _dirty: true };
    }

    case 'DELETE_ASSIGNMENT': {
      const assignments = (state.assignments || []).filter((a) => a.id !== action.id);
      // Also remove from requires of other assignments
      const cleaned = assignments.map((a) => ({
        ...a,
        requires: (a.requires || []).filter((r) => r !== action.id),
      }));
      return { ...state, assignments: cleaned, _dirty: true };
    }

    case 'DUPLICATE_ASSIGNMENT': {
      const orig = (state.assignments || []).find((a) => a.id === action.id);
      if (!orig) return state;
      const copy = {
        ...orig,
        id: orig.id + '-copy',
        name: orig.name + ' (copy)',
        requires: [...(orig.requires || [])],
        pathways: [...(orig.pathways || [])],
        criteria: (orig.criteria || []).map((c) => ({ ...c })),
        red_flags: [...(orig.red_flags || [])],
        growth: [...(orig.growth || [])],
        review_status: 'confirmed',
        source: 'manual',
      };
      const idx = (state.assignments || []).findIndex((a) => a.id === action.id);
      const assignments = [...(state.assignments || [])];
      assignments.splice(idx + 1, 0, copy);
      return { ...state, assignments, _dirty: true };
    }

    case 'IMPORT_PROPOSED': {
      const merged = mergeProposed(
        state.assignments || [],
        action.assignments
      );
      const weeks = mergeWeeks(state.weeks || [], action.weeks || []);
      return { ...state, assignments: merged, weeks, _dirty: true };
    }

    case 'CONFIRM_ASSIGNMENT': {
      const assignments = (state.assignments || []).map((a) =>
        a.id === action.id ? { ...a, review_status: 'confirmed' } : a
      );
      return { ...state, assignments, _dirty: true };
    }

    case 'REJECT_ASSIGNMENT': {
      const assignments = (state.assignments || []).filter((a) => a.id !== action.id);
      const cleaned = assignments.map((a) => ({
        ...a,
        requires: (a.requires || []).filter((r) => r !== action.id),
      }));
      return { ...state, assignments: cleaned, _dirty: true };
    }

    case 'SET_REVIEW_STATUS': {
      const assignments = (state.assignments || []).map((a) =>
        a.id === action.id ? { ...a, review_status: action.status } : a
      );
      return { ...state, assignments, _dirty: true };
    }

    case 'MARK_CLEAN':
      return { ...state, _dirty: false };

    default:
      return state;
  }
}

export function CourseDataProvider({ children }) {
  const [data, dispatch] = useReducer(courseReducer, { _loaded: false });
  const originalYamlRef = useRef(null);

  useEffect(() => {
    fetch('./data/cst395-sprint1.yaml')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.text();
      })
      .then((text) => {
        originalYamlRef.current = text;
        dispatch({ type: 'LOAD', payload: parseYaml(text) });
      })
      .catch((err) => dispatch({ type: 'LOAD_ERROR', error: err.message }));
  }, []);

  const value = {
    data,
    loaded: data._loaded,
    error: data._error,
    dirty: data._dirty || false,

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

    // Mutation actions
    updateAssignment: (id, changes) =>
      dispatch({ type: 'UPDATE_ASSIGNMENT', id, changes }),
    addAssignment: (assignment) =>
      dispatch({ type: 'ADD_ASSIGNMENT', assignment }),
    deleteAssignment: (id) =>
      dispatch({ type: 'DELETE_ASSIGNMENT', id }),
    duplicateAssignment: (id) =>
      dispatch({ type: 'DUPLICATE_ASSIGNMENT', id }),

    // Import actions
    importProposed: (assignments, weeks) =>
      dispatch({ type: 'IMPORT_PROPOSED', assignments, weeks }),
    confirmAssignment: (id) =>
      dispatch({ type: 'CONFIRM_ASSIGNMENT', id }),
    rejectAssignment: (id) =>
      dispatch({ type: 'REJECT_ASSIGNMENT', id }),
    setReviewStatus: (id, status) =>
      dispatch({ type: 'SET_REVIEW_STATUS', id, status }),

    // Export
    exportYaml: () => {
      const { _loaded, _error, _dirty, ...clean } = data;
      return serializeToYaml(clean);
    },
    downloadYaml: () => {
      const { _loaded, _error, _dirty, ...clean } = data;
      const yaml = serializeToYaml(clean);
      const blob = new Blob([yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clean.course?.id || 'course'}-data.yaml`;
      a.click();
      URL.revokeObjectURL(url);
      dispatch({ type: 'MARK_CLEAN' });
    },
    copyYaml: async () => {
      const { _loaded, _error, _dirty, ...clean } = data;
      const yaml = serializeToYaml(clean);
      await navigator.clipboard.writeText(yaml);
      dispatch({ type: 'MARK_CLEAN' });
    },

    // Revert to original
    revert: () => {
      if (originalYamlRef.current) {
        dispatch({ type: 'LOAD', payload: parseYaml(originalYamlRef.current) });
      }
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
