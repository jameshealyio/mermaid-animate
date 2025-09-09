# mermaid-animate

Animating Mermaid diagrams with GSAP paths.

Proof of Concept, vibe‑coded. This project was a quick way to animate Mermaid edges. It’s intentionally small and pragmatic — treat it as a PoC/inspiration for upstream libraries rather than a finished product. PRs welcome, but stability isn’t guaranteed.

# Demo: https://jameshealyio.github.io/mermaid-animate/

## What are Mermaid and GSAP?

- Mermaid turns text into diagrams (flowcharts, sequence diagrams, state machines, and more). It’s great for docs and apps.
- GSAP is a battle‑tested animation engine. We use its MotionPathPlugin to move tracers along edges and craft smooth, native‑feeling motion.

No patches to Mermaid. We rely on public APIs and DOM heuristics.

## Install

```
npm i mermaid-animate
# If peer deps are not installed already
npm i mermaid gsap
```

## Quickstart

```ts
import animate from 'mermaid-animate';

animate.initialize({ theme: 'light' });

const container = document.getElementById('diagram')!;
const code = `graph LR\nA --> B\nB --> C`;

// Render only (thin wrapper over Mermaid)
await animate.render(container, code);

// Animate with defaults (auto detects flow vs sequence)
await animate.animate(container, code);

// Sugar: explicit mode helpers
await animate.flow.draw(container, `graph LR\nA-->B`, { draw: { step: 0.8 } });
await animate.sequence.tracer(container, `sequenceDiagram\nA->>B: hi`, { tracer: { count: 2 } });

See the full demo site on GitHub Pages for ready‑to‑copy, self‑contained examples.
```

### Demo sugar

```html
<script type="module">
  import animate from 'mermaid-animate';
  animate.initialize({ theme: 'default' });
  await animate.mount(); // scans [data-demo] and attaches autoplay
</script>
```

## Public API

- `initialize(options?: { theme?: 'light' | 'dark'; mermaid?: Partial<Mermaid.Config>; animate?: AnimateOptions })`
  - Initializes Mermaid with safe defaults (`{ startOnLoad:false, securityLevel:'loose' }`) and theme mapping (light→default, dark→dark). Registers GSAP MotionPathPlugin. Optionally syncs CSS vars.
- `render(container, code)`
  - Thin wrapper over `mermaid.render`. Writes SVG into `container` and returns `{ svg, bind }`.
- `animate(container, code, options?)`
  - Detects diagram type and applies defaults:
    - Flowcharts: stroke‑dash edge draw in sequence (step ~1.0s, gap ~0.25s).
    - Sequence: tracer dot loops across connectors.
  - Options override: `mode: 'edge-draw' | 'tracer' | 'auto'`, `loop`, `speed`, tracer and draw tuning, `split` behavior.
- `mount()`
  - Scans `[data-demo]` sections with `<script type="text/mermaid">` inside, renders + attaches autoplay (≥50% visible, start delay 1000ms, replay delay 2000ms by default). Returns cleanup.
- `setTheme(theme)`, `getTheme()`, `onThemeChange(fn)`
  - Updates CSS variables, re‑initializes Mermaid; `onThemeChange` lets you re‑render if needed.

### AnimateOptions

```ts
type AnimateOptions = {
  mode?: 'edge-draw' | 'tracer' | 'auto';
  loop?: boolean;                 // default false for flow, true for sequence
  speed?: number;                 // duration multiplier (1.0 default)
  tracer?: { size?: number; ease?: string; count?: number; color?: string | string[] };
  draw?: { step?: number; gap?: number; ease?: string };
  split?: 'waves' | 'continuous'; // available in demos
  autoplay?: { whenVisible?: boolean; startDelay?: number; replayDelay?: number };
  themeSync?: boolean;            // sync CSS vars with theme (default true)
}
```

## Demos

The demo page shows each diagram with:

- The exact Mermaid snippet
- The minimal `mermaid-animate` code that produced the animation
- A “Load in Playground” button to copy the snippet into a live editor

Included demos:

- Flow: Edge Sequence (default edge draw)
- Flow: Click‑to‑Traverse (fan‑out in waves from clicked node)
- Flow: Advanced Fan‑out (auto waves from roots)
- Flow: Splitting Tracers (continuous, clones at forks, removes at sinks)
- Flow: Heatmap (edge width/color pulse + tracers optional)
- Sequence (looping tracer; “Another one” can add more)
- State (rendered; optional animation via Playground)
- Playground (editor + Run)

## Contributing

Project layout:

- `src/lib/`
  - `index.ts` – public API surface
  - `mermaid.ts` – Mermaid ESM + render wrapper
- `motion.ts` – GSAP + MotionPath helpers (ensurePath, createTracerDot, animateStrokeDraw, timeline manager)
  - `selectors.ts` – centralized DOM selectors + LS/LE mapping, sequence connector selection
  - `traverse.ts` – BFS utils and waves
  - `observe.ts` – IntersectionObserver autoplay
  - `theme.ts` – theme sync and hooks
- `src/demos/` – small, focused demo builders
- `index.html` – demo page with code panels and Playground
- `src/styles.css` – light/dark variables and demo styles

Run demo and build:

```
npm run dev        # local dev server for the demo
npm run build:lib  # outputs ESM lib to dist/mermaid-animate.es.js
npm run build:demo # builds demo site to site/ (what Pages deploys)
```

Notes:

- Mermaid and GSAP are peer dependencies to keep install size modest; the library imports them for you.
- Types are included via local ambient declarations for ergonomics.
