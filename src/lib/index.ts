/**
 * mermaid-animate: first-party-feeling animations for Mermaid diagrams.
 * Default export mirrors Mermaid ergonomics: initialize(), render(), animate(), mount().
 */
import mermaid from 'mermaid';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import { renderMermaid } from './mermaid';
import { ensurePath, createTracerDot, animateStrokeDraw, TimelineManager } from './motion';
import { listFlowEdgesFromSvgRaw, selectSequenceConnectors } from './selectors';
import { buildGraphFromEdges, fanOutWaves } from './traverse';
import { parseTransitions } from './parse';
import { attachVisibilityAutoplay } from './observe';
import { getTheme, setTheme as setDocTheme, onThemeChange, applyThemeSync } from './theme';

export type Theme = 'light' | 'dark';

export type AnimateOptions = {
  mode?: 'edge-draw' | 'tracer' | 'auto';
  loop?: boolean;
  speed?: number; // multiplier
  tracer?: { size?: number; ease?: string; count?: number; color?: string | string[] };
  draw?: { step?: number; gap?: number; ease?: string };
  split?: 'waves' | 'continuous';
  autoplay?: { whenVisible?: boolean; startDelay?: number; replayDelay?: number };
  themeSync?: boolean;
};

export interface InitializeOptions {
  theme?: Theme;
  mermaid?: Partial<mermaid.Mermaid.Config>;
  animate?: AnimateOptions;
}

type DiagramKind = 'flow' | 'sequence' | 'state' | 'other';

const defaults = {
  theme: 'light' as Theme,
  mermaid: { startOnLoad: false, securityLevel: 'loose' as const },
  animate: {
    mode: 'auto' as const,
    loop: undefined as boolean | undefined,
    speed: 1.0,
    tracer: { size: 4, ease: 'power1.inOut', count: 1, color: undefined as any },
    draw: { step: 1.0, gap: 0.25, ease: 'power1.inOut' },
    split: 'waves' as const,
    autoplay: { whenVisible: true, startDelay: 1000, replayDelay: 2000 },
    themeSync: true,
  },
};

let globalConfig: Required<InitializeOptions> = {
  theme: defaults.theme,
  mermaid: { ...defaults.mermaid },
  animate: { ...defaults.animate },
};

// Track timelines per container for cleanup
const timelines = new TimelineManager();

export function initialize(options?: InitializeOptions): void {
  const theme = options?.theme ?? globalConfig.theme ?? defaults.theme;
  globalConfig = {
    theme,
    mermaid: { ...defaults.mermaid, ...(options?.mermaid ?? {}), theme: theme === 'dark' ? 'dark' : 'default' },
    animate: { ...defaults.animate, ...(options?.animate ?? {}) },
  } as Required<InitializeOptions>;

  // Configure Mermaid
  mermaid.initialize(globalConfig.mermaid as any);

  // Register MotionPathPlugin
  gsap.registerPlugin(MotionPathPlugin);

  // Apply theme sync (CSS vars)
  if (globalConfig.animate.themeSync !== false) {
    applyThemeSync(theme);
  }
}

function detectDiagramKind(code: string): DiagramKind {
  const c = code.trim();
  const head = c.split(/\s+/)[0]?.toLowerCase() || '';
  if (head === 'sequence' || head === 'sequencediagram') return 'sequence';
  if (head === 'state' || head === 'statediagram' || head === 'state-diagram') return 'state';
  if (head === 'graph' || head === 'flowchart') return 'flow';
  // try heuristic: contains sequenceDiagram / stateDiagram
  if (/sequenceDiagram/i.test(c)) return 'sequence';
  if (/stateDiagram/i.test(c)) return 'state';
  if (/graph\s+(LR|TB|RL|BT)/i.test(c) || /flowchart\b/i.test(c)) return 'flow';
  return 'other';
}

export async function render(container: HTMLElement, code: string): Promise<{ svg: SVGSVGElement; bind?: (el: Element) => void }>
{
  return renderMermaid(container, code);
}

