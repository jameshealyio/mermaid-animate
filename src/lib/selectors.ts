/** Flow edge discovery using LS-/LE- classes (case-insensitive). */
export interface FlowEdgeRaw {
  from: string;
  to: string;
  path: SVGPathElement;
}

const token = (cls: string) => cls.trim();

export function listFlowEdgesFromSvgRaw(svg: SVGSVGElement): FlowEdgeRaw[] {
  const out: FlowEdgeRaw[] = [];
  // Preferred (v10/v11): <g class="edgePath LS-A LE-B"> <path class="path" ... /> </g>
  const groups = Array.from(svg.querySelectorAll('g.edgePath')) as SVGGElement[];
  groups.forEach(g => {
    const classes = (g.getAttribute('class') || '').split(/\s+/).map(token);
    const from = classes.find(c => /^LS-/i.test(c))?.slice(3) || '';
    const to = classes.find(c => /^LE-/i.test(c))?.slice(3) || '';
    const path = (g.querySelector('path') || g.querySelector('polyline') || g.querySelector('line')) as any;
    if (from && to && path) {
      out.push({ from, to, path: path as unknown as SVGPathElement });
    }
  });

  if (out.length) return out;

  // Fallback (flowchart-v2): paths live directly under g.edgePaths with ids like L_A_B_0
  const pathEls = Array.from(svg.querySelectorAll('g.edgePaths path')) as SVGPathElement[];
  pathEls.forEach(p => {
    const id = p.getAttribute('id') || '';
    const m = id.match(/^L_([^_]+)_([^_]+)_/);
    if (m) {
      const from = m[1];
      const to = m[2];
      out.push({ from, to, path: p });
    }
  });

  return out;
}

/** Sequence diagram connectors: any line/polyline/path with marker-start/end. */
export function selectSequenceConnectors(svg: SVGSVGElement): Element[] {
  const sel = 'path[marker-end], line[marker-end], polyline[marker-end], path[marker-start], line[marker-start], polyline[marker-start]';
  return Array.from(svg.querySelectorAll(sel));
}
