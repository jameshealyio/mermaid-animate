import gsap from 'gsap';
import { TimelineManager } from './motion';

export interface AutoplayOptions {
  whenVisible?: boolean;
  startDelay?: number;
  replayDelay?: number;
}

/** Attach visibility-triggered autoplay; returns a cleanup function. */
export function attachVisibilityAutoplay(
  container: HTMLElement,
  run: () => Promise<void> | void,
  opts: AutoplayOptions,
  timelines?: TimelineManager,
): () => void {
  const whenVisible = opts.whenVisible ?? true;
  const startDelay = opts.startDelay ?? 1000;
  const replayDelay = opts.replayDelay ?? 2000;

  let startTimer: any = null;
  let replayTimer: any = null;

  const clearTimers = () => {
    if (startTimer) { clearTimeout(startTimer); startTimer = null; }
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
  };

  let visible = false;

  const onVisible = () => {
    clearTimers();
    visible = true;
    startTimer = setTimeout(async () => {
      await run();
      // After a run finishes, if the timeline is non-looping, schedule replay
      try {
        const tl: any = timelines?.get(container);
        if (tl && !tl._maLoop) {
          // Chain existing onComplete, then schedule replay if still visible
          const prev = tl.eventCallback ? tl.eventCallback('onComplete') : undefined;
          if (tl.eventCallback) {
            tl.eventCallback('onComplete', () => {
              prev && prev();
              if (!visible) return;
              clearTimeout(replayTimer);
              replayTimer = setTimeout(async () => { if (visible) await run(); }, replayDelay);
            });
          }
        }
      } catch {}
    }, startDelay);
  };
  const onHidden = () => {
    clearTimers();
    visible = false;
    const tl = timelines?.get(container);
    tl?.pause();
  };

  let disposed = false;
  const io = new IntersectionObserver(entries => {
    if (disposed) return;
    for (const e of entries) {
      if (e.target !== container) continue;
      const visible = e.intersectionRatio >= 0.5;
      if (!whenVisible) {
        // Start immediately, but still respect timers to avoid thrash
        onVisible();
        return;
      }
      if (visible) onVisible(); else onHidden();
    }
  }, { threshold: 0.5 });
  io.observe(container);

  // Optional: schedule replay if timeline finished but still visible
  const observer = new MutationObserver(() => {
    // No-op placeholder; demo could wire explicit replay scheduling if needed.
  });
  observer.observe(container, { attributes: false, childList: false, subtree: false });

  return () => {
    disposed = true;
    clearTimers();
    try { io.disconnect(); } catch {}
    try { observer.disconnect(); } catch {}
  };
}
