import { useEffect, useState } from 'react';

export function useColorMode() {
  const [mode, setMode] = useState(() => document.documentElement.dataset.themePreference || 'auto');

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      const resolved = mode === 'auto' ? (system.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.bsTheme = resolved;
      document.documentElement.dataset.themePreference = mode;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#18181b' : '#ffffff');
    }
    apply();
    if (mode === 'auto') system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [mode]);

  function changeMode(value) {
    if (!['auto', 'light', 'dark'].includes(value)) return;
    setMode(value);
    try {
      localStorage.setItem('favorit-parts-theme', value);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }

  return [mode, changeMode];
}