export async function animate(container: HTMLElement, code: string, options?: AnimateOptions): Promise<{ svg: SVGSVGElement }>
{
  const { svg, bind } = await renderMermaid(container, code);
  bind?.(svg);

  // Cleanup previous
  timelines.kill(container);

  const kind = detectDiagramKind(code);
  const cfg = { ...globalConfig.animate, ...(options ?? {}) };
  const speed = cfg.speed ?? 1.0;

  if (kind === 'flow') {
    const mode = cfg.mode === 'auto' ? 'edge-draw' : cfg.mode ?? 'edge-draw';
    if (mode === 'edge-draw') {
      // Animate edges with stroke-dash draw in sequence
      const edges = Array.from(svg.querySelectorAll('g.edgePaths path')) as SVGPathElement[];
      const tl = gsap.timeline({ paused: true });
      const step = (cfg.draw?.step ?? 1.0) / speed;
      const gap = (cfg.draw?.gap ?? 0.25) / speed;
      edges.forEach((p, i) => {
        animateStrokeDraw(tl, p, { duration: step, ease: cfg.draw?.ease || 'power1.inOut' });
        if (i < edges.length - 1 && gap > 0) tl.to({}, { duration: gap });
      });

      const loop = cfg.loop ?? false;
      (tl as any)._maLoop = !!loop;
      const prev = tl.eventCallback ? tl.eventCallback('onComplete') : undefined;
      tl.eventCallback?.('onComplete', () => {
        prev && prev();
        try { svg.dispatchEvent(new CustomEvent('ma:complete')); } catch {}
        if (loop) tl.play(0);
      });
      timelines.set(container, tl, svg);
      tl.play(0);
    } else {
      // tracer mode along each edge in sequence
      const palette = Array.isArray(cfg.tracer?.color) ? (cfg.tracer!.color as string[]) : cfg.tracer?.color ? [cfg.tracer!.color as string] : [];
      const color = (i: number) => palette[i % (palette.length || 1)] || getComputedStyle(svg).getPropertyValue('--ma-accent') || '#08f';
      const edges = listFlowEdgesFromSvgRaw(svg);
      const pathEls: SVGPathElement[] = edges.map(e => ensurePath(e.path));
      const tl = gsap.timeline({ paused: true });
      const step = (cfg.draw?.step ?? 1.0) / speed;
      const count = Math.max(1, cfg.tracer?.count ?? 1);
      const r = cfg.tracer?.size ?? 4;
      const parent = (pathEls[0]?.closest('g.root') as Element) || pathEls[0]?.parentElement || svg;
      for (let k = 0; k < count; k++) {
        const dot = createTracerDot(svg, r, color(k), parent);
        pathEls.forEach((p, i) => {
          tl.to(dot, {
            duration: step,
            ease: cfg.tracer?.ease || 'power1.inOut',
            motionPath: { path: p, align: p, autoRotate: false },
            onStart: () => dot.setAttribute('visibility', 'visible'),
          });
        });
      }
      const loop = cfg.loop ?? false;
      (tl as any)._maLoop = !!loop;
      const prev2 = tl.eventCallback ? tl.eventCallback('onComplete') : undefined;
      tl.eventCallback?.('onComplete', () => {
        // cleanup dots when finished (for non-looping)
        if (!loop) svg.querySelectorAll('circle[data-follower="1"]').forEach(el => el.remove());
        prev2 && prev2();
        try { svg.dispatchEvent(new CustomEvent('ma:complete')); } catch {}
        if (loop) tl.play(0);
      });
      timelines.set(container, tl, svg);
      tl.play(0);
    }
  } else if (kind === 'sequence') {
    const connectors = selectSequenceConnectors(svg);
    const paths = connectors.map(el => ensurePath(el));
    const palette = Array.isArray(cfg.tracer?.color) ? (cfg.tracer!.color as string[]) : cfg.tracer?.color ? [cfg.tracer!.color as string] : [];
    const color = (i: number) => palette[i % (palette.length || 1)] || getComputedStyle(svg).getPropertyValue('--ma-accent') || '#08f';
    const tl = gsap.timeline({ paused: true });
    const step = (cfg.draw?.step ?? 1.0) / speed;
    const count = Math.max(1, cfg.tracer?.count ?? 1);
    const r = cfg.tracer?.size ?? 4;
    const parent = (paths[0]?.closest('g.root') as Element) || paths[0]?.parentElement || svg;
    for (let k = 0; k < count; k++) {
      const dot = createTracerDot(svg, r, color(k), parent);
      paths.forEach(p => {
        tl.to(dot, {
          duration: step,
          ease: cfg.tracer?.ease || 'power1.inOut',
          motionPath: { path: p, align: p, autoRotate: false },
          onStart: () => dot.setAttribute('visibility', 'visible'),
        });
      });
    }
    const loop = cfg.loop ?? true;
    (tl as any)._maLoop = !!loop;
    const prev3 = tl.eventCallback ? tl.eventCallback('onComplete') : undefined;
    tl.eventCallback?.('onComplete', () => {
      prev3 && prev3();
      try { svg.dispatchEvent(new CustomEvent('ma:complete')); } catch {}
      if (loop) tl.play(0);
    });
    timelines.set(container, tl, svg);
    tl.play(0);
  } else if (kind === 'state') {
    // Render only; optional animations are available via demos/playground
    timelines.set(container, gsap.timeline({ paused: true }), svg);
  }

  return { svg };
}

