import gsap from 'gsap';
import { renderMermaid } from '../lib/mermaid';

export async function createFlowHeatmap(section: HTMLElement) {
  const code = `graph LR
  A --> B
  A --> C
  B --> D
  C --> D
  D --> E`;
  const container = ensureContainer(section);
  ensureScript(section, code);
  const { svg } = await renderMermaid(container, code);
  const paths = Array.from(svg.querySelectorAll('g.edgePaths path')) as SVGPathElement[];
  paths.forEach((p, i) => {
    const hue = (i * 47) % 360;
    const col = `hsl(${hue}, 80%, 50%)`;
    p.style.stroke = col;
    gsap.to(p, { strokeWidth: 3, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });
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

