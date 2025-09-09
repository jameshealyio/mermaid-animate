declare module 'gsap' {
  export type Ease = string | ((progress: number) => number);

  export interface TimelineVars {
    repeat?: number;
    repeatDelay?: number;
    paused?: boolean;
    onComplete?: () => void;
  }

  export interface TweenVars {
    duration?: number;
    ease?: Ease;
    onComplete?: () => void;
    [key: string]: any;
  }

  export interface GSAPTimeline {
    to(targets: any, vars: TweenVars, position?: any): GSAPTimeline;
    fromTo(targets: any, fromVars: TweenVars, toVars: TweenVars, position?: any): GSAPTimeline;
    add(tl: GSAPTimeline | Function, position?: any): GSAPTimeline;
    play(position?: any): GSAPTimeline;
    pause(): GSAPTimeline;
    kill(): void;
    clear(): GSAPTimeline;
    totalDuration(): number;
  }

  export interface GSAPStatic {
    timeline(vars?: TimelineVars): GSAPTimeline;
    to(targets: any, vars: TweenVars): any;
    set(targets: any, vars: TweenVars): any;
    utils: { wrap<T>(array: T[]): (i: number) => T };
    registerPlugin(...plugins: any[]): void;
  }

  const gsap: GSAPStatic;
  export default gsap;
}

declare module 'gsap/all' {
  export const MotionPathPlugin: any;
}

