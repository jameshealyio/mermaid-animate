import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';

// Ensure plugin
gsap.registerPlugin(MotionPathPlugin);

/** Convert a line/polyline/path to a path element, ensuring it exists in DOM. */
export function ensurePath(el: Element): SVGPathElement {
  if (el instanceof SVGPathElement) return el;
  // convertToPath clones and returns paths; true swaps in DOM so returned path is in DOM.
  const converted = (MotionPathPlugin as any).convertToPath(el, true) as Element | Element[];
  const path = Array.isArray(converted) ? converted[0] : converted;
  if (!(path instanceof SVGPathElement)) throw new Error('Failed to convert to SVGPathElement');
  return path;
}

/** Create a tracer dot circle, hidden by default. */
export function createTracerDot(svg: SVGSVGElement, radius = 4, color = '#08f', parent?: Element): SVGCircleElement {
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', String(radius));
  dot.setAttribute('fill', color);
  dot.setAttribute('data-follower', '1');
  dot.setAttribute('visibility', 'hidden');
  const host = parent || (svg.querySelector('g.root') || svg);
  host.appendChild(dot);
  return dot as SVGCircleElement;
}

/** Animate a path stroke using stroke-dasharray. */
export function animateStrokeDraw(tl: gsap.GSAPTimeline, path: SVGPathElement, opts: { duration?: number; ease?: string } = {}, position?: any) {
  const len = path.getTotalLength?.() ?? 0;
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
  tl.to(path, { strokeDashoffset: 0, duration: opts.duration ?? 1, ease: opts.ease || 'power1.inOut' }, position);
}

/**
 * TimelineManager: track GSAP timelines per container; kill & cleanup.
 */
export class TimelineManager {
  private map = new WeakMap<HTMLElement, { tl: gsap.GSAPTimeline; svg?: SVGSVGElement }>();

  set(container: HTMLElement, tl: gsap.GSAPTimeline, svg?: SVGSVGElement) {
    this.kill(container);
    this.map.set(container, { tl, svg });
  }

  get(container: HTMLElement) {
    return this.map.get(container)?.tl;
  }

  kill(container: HTMLElement) {
    const cur = this.map.get(container);
    if (cur) {
      try { cur.tl.kill(); } catch {}
      try { cur.svg?.querySelectorAll('circle[data-follower="1"]').forEach(el => el.remove()); } catch {}
      this.map.delete(container);
    }
  }

  killAll() {
    // Not exhaustive, WeakMap prevents iteration. Rely on per-container kill during remount.
  }
}
