import animate, { initialize } from '../lib/index';

export async function createFlowBasic(section: HTMLElement) {
  const code = `graph LR
  A[Start] --> B{Branch}
  B -->|yes| C[Do a thing]
  B -->|no| D[Different path]
  C --> E[Finish]
  D --> E`;
  const container = ensureContainer(section);
  const script = ensureScript(section, code);
  initialize({});
  await animate.animate(container, code, { mode: 'edge-draw', loop: true });
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
