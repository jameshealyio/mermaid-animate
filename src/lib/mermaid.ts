import mermaid from 'mermaid';

/**
 * renderMermaid writes Mermaid-rendered SVG to container and returns the created SVG element.
 * Handles v10/v11 differences between render and renderAsync.
 */
export async function renderMermaid(container: HTMLElement, code: string): Promise<{ svg: SVGSVGElement; bind?: (el: Element) => void }>
{
  // Mermaid's render returns a string of SVG content. We'll insert it into container.
  const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
  let result: any;
  try {
    result = await (mermaid.render as any)(id, code, container);
    if (result && typeof (result as Promise<any>).then === 'function') {
      result = await result;
    }
  } catch (e) {
    // Try renderAsync for older/newer versions
    result = await (mermaid.renderAsync as any)(id, code, container);
  }
  const svgText: string = result.svg || '';
  container.innerHTML = svgText;
  const svg = container.querySelector('svg') as SVGSVGElement | null;
  if (!svg) throw new Error('Mermaid failed to produce an SVG');
  result.bindFunctions?.(svg);
  return { svg, bind: result.bindFunctions };
}

