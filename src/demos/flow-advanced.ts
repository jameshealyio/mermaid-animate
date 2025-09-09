import gsap from 'gsap';
import { renderMermaid } from '../lib/mermaid';
import { listFlowEdgesFromSvgRaw } from '../lib/selectors';
import { animateStrokeDraw, ensurePath } from '../lib/motion';

export async function createFlowAdvanced(section: HTMLElement) {
  const code = `graph LR
  A --> B
  A --> C
  B --> D
  C --> D
  D --> E
  D --> F`;
  const container = ensureContainer(section);
  ensureScript(section, code);
  const { svg } = await renderMermaid(container, code);
  const raw = listFlowEdgesFromSvgRaw(svg).map(e => ({ ...e, path: ensurePath(e.path) }));
  const roots = findRoots(raw);
  const master = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.0 });
  const step = 0.7, gap = 0.2;

  // Build a child timeline per root and start all at t=0
  roots.forEach(r => {
    const fan = waveEdges(raw, r);
    const child = gsap.timeline();
    fan.forEach(wave => {
      const pos = child.duration();
      wave.forEach(p => animateStrokeDraw(child, p, { duration: step }, pos));
      child.to({}, { duration: gap });
    });
    master.add(child, 0);
  });
  master.play(0);
}

function waveEdges(edges: ReturnType<typeof listFlowEdgesFromSvgRaw>, start: string): SVGPathElement[][] {
  const out = new Map<string, { from: string; to: string; path: SVGPathElement }[]>();
  edges.forEach(e => { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from)!.push(e); });
  const seen = new Set<string>([start]);
  let frontier = [start];
  const waves: SVGPathElement[][] = [];
  while (frontier.length) {
    const next: string[] = [];
    const wave: SVGPathElement[] = [];
    for (const u of frontier) {
      const es = out.get(u) || [];
      for (const e of es) { wave.push(e.path); if (!seen.has(e.to)) { seen.add(e.to); next.push(e.to); } }
    }
    if (wave.length) waves.push(wave);
    frontier = next;
  }
  return waves;
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
