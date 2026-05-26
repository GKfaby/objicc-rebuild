import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ColorMode, A11yMode, FontSize, AppTheme } from '../types';

interface ThemeContextType {
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  isDark: boolean;
  a11yMode: A11yMode;
  setA11yMode: (m: A11yMode) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  narration: boolean;
  setNarration: (v: boolean) => void;
  appTheme: AppTheme;
  setAppTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  colorMode: 'objicc-color-mode',
  a11y: 'objicc-a11y',
  fontSize: 'objicc-font-size',
  narration: 'objicc-narration',
  appTheme: 'objicc-app-theme',
};

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '14px', md: '16px', lg: '18px', xl: '20px',
};

const A11Y_FILTER_MAP: Record<A11yMode, string> = {
  normal: '',
  deuteranopia: 'url(#deuteranopia)',
  protanopia: 'url(#protanopia)',
  tritanopia: 'url(#tritanopia)',
  'high-contrast': '',
};

// SVG colour-blind filters injected into the DOM
const A11Y_SVG_FILTERS = `
<svg id="objicc-a11y-filters" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">
  <defs>
    <filter id="deuteranopia">
      <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="protanopia">
      <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="tritanopia">
      <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"/>
    </filter>
  </defs>
</svg>
`;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorMode, setColorModeState] = useState<ColorMode>(
    () => (localStorage.getItem(STORAGE_KEYS.colorMode) as ColorMode) || 'system'
  );
  const [a11yMode, setA11yModeState] = useState<A11yMode>(
    () => (localStorage.getItem(STORAGE_KEYS.a11y) as A11yMode) || 'normal'
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem(STORAGE_KEYS.fontSize) as FontSize) || 'md'
  );
  const [narration, setNarrationState] = useState(
    () => localStorage.getItem(STORAGE_KEYS.narration) === 'true'
  );
  const [appTheme, setAppThemeState] = useState<AppTheme>(
    () => (localStorage.getItem(STORAGE_KEYS.appTheme) as AppTheme) || 'default'
  );
  const [isDark, setIsDark] = useState(false);

  // Inject SVG filters once
  useEffect(() => {
    if (!document.getElementById('objicc-a11y-filters')) {
      document.body.insertAdjacentHTML('afterbegin', A11Y_SVG_FILTERS);
    }
  }, []);

  // Apply colour mode
  useEffect(() => {
    const apply = (dark: boolean) => {
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };
    if (colorMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    } else {
      apply(colorMode === 'dark');
    }
  }, [colorMode]);

  // Apply accessibility filter
  useEffect(() => {
    const root = document.documentElement;
    const filter = A11Y_FILTER_MAP[a11yMode];
    root.style.filter = filter || '';
    root.classList.toggle('high-contrast', a11yMode === 'high-contrast');
  }, [a11yMode]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
  }, [fontSize]);

  // Apply app theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  const setColorMode = (m: ColorMode) => {
    localStorage.setItem(STORAGE_KEYS.colorMode, m);
    setColorModeState(m);
  };
  const setA11yMode = (m: A11yMode) => {
    localStorage.setItem(STORAGE_KEYS.a11y, m);
    setA11yModeState(m);
  };
  const setFontSize = (s: FontSize) => {
    localStorage.setItem(STORAGE_KEYS.fontSize, s);
    setFontSizeState(s);
  };
  const setNarration = (v: boolean) => {
    localStorage.setItem(STORAGE_KEYS.narration, String(v));
    setNarrationState(v);
  };
  const setAppTheme = (t: AppTheme) => {
    localStorage.setItem(STORAGE_KEYS.appTheme, t);
    setAppThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{
      colorMode, setColorMode, isDark,
      a11yMode, setA11yMode,
      fontSize, setFontSize,
      narration, setNarration,
      appTheme, setAppTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
