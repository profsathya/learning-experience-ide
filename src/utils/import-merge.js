/**
 * Merge proposed assignments from Claude analysis into existing course data.
 *
 * Rules:
 * - Never overwrite assignments with review_status: 'confirmed'
 * - Proposed assignments get review_status: 'proposed', source: 'imported'
 * - If an assignment with the same id exists and is 'proposed', replace it
 * - Weeks data is merged (proposed weeks don't overwrite confirmed ones)
 */

export function mergeProposed(existingAssignments, proposedAssignments, proposedWeeks) {
  const existing = [...existingAssignments];
  const existingById = new Map(existing.map((a) => [a.id, a]));

  const merged = [...existing];

  for (const proposed of proposedAssignments) {
    const enriched = {
      ...proposed,
      review_status: 'proposed',
      source: 'imported',
    };

    // Remove analysis_notes from the assignment data (keep it separate for UI)
    delete enriched.analysis_notes;

    const existingItem = existingById.get(proposed.id);

    if (!existingItem) {
      // New assignment — add it
      merged.push(enriched);
    } else if (existingItem.review_status === 'proposed') {
      // Replace existing proposed with new proposed
      const idx = merged.findIndex((a) => a.id === proposed.id);
      if (idx >= 0) merged[idx] = enriched;
    }
    // If confirmed — skip, don't overwrite
  }

  return merged;
}

/**
 * Merge proposed weeks into existing weeks.
 * Only adds new weeks; doesn't overwrite existing ones.
 */
export function mergeWeeks(existingWeeks, proposedWeeks) {
  if (!proposedWeeks || proposedWeeks.length === 0) return existingWeeks;

  const existing = [...existingWeeks];
  const existingNums = new Set(existing.map((w) => w.number));

  for (const week of proposedWeeks) {
    if (!existingNums.has(week.number)) {
      existing.push(week);
    }
  }

  return existing.sort((a, b) => a.number - b.number);
}

/**
 * Extract analysis notes from Claude's response to show alongside assignments.
 * Returns a Map of assignment id → analysis_notes string.
 */
export function extractAnalysisNotes(analysisAssignments) {
  const notes = new Map();
  for (const a of analysisAssignments || []) {
    if (a.analysis_notes) {
      notes.set(a.id, a.analysis_notes);
    }
  }
  return notes;
}
