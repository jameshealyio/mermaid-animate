import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import { renderMermaid } from '../lib/mermaid';
import { listFlowEdgesFromSvgRaw } from '../lib/selectors';
import { createTracerDot, ensurePath } from '../lib/motion';

export async function createFlowSplit(section: HTMLElement) {
  gsap.registerPlugin(MotionPathPlugin);
  const code = `graph LR
  A --> B
  A --> C
  B --> D
  C --> E
  D --> F
  E --> F`;
  const container = ensureContainer(section);
  ensureScript(section, code);
  const { svg } = await renderMermaid(container, code);
  const edges = listFlowEdgesFromSvgRaw(svg);
  const out = new Map<string, { from: string; to: string; path: SVGPathElement }[]>();
  edges.forEach(e => { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from)!.push({ ...e, path: ensurePath(e.path) }); });

  // Start a single dot at each root, split at forks
  const roots = findRoots(edges);
  const color = '#e85d04';

  let currentToken = 0;
  let restartTimer: any = null;
  const run = () => {
    const token = ++currentToken;
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    // cleanup any existing followers
    svg.querySelectorAll('circle[data-follower="1"]').forEach(el => el.remove());
    let active = 0;
    const onStart = () => { if (currentToken !== token) return; active++; };
    const onDone = () => {
      if (currentToken !== token) return;
      active = Math.max(0, active - 1);
      if (active === 0) {
        restartTimer = setTimeout(() => { if (currentToken === token) run(); }, 1200);
      }
    };
    const parent: Element = (svg.querySelector('g.root') as Element) || svg;
    roots.forEach(r => advance(svg, createTracerDot(svg, 4, color, parent), r, out, onStart, onDone));
  };
  run();
}

function advance(svg: SVGSVGElement, dot: SVGCircleElement, node: string, out: Map<string, { from: string; to: string; path: SVGPathElement }[]>, onStart?: () => void, onDone?: () => void) {
  const edges = out.get(node) || [];
  if (edges.length === 0) { dot.remove(); onDone && onDone(); return; }
  const step = 0.8;
  edges.forEach((e, idx) => {
    const d = idx === 0 ? dot : (dot.cloneNode(true) as SVGCircleElement);
    if (idx > 0) (dot.parentNode || svg).appendChild(d);
    // reset transforms and position to avoid carryover across segments
    try { gsap.killTweensOf(d); } catch {}
    d.removeAttribute('transform');
    d.removeAttribute('data-svg-origin');
    gsap.set(d, { x: 0, y: 0, rotation: 0 });
    // Keep cx/cy at 0 and let MotionPath control position via transforms
    d.setAttribute('cx', '0');
    d.setAttribute('cy', '0');
    d.setAttribute('visibility', 'visible');
    // increment active immediately to avoid gaps before onStart
    onStart && onStart();
    gsap.to(d, {
      duration: step,
      ease: 'power1.inOut',
      motionPath: { path: e.path, autoRotate: false },
      overwrite: 'auto',
      immediateRender: false,
      onStart: () => { d.setAttribute('visibility', 'visible'); },
      onComplete: () => { advance(svg, d, e.to, out, onStart, onDone); onDone && onDone(); },
    });
  });
}

function findRoots(edges: ReturnType<typeof listFlowEdgesFromSvgRaw>): string[] {
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
