export interface Transition { from: string; to: string }

/** Parse Mermaid state transitions from code. Supports A-->B, A->B, A-->>B; strips labels. Skips [*]. */
export function parseTransitions(code: string): Transition[] {
  const lines = code.split(/\n+/);
  const out: Transition[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('stateDiagram')) continue;
    // Remove label part after ':'
    const noLabel = line.split(':')[0];
    // Remove |text| labels inside
    const cleaned = noLabel.replace(/\|[^|]*\|/g, '');
    // Match variants
    const m = cleaned.match(/([^\s-\[]+)\s*-+>{1,2}\s*([^\s]+)/);
    if (!m) continue;
    const from = m[1];
    const to = m[2];
    if (from === '[*]' || to === '[*]') continue;
    out.push({ from, to });
  }
  return out;
}

