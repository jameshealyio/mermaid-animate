import { renderMermaid } from '../lib/mermaid';
import { parseTransitions } from '../lib/parse';
import { ensurePath, createTracerDot } from '../lib/motion';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';

export async function createState(section: HTMLElement) {
  gsap.registerPlugin(MotionPathPlugin);
  const code = `stateDiagram-v2
  [*] --> Idle
  Idle --> Working: Start
  Working --> Idle: Stop
  Working --> Error: Fail
  Error --> Idle: Reset`;

  const container = ensureContainer(section);
  ensureScript(section, code);
  const { svg } = await renderMermaid(container, code);

  // Parse transitions from source
  const transitions = parseTransitions(code);

  // Collect connectors and convert to path elements
  const sel = 'path[marker-end], line[marker-end], polyline[marker-end], path[marker-start], line[marker-start], polyline[marker-start]';
  let connectors = Array.from(svg.querySelectorAll(sel));
  const paths = connectors.map(el => ensurePath(el));

  // Heuristic mapping: if one more connector than transitions, drop the first (often [*] -> first state)
  let mapped = paths.slice();
  if (paths.length === transitions.length + 1) mapped = paths.slice(1);
  else if (paths.length > transitions.length) mapped = paths.slice(0, transitions.length);

  // Build a label->node map for click-to-start
  const nodes = Array.from(svg.querySelectorAll<SVGGElement>('g.node'));
  const labelOf = (n: SVGGElement) => (n.textContent || '').trim();
  const byLabel = new Map(nodes.map(n => [labelOf(n), n] as const));

  // Looping tracer along transitions; allow changing start by click
  let token = 0;
  let currentTL: gsap.GSAPTimeline | null = null;

  function run(startAt: number) {
    const my = ++token;
    // cleanup old dot
    svg.querySelectorAll('circle[data-follower="1"]').forEach(el => el.remove());
    if (currentTL) { try { currentTL.kill(); } catch {} currentTL = null; }

    const parent: Element = (svg.querySelector('g.root') as Element) || svg;
    const dot = createTracerDot(svg, 4, getComputedStyle(svg).getPropertyValue('--ma-accent') || '#1b74e4', parent);
    const tl = gsap.timeline({ paused: true });
    currentTL = tl;
    const seq = rotate(mapped, startAt);
    seq.forEach(p => {
      tl.to(dot, { duration: 0.9, ease: 'power1.inOut', motionPath: { path: p, align: p, autoRotate: false }, onStart: () => dot.setAttribute('visibility', 'visible') });
    });
    tl.eventCallback('onComplete', () => { if (token === my) setTimeout(() => run(startAt), 1000); });
    tl.play(0);
  }

  // Default start at the first transition
  run(0);

  // Click a state node to choose the starting transition (first transition whose from == clicked label)
  nodes.forEach(n => {
    n.style.cursor = 'pointer';
    n.addEventListener('click', () => {
      const label = labelOf(n);
      const idx = transitions.findIndex(t => t.from === label);
      if (idx >= 0) run(idx);
    });
  });
}

function rotate<T>(arr: T[], start: number): T[] {
  const n = arr.length;
  if (!n) return arr.slice();
  const k = ((start % n) + n) % n;
  return arr.slice(k).concat(arr.slice(0, k));
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
