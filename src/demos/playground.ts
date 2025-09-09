import animate from '../lib/index';

export function createPlayground(section: HTMLElement) {
  const textarea = section.querySelector<HTMLTextAreaElement>('textarea[data-playground]') || createEditor(section);
  const container = section.querySelector<HTMLElement>('.diagram') || createContainer(section);
  const controls = ensureControls(section);
  const runBtn = controls.querySelector<HTMLButtonElement>('button[data-run]') as HTMLButtonElement;
  const speedInput = controls.querySelector<HTMLInputElement>('input[data-speed]') as HTMLInputElement;
  const delayInput = controls.querySelector<HTMLInputElement>('input[data-delay]') as HTMLInputElement;

  let token = 0;
  let timer: any = null;

  const runOnce = async (code: string, speed: number) => {
    // Heuristic: sequence vs flow
    const head = (code.trim().split(/\s+/)[0] || '').toLowerCase();
    const isSeq = head === 'sequence' || /sequenceDiagram/i.test(code);
    if (isSeq) {
      await animate.animate(container, code, { mode: 'tracer', speed, loop: true });
    } else {
      await animate.animate(container, code, { mode: 'edge-draw', speed, loop: false });
    }
    return isSeq;
  };

  const runLoop = async () => {
    const my = ++token;
    if (timer) { clearTimeout(timer); timer = null; }
    const code = textarea.value;
    const speed = parseFloat(speedInput.value || '1') || 1;
    const delay = Math.max(0, parseInt(delayInput.value || '1000', 10) || 1000);
    const isSeq = await runOnce(code, speed);
    if (!isSeq) {
      const svg = container.querySelector('svg');
      if (svg) {
        const handler = () => {
          if (token === my) timer = setTimeout(() => { if (token === my) runLoop(); }, delay);
        };
        svg.addEventListener('ma:complete', handler, { once: true });
      }
    }
  };

  runBtn.addEventListener('click', runLoop);
}

function createEditor(section: HTMLElement) {
  const ta = document.createElement('textarea');
  ta.setAttribute('data-playground', '1');
  ta.rows = 12; ta.cols = 60;
  ta.value = `graph LR\nA --> B\nB --> C\nC --> A`;
  section.appendChild(ta);
  return ta;
}
function createContainer(section: HTMLElement) {
  const div = document.createElement('div');
  div.className = 'diagram';
  section.appendChild(div);
  return div;
}
function createControls(section: HTMLElement) {
  const wrap = document.createElement('div');
  wrap.className = 'actions';
  const speed = document.createElement('input');
  speed.type = 'number'; speed.step = '0.1'; speed.min = '0.1'; speed.value = '1';
  speed.setAttribute('data-speed', '1');
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Speed ×'; speedLabel.appendChild(speed);

  const delay = document.createElement('input');
  delay.type = 'number'; delay.step = '100'; delay.min = '0'; delay.value = '1500';
  delay.setAttribute('data-delay', '1');
  const delayLabel = document.createElement('label');
  delayLabel.textContent = ' Delay (ms) '; delayLabel.appendChild(delay);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = 'Run'; btn.setAttribute('data-run', '1');

  wrap.appendChild(speedLabel);
  wrap.appendChild(delayLabel);
  wrap.appendChild(btn);
  section.appendChild(wrap);
  return wrap;
}

function ensureControls(section: HTMLElement): HTMLElement {
  let wrap = section.querySelector<HTMLElement>('.actions');
  if (!wrap) return createControls(section);
  // ensure speed input
  if (!wrap.querySelector('input[data-speed]')) {
    const speed = document.createElement('input');
    speed.type = 'number'; speed.step = '0.1'; speed.min = '0.1'; speed.value = '1';
    speed.setAttribute('data-speed', '1');
    const label = document.createElement('label');
    label.textContent = 'Speed ×';
    label.appendChild(speed);
    wrap.insertBefore(label, wrap.firstChild);
  }
  // ensure delay input
  if (!wrap.querySelector('input[data-delay]')) {
    const delay = document.createElement('input');
    delay.type = 'number'; delay.step = '100'; delay.min = '0'; delay.value = '1500';
    delay.setAttribute('data-delay', '1');
    const label = document.createElement('label');
    label.textContent = ' Delay (ms) ';
    label.appendChild(delay);
    wrap.appendChild(label);
  }
  // ensure run button
  if (!wrap.querySelector('button[data-run]')) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Run'; btn.setAttribute('data-run', '1');
    wrap.appendChild(btn);
  }
  return wrap;
}
