import animate from '../lib/index';

export async function createSequence(section: HTMLElement) {
  const code = `sequenceDiagram
  participant A as Client
  participant B as API
  participant C as DB
  A->>B: Request
  B->>C: Query
  C-->>B: Rows
  B-->>A: Response`;
  const container = ensureContainer(section);
  ensureScript(section, code);
  await animate.animate(container, code, { mode: 'tracer', loop: true, tracer: { count: 1 } });

  const btn = section.querySelector<HTMLButtonElement>('button.add-follower');
  if (btn) {
    btn.addEventListener('click', async () => {
      // Add a concurrent tracer without restarting
      const svg = container.querySelector('svg') as SVGSVGElement | null;
      if (!svg) return;
      const { MotionPathPlugin } = await import('gsap/all');
      const { default: gsap } = await import('gsap');
      // Select connectors and ensure paths exist in DOM
      const sels = ['path[marker-end]', 'line[marker-end]', 'polyline[marker-end]', 'path[marker-start]', 'line[marker-start]', 'polyline[marker-start]'];
      const els = Array.from(svg.querySelectorAll(sels.join(',')));
      const paths = els.map(el => (MotionPathPlugin as any).convertToPath(el, true)).map((r: any) => (Array.isArray(r) ? r[0] : r)) as SVGPathElement[];
      const hue = Math.floor(Math.random() * 360);
      const col = `hsl(${hue}, 85%, 55%)`;
      const dot = svg.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '4'); dot.setAttribute('fill', col); dot.setAttribute('data-follower', '1'); dot.setAttribute('visibility', 'hidden');
      const parent: Element = (svg.querySelector('g.root') as Element) || svg;
      parent.appendChild(dot);
      const step = 1.0;
      const tl = gsap.timeline({ paused: true });
      paths.forEach(p => tl.to(dot, { duration: step, ease: 'power1.inOut', motionPath: { path: p, align: p, autoRotate: false }, onStart: () => dot.setAttribute('visibility', 'visible') }));
      tl.eventCallback?.('onComplete', () => tl.play(0));
      tl.play(0);
    });
  }
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