export async function mount(): Promise<() => void> {
  // Finds sections with [data-demo], extracts Mermaid code from <script type="text/mermaid">, then animates with autoplay.
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-demo]'));
  const disposers: Array<() => void> = [];
  sections.forEach(section => {
    const script = section.querySelector<HTMLScriptElement>('script[type="text/mermaid"], script[type="text/x-mermaid"]');
    const container = section.querySelector<HTMLElement>('.diagram, [data-diagram-target]') || section;
    if (!script || !container) return;
    const code = script.textContent || '';
    const cleanup = attachVisibilityAutoplay(container, async () => {
      await animate(container, code);
    }, {
      startDelay: globalConfig.animate.autoplay?.startDelay ?? 1000,
      replayDelay: globalConfig.animate.autoplay?.replayDelay ?? 2000,
      whenVisible: globalConfig.animate.autoplay?.whenVisible ?? true,
    }, timelines);
    disposers.push(cleanup);
  });
  return () => disposers.forEach(fn => fn());
}

export { renderMermaid };
export { attachVisibilityAutoplay };
export { animateStrokeDraw, ensurePath, createTracerDot };
export { listFlowEdgesFromSvgRaw as listFlowEdgesFromSvgRaw };
export { buildGraphFromEdges, fanOutWaves };
export { parseTransitions };
export function setTheme(theme: Theme) {
  setDocTheme(theme);
  try {
    // Re-render all demo sections to apply Mermaid theme across the page
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-demo]'));
    sections.forEach(async (section) => {
      const script = section.querySelector<HTMLScriptElement>('script[type="text/mermaid"], script[type="text/x-mermaid"]');
      const container = section.querySelector<HTMLElement>('.diagram, [data-diagram-target]') || section;
      if (!script || !container) return;
      const code = script.textContent || '';
      await animate(container, code);
    });
  } catch {}
}
export { getTheme, onThemeChange };

// Sub-namespace sugar for clearer ergonomics
async function flowDraw(
  container: HTMLElement,
  code: string,
  options?: AnimateOptions,
) {
  const opts: AnimateOptions = { ...(options || {}), mode: 'edge-draw' };
  return animate(container, code, opts);
}

async function sequenceTracer(
  container: HTMLElement,
  code: string,
  options?: AnimateOptions,
) {
  const baseLoop = options?.loop ?? true;
  const opts: AnimateOptions = { ...(options || {}), mode: 'tracer', loop: baseLoop };
  return animate(container, code, opts);
}

const api = {
  initialize,
  render,
  animate,
  mount,
  setTheme,
  getTheme,
  onThemeChange,
  flow: {
    draw: flowDraw,
  },
  sequence: {
    tracer: sequenceTracer,
  },
};

export default api;
