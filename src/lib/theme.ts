import mermaid from 'mermaid';

type Theme = 'light' | 'dark';

let currentTheme: Theme = 'light';
const listeners = new Set<() => void>();

export function setTheme(theme: Theme) {
  currentTheme = theme;
  applyThemeSync(theme);
  // Reinitialize Mermaid so new renders pick up theme
  try {
    const mTheme = theme === 'dark' ? 'dark' : 'default';
    mermaid.initialize({ theme: mTheme } as any);
  } catch {}
  listeners.forEach(fn => fn());
}

export function getTheme(): Theme {
  return currentTheme;
}

export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyThemeSync(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const root = document.documentElement as HTMLElement;
  if (theme === 'dark') {
    root.style.setProperty('--ma-bg', '#0b0f14');
    root.style.setProperty('--ma-fg', '#e6edf3');
    root.style.setProperty('--ma-accent', '#7cc1ff');
  } else {
    root.style.setProperty('--ma-bg', '#ffffff');
    root.style.setProperty('--ma-fg', '#0b1220');
    root.style.setProperty('--ma-accent', '#1b74e4');
  }
}

