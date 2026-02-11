import { useRef, useState, useEffect, useCallback } from 'react';
import { useCourseData } from '../../hooks/useCourseData';
import { useGraphPhysics } from '../../hooks/useGraphPhysics';
import { getTypeStyle } from '../tags/TypeBadge';

export default function MentalModelView({ onSelect, selected, showPathways, showDeps, highlightWeek }) {
  const { data, getLayer, getPathway } = useCourseData();
  const layers = data.layers || [];
  const assignments = data.assignments || [];
  const pathways = data.pathways || [];

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dragRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [dims, setDims] = useState({ w: 800, h: 530 });

  // Measure container on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = canvas.parentElement;
    if (p) setDims({ w: Math.max(580, p.clientWidth - 4), h: 530 });
  }, []);

  const { nodesRef, zones, tick, getNodeAt } = useGraphPhysics({
    assignments,
    layers,
    dims,
  });

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || assignments.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    canvas.style.width = dims.w + 'px';
    canvas.style.height = dims.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let running = true;
    const nodes = nodesRef.current;

    function frame() {
      if (!running) return;

      tick(dragRef.current?.id);
      ctx.clearRect(0, 0, dims.w, dims.h);

      // Zone backgrounds
      zones.forEach((z) => {
        const hasAssignments = assignments.some(
          (a) => a.primary_layer === z.id || a.boundary_layer === z.id || (!a.primary_layer && !a.boundary_layer)
        );
        ctx.fillStyle = z.color + '06';
        ctx.beginPath();
        ctx.roundRect(z.x, z.y, z.w, z.h, 6);
        ctx.fill();
        ctx.strokeStyle = z.color + '15';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(z.x, z.y, z.w, z.h, 6);
        ctx.stroke();
        ctx.fillStyle = z.color + (hasAssignments ? 'bb' : '50');
        ctx.font = 'bold 10.5px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(z.name, z.cx, z.y + 16);
        ctx.font = 'italic 8px system-ui';
        ctx.fillStyle = z.color + '60';
        ctx.fillText(z.question, z.cx, z.y + 28);
        if (!hasAssignments) {
          ctx.fillStyle = z.color + '25';
          ctx.font = 'italic 9px system-ui';
          ctx.fillText('(no assignments)', z.cx, z.y + z.h / 2);
        }
      });

      // Week guides
      for (let w = 1; w <= 4; w++) {
        const y = 80 + ((w - 1) / 3) * (dims.h - 180);
        const hi = highlightWeek === w;
        ctx.fillStyle = hi ? '#14b8a6' : '#cbd5e1';
        ctx.font = `${hi ? 'bold' : 'normal'} 8.5px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText(`W${w}`, 5, y + 3);
        ctx.strokeStyle = hi ? '#14b8a618' : '#0000';
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.moveTo(22, y);
        ctx.lineTo(dims.w - 8, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Dependency edges
      if (showDeps) {
        assignments.forEach((a) =>
          (a.requires || []).forEach((rid) => {
            const from = nodes.find((n) => n.id === rid);
            const to = nodes.find((n) => n.id === a.id);
            if (!from || !to) return;
            const isHi = hovered && (from.id === hovered || to.id === hovered);
            const isSel = selected && (from.id === selected || to.id === selected);
            const active = isHi || isSel;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2 - 12;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(mx, my, to.x, to.y);
            ctx.strokeStyle = active ? '#475569aa' : '#94a3b825';
            ctx.lineWidth = active ? 2 : 1;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            const angle = Math.atan2(to.y - my, to.x - mx);
            const ax = to.x - Math.cos(angle) * 21;
            const ay = to.y - Math.sin(angle) * 21;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - Math.cos(angle - 0.35) * 7, ay - Math.sin(angle - 0.35) * 7);
            ctx.lineTo(ax - Math.cos(angle + 0.35) * 7, ay - Math.sin(angle + 0.35) * 7);
            ctx.closePath();
            ctx.fillStyle = active ? '#475569aa' : '#94a3b825';
            ctx.fill();
          })
        );
      }

      // Pathway threads
      if (showPathways) {
        pathways.forEach((pw) => {
          const tagged = assignments
            .filter((a) => (a.pathways || []).includes(pw.id))
            .sort((a, b) => a.week - b.week);
          for (let i = 0; i < tagged.length - 1; i++) {
            const n1 = nodes.find((n) => n.id === tagged[i].id);
            const n2 = nodes.find((n) => n.id === tagged[i + 1].id);
            if (!n1 || !n2) continue;
            const active =
              (hovered && (n1.id === hovered || n2.id === hovered)) ||
              (selected && (n1.id === selected || n2.id === selected));
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = active ? pw.color + '99' : pw.color + '18';
            ctx.lineWidth = active ? 2.5 : 1;
            ctx.stroke();
          }
        });
      }

      // Boundary reach lines
      nodes.forEach((n) => {
        const a = n.data;
        if (!a.boundary_layer || !a.primary_layer) return;
        const bz = zones.find((z) => z.id === a.boundary_layer);
        if (!bz) return;
        if (n.x >= bz.x && n.x <= bz.x + bz.w) return;
        const active = hovered === n.id || selected === n.id;
        const edgeX = n.x < bz.cx ? bz.x + bz.w : bz.x;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(edgeX, n.y);
        ctx.strokeStyle = bz.color + (active ? '50' : '12');
        ctx.lineWidth = active ? 1.5 : 0.7;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(edgeX, n.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = bz.color + (active ? '60' : '20');
        ctx.fill();
      });

      // Nodes
      nodes.forEach((n) => {
        const a = n.data;
        const isH = n.id === hovered;
        const isS = n.id === selected;
        const conn =
          hovered &&
          ((a.requires || []).includes(hovered) ||
            assignments.find((x) => x.id === hovered)?.requires?.includes(n.id));
        const dim =
          (hovered && !isH && !conn) || (highlightWeek && a.week !== highlightWeek);
        const st = getTypeStyle(a.type);

        ctx.save();
        if (dim) ctx.globalAlpha = 0.18;
        if (isH || isS) {
          ctx.shadowColor = st.text + '25';
          ctx.shadowBlur = 14;
        }

        if (a.primary_layer && (isH || isS)) {
          const pl = getLayer(a.primary_layer);
          if (pl) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = pl.color + '35';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isH || isS ? '#fff' : st.bg;
        ctx.fill();
        ctx.strokeStyle = isH || isS ? st.text : st.border;
        ctx.lineWidth = isH || isS ? 2.5 : 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = st.text;
        ctx.font = 'bold 8.5px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.primary_layer ? `W${a.week}` : '\u2605', n.x, n.y - 3);
        ctx.font = '600 6px system-ui';
        ctx.fillStyle = st.text + '88';
        ctx.fillText(st.label.toUpperCase(), n.x, n.y + 7);

        const label = a.name.length > 18 ? a.name.slice(0, 16) + '\u2026' : a.name;
        ctx.fillStyle = isH || isS ? '#0f172a' : '#94a3b8';
        ctx.font = `${isH || isS ? '600' : 'normal'} 8px system-ui`;
        ctx.textBaseline = 'top';
        ctx.fillText(label, n.x, n.y + n.radius + 3);

        if (isH || isS) {
          (a.pathways || []).forEach((pid, pi) => {
            const pw = getPathway(pid);
            if (!pw) return;
            const bx = n.x + (pi - ((a.pathways || []).length - 1) / 2) * 16;
            const by = n.y - n.radius - 11;
            ctx.beginPath();
            ctx.arc(bx, by, 6, 0, Math.PI * 2);
            ctx.fillStyle = pw.color + '25';
            ctx.fill();
            ctx.strokeStyle = pw.color + '50';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = pw.color;
            ctx.font = 'bold 5px system-ui';
            ctx.textBaseline = 'middle';
            ctx.fillText(pw.abbr, bx, by);
          });
        }

        ctx.restore();
      });

      // Tooltip
      if (hovered) {
        const node = nodes.find((n) => n.id === hovered);
        if (node) {
          const a = node.data;
          const pl = a.primary_layer ? getLayer(a.primary_layer) : null;
          const bl = a.boundary_layer ? getLayer(a.boundary_layer) : null;
          const lines = [
            a.name,
            `${getTypeStyle(a.type).label} \u00b7 Week ${a.week} \u00b7 ${a.due}`,
            a.primary_layer ? `${pl?.name}${bl ? ' \u2192 ' + bl?.name : ''}` : 'Full spectrum',
          ];
          ctx.font = '10.5px system-ui';
          const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
          const tw = maxW + 20;
          const th = lines.length * 15 + 10;
          const tx = Math.max(4, Math.min(node.x - tw / 2, dims.w - tw - 4));
          const ty = Math.max(4, node.y - node.radius - th - 16);
          ctx.fillStyle = '#0f172aee';
          ctx.beginPath();
          ctx.roundRect(tx, ty, tw, th, 5);
          ctx.fill();
          lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? '#fff' : '#94a3b8';
            ctx.font = i === 0 ? 'bold 10.5px system-ui' : '9.5px system-ui';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(line, tx + 10, ty + 5 + i * 15);
          });
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    frame();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [dims, hovered, selected, showPathways, showDeps, highlightWeek, zones, assignments, pathways, nodesRef, tick, getLayer, getPathway]);

  // Mouse handlers
  const getNodeAtEvent = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      return getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    },
    [getNodeAt]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (dragRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const node = nodesRef.current.find((n) => n.id === dragRef.current.id);
        if (node) {
          node.x = e.clientX - rect.left;
          node.y = e.clientY - rect.top;
          node.vx = 0;
          node.vy = 0;
        }
        return;
      }
      const n = getNodeAtEvent(e);
      setHovered(n?.id || null);
      canvasRef.current.style.cursor = n ? 'grab' : 'default';
    },
    [getNodeAtEvent, nodesRef]
  );

  const handleMouseDown = useCallback(
    (e) => {
      const n = getNodeAtEvent(e);
      if (n) {
        dragRef.current = { id: n.id };
        canvasRef.current.style.cursor = 'grabbing';
      }
    },
    [getNodeAtEvent]
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      canvasRef.current.style.cursor = 'grab';
      dragRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (dragRef.current) return;
      const n = getNodeAtEvent(e);
      if (n) onSelect(n.id === selected ? null : n.id);
    },
    [getNodeAtEvent, onSelect, selected]
  );

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setHovered(null); dragRef.current = null; }}
      onClick={handleClick}
      className="rounded-lg block w-full"
      style={{ border: '1px solid #e2e8f0', backgroundColor: '#fcfcfd' }}
    />
  );
}
