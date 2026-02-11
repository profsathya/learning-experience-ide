import { useRef, useCallback, useEffect } from 'react';

/**
 * Force-directed graph physics simulation for the Mental Model view.
 * Manages node positions, velocity, collision, and attraction to targets.
 */
export function useGraphPhysics({ assignments, layers, dims }) {
  const nodesRef = useRef([]);

  // Compute zone geometry from layers and canvas dimensions
  const zones = useCallback(() => {
    const pad = 24;
    const gap = 2;
    const zoneW = (dims.w - pad * 2 - gap * (layers.length - 1)) / layers.length;
    return layers.map((l, i) => ({
      ...l,
      x: pad + i * (zoneW + gap),
      y: 44,
      w: zoneW,
      h: dims.h - 60,
      cx: pad + i * (zoneW + gap) + zoneW / 2,
    }));
  }, [layers, dims])();

  // Initialize or update node positions when assignments or dims change
  const initNodes = useCallback(() => {
    nodesRef.current = assignments.map((a) => {
      let cx;
      if (!a.primary_layer) {
        cx = dims.w / 2;
      } else {
        const pz = zones.find((z) => z.id === a.primary_layer);
        const bz = a.boundary_layer ? zones.find((z) => z.id === a.boundary_layer) : null;
        if (pz && bz) {
          cx = pz.cx * 0.7 + bz.cx * 0.3;
        } else if (pz) {
          cx = pz.cx;
        } else {
          cx = dims.w / 2;
        }
      }
      const weekY = 80 + ((a.week - 1) / 3) * (dims.h - 180);
      const weekAs = assignments.filter((x) => x.week === a.week);
      const idx = weekAs.indexOf(a);
      const jitter = (idx - (weekAs.length - 1) / 2) * 20;
      return {
        id: a.id,
        x: cx + jitter,
        y: weekY + (idx % 2) * 16 - 8,
        vx: 0,
        vy: 0,
        targetX: cx,
        targetY: weekY,
        radius: 19,
        data: a,
      };
    });
  }, [assignments, zones, dims]);

  useEffect(() => {
    initNodes();
  }, [initNodes]);

  // Step the physics simulation forward one tick
  function tick(dragId) {
    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      if (dragId === nodes[i].id) continue;
      // Repulsion between nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 60) {
          const f = (60 - dist) * 0.055;
          nodes[i].vx -= (dx / dist) * f;
          nodes[i].vy -= (dy / dist) * f;
          nodes[j].vx += (dx / dist) * f;
          nodes[j].vy += (dy / dist) * f;
        }
      }
      // Attract to target
      nodes[i].vx += (nodes[i].targetX - nodes[i].x) * 0.012;
      nodes[i].vy += (nodes[i].targetY - nodes[i].y) * 0.008;
      // Damping
      nodes[i].vx *= 0.76;
      nodes[i].vy *= 0.76;
      // Apply
      nodes[i].x += nodes[i].vx;
      nodes[i].y += nodes[i].vy;
      // Clamp
      nodes[i].x = Math.max(38, Math.min(dims.w - 38, nodes[i].x));
      nodes[i].y = Math.max(58, Math.min(dims.h - 28, nodes[i].y));
    }
  }

  function getNodeAt(mx, my) {
    for (const n of nodesRef.current) {
      const dx = n.x - mx;
      const dy = n.y - my;
      if (dx * dx + dy * dy < (n.radius + 5) * (n.radius + 5)) return n;
    }
    return null;
  }

  return { nodesRef, zones, tick, getNodeAt };
}
