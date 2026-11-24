import { useEffect, useState } from 'react';

/**
 * Modos suportados de tema visual.
 */
type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pegala_theme';

function computeIsDark(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Hook React que gerencia a preferência de tema Claro/Escuro (incluindo detecção automática do sistema)
 * e sincroniza dinamicamente a meta tag `theme-color` com o tema efetivo.
 *
 * @returns Preferência configurada (`theme`), estado efetivo escuro (`isDark`) e função de alternância (`toggleTheme`).
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    } catch {
      return 'system';
    }
  });

  const [resolvedDark, setResolvedDark] = useState(() => computeIsDark(theme));

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = computeIsDark(theme);
      root.classList.toggle('dark', isDark);
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', isDark ? '#09090b' : '#ffffff');
      }
      setResolvedDark(isDark);
    };

    applyTheme();
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignora indisponibilidade de localStorage
    }

    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'system') return resolvedDark ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  return { theme, isDark: resolvedDark, toggleTheme };
}
