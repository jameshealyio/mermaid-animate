// Minimal Mermaid v10/11 type surface used here
declare module 'mermaid' {
  export namespace Mermaid {
    export interface Config {
      startOnLoad?: boolean;
      theme?: string;
      securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
      [key: string]: any;
    }
  }

  export interface RenderResult {
    svg: string;
    bindFunctions?: (el: Element) => void;
  }

  export function initialize(config: Mermaid.Config): void;
  export function parse(text: string): boolean;
  // v10 uses renderAsync, v11 has render with Promise
  export function render(id: string, code: string, container?: Element): Promise<RenderResult> | RenderResult;
  export function renderAsync(id: string, code: string, container?: Element): Promise<RenderResult>;

  const mermaid: {
    initialize: typeof initialize;
    parse: typeof parse;
    render: typeof render;
    renderAsync: typeof renderAsync;
  };

  export default mermaid;
}

