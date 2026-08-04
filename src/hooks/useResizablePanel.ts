import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COLLAPSED_WIDTH,
  DEFAULT_WIDTH,
  MIN_WIDTH,
  clampWidth,
  computeMaxWidth,
  readPanelState,
  writePanelState,
  type PanelState,
  type StorageLike
} from './panelWidth';

const SSR_FALLBACK_VIEWPORT = 1440;

function getStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function getViewportWidth(): number {
  return typeof window === 'undefined' ? SSR_FALLBACK_VIEWPORT : window.innerWidth;
}

export function useResizablePanel() {
  const [viewportWidth, setViewportWidth] = useState<number>(getViewportWidth);
  const [state, setState] = useState<PanelState>(() =>
    readPanelState(getStorage(), getViewportWidth())
  );

  useEffect(() => {
    writePanelState(getStorage(), state);
  }, [state]);

  // A width saved on a wide monitor must not squeeze the canvas on a narrow one.
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      setViewportWidth(vw);
      setState((prev) => {
        const next = clampWidth(prev.width, vw);
        return next === prev.width ? prev : { ...prev, width: next };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxWidth = useMemo(() => computeMaxWidth(viewportWidth), [viewportWidth]);

  const setWidth = useCallback((px: number) => {
    setState((prev) => ({ ...prev, width: clampWidth(px, getViewportWidth()) }));
  }, []);

  const nudgeWidth = useCallback((delta: number) => {
    setState((prev) => ({ ...prev, width: clampWidth(prev.width + delta, getViewportWidth()) }));
  }, []);

  const resetWidth = useCallback(() => {
    setState((prev) => ({ ...prev, width: clampWidth(DEFAULT_WIDTH, getViewportWidth()) }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  const expand = useCallback(() => {
    setState((prev) => (prev.isCollapsed ? { ...prev, isCollapsed: false } : prev));
  }, []);

  return {
    width: state.width,
    isCollapsed: state.isCollapsed,
    effectiveWidth: state.isCollapsed ? COLLAPSED_WIDTH : state.width,
    minWidth: MIN_WIDTH,
    maxWidth,
    setWidth,
    nudgeWidth,
    resetWidth,
    toggleCollapsed,
    expand
  };
}
