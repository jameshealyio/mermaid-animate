import type { FlowEdgeRaw } from './selectors';

export interface Graph {
  nodes: Set<string>;
  out: Map<string, Set<string>>;
  edges: Array<{ from: string; to: string }>;
}

export function buildGraphFromEdges(edges: FlowEdgeRaw[]): Graph {
  const nodes = new Set<string>();
  const out = new Map<string, Set<string>>();
  const list: Array<{ from: string; to: string }> = [];
  for (const e of edges) {
    nodes.add(e.from); nodes.add(e.to);
    if (!out.has(e.from)) out.set(e.from, new Set());
    out.get(e.from)!.add(e.to);
    list.push({ from: e.from, to: e.to });
  }
  return { nodes, out, edges: list };
}

/**
 * fanOutWaves: BFS layers starting from a given node.
 */
export function fanOutWaves(graph: Graph, start: string): string[][] {
  const seen = new Set<string>([start]);
  let frontier = [start];
  const layers: string[][] = [];
  while (frontier.length) {
    const next: string[] = [];
    for (const u of frontier) {
      const vs = graph.out.get(u);
      if (!vs) continue;
      for (const v of vs) if (!seen.has(v)) { seen.add(v); next.push(v); }
    }
    if (next.length) layers.push(next.slice());
    frontier = next;
  }
  return layers;
}

