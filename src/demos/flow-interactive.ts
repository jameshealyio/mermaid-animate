import gsap from 'gsap';
import animate, { renderMermaid } from '../lib/index';
import { listFlowEdgesFromSvgRaw } from '../lib/selectors';
import { buildGraphFromEdges } from '../lib/traverse';
import { animateStrokeDraw, ensurePath } from '../lib/motion';

export async function createFlowInteractive(section: HTMLElement) {
  const code = `graph LR
  A[Request] --> B{Router}
  B -->|auth| C[Auth]
  B -->|cache| D[Cache]
  C --> E[Service]
  D --> E
  E --> F[DB]`;
  const container = ensureContainer(section);
  ensureScript(section, code);
  const { svg } = await renderMermaid(container, code);
  const raw = listFlowEdgesFromSvgRaw(svg);
  // Ensure every edge has a path element in DOM
  const edges = raw.map(e => ({ ...e, path: ensurePath(e.path) }));
  const graph = buildGraphFromEdges(edges);

  // Build a token set and annotate nodes for robust mapping
  const tokens = new Set<string>();
  edges.forEach(e => { tokens.add(e.from); tokens.add(e.to); });
  const nodes = Array.from(svg.querySelectorAll<SVGGElement>('g.node'));
  nodes.forEach(n => {
    const id = n.getAttribute('id') || '';
    const cls = n.getAttribute('class') || '';
    for (const t of tokens) {
      if (id.includes(t) || cls.includes(t)) { n.setAttribute('data-ma-key', t); break; }
    }
  });

  let current: gsap.GSAPTimeline | null = null;

  // Bind click directly to nodes to avoid foreignObject bubbling issues
  nodes.forEach(n => {
    (n as any).style.cursor = 'pointer';
    n.addEventListener('click', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const key = resolveNodeKey(n);
      if (!key) return;
      if (current) { try { current.kill(); } catch {} current = null; }
      current = runWaves(svg, key, edges);
    });
  });

  // Autoplay: pick first root, loop waves from it
  const roots = findRoots(edges);
  if (roots.length) {
    const start = roots[0];
    const run = () => {
      if (current) { try { current.kill(); } catch {} current = null; }
      current = runWaves(svg, start, edges);
      current?.eventCallback?.('onComplete', () => setTimeout(run, 1000));
    };
    run();
  }
}

function runWaves(svg: SVGSVGElement, startId: string, edges: Array<{ from: string; to: string; path: SVGPathElement }>) {
  // Simple waves: draw outgoing edges from start, then from neighbors, etc.
  const tl = gsap.timeline({ paused: true });
  const out = new Map<string, { from: string; to: string; path: SVGPathElement }[]>();
  edges.forEach(e => { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from)!.push(e); });
  const seen = new Set<string>([startId]);
  let frontier = [startId];
  const step = 0.8; const gap = 0.2;
  while (frontier.length) {
    const next: string[] = [];
    const waveEdges: SVGPathElement[] = [];
    for (const u of frontier) {
      const es = out.get(u) || [];
      for (const e of es) {
        waveEdges.push(e.path);
        if (!seen.has(e.to)) { seen.add(e.to); next.push(e.to); }
      }
    }
    if (waveEdges.length) {
      // draw concurrently this wave: add at same timeline position
      const pos = tl.duration();
      waveEdges.forEach(p => animateStrokeDraw(tl, p, { duration: step }, pos));
      tl.to({}, { duration: gap });
    }
    frontier = next;
  }
  tl.play(0);
  return tl;
}

function resolveNodeKey(n: SVGGElement): string | null {
  const t = n.getAttribute('data-ma-key');
  if (t) return t;
  const id = n.getAttribute('id') || '';
  const m = id.match(/^flowchart-([^\-]+)-/);
  if (m) return m[1];
  return null;
}

function findRoots(edges: Array<{ from: string; to: string }>): string[] {
  const hasIncoming = new Map<string, boolean>();
  edges.forEach(e => { hasIncoming.set(e.to, true); if (!hasIncoming.has(e.from)) hasIncoming.set(e.from, false); });
  return Array.from(hasIncoming).filter(([, v]) => !v).map(([k]) => k);
}

function ensureContainer(section: HTMLElement): HTMLElement {
  let el = section.querySelector<HTMLElement>('.diagram');
  if (!el) { el = document.createElement('div'); el.className = 'diagram'; section.appendChild(el); }
  return el;
}
function ensureScript(section: HTMLElement, code: string): HTMLScriptElement {
  let s = section.querySelector<HTMLScriptElement>('script[type="text/mermaid"]');
  if (!s) { s = document.createElement('script'); s.type = 'text/mermaid'; s.textContent = code; section.appendChild(s); }
  return s;
}
