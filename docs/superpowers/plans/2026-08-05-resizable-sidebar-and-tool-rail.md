# Resizable Sidebar and Vertical Tool Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar's overflowing horizontal tab bar with a vertical icon rail showing all seven tools at once, and make the sidebar drag-resizable with a persisted width and a collapsible content pane.

**Architecture:** Geometry rules (clamping, persistence, corrupt-data fallback) live in pure functions so they can be unit-tested without a DOM. A `useResizablePanel` hook wraps them as React state. Two new presentational components — `ToolRail` and `ResizeHandle` — are composed inside the existing `ControlsPanel`, which keeps owning `activeTab`. `App.tsx` is not touched.

**Tech Stack:** React 19, TypeScript ~5.8, Tailwind CSS 4.3.3, lucide-react, Vite 6. Vitest is added as the only new dev dependency.

## Global Constants

Copy these exact values; every task depends on them.

| Constant | Value |
|---|---|
| `RAIL_WIDTH` | `68` |
| `MIN_WIDTH` | `320` |
| `DEFAULT_WIDTH` | `384` |
| `COLLAPSED_WIDTH` | `68` (= `RAIL_WIDTH`) |
| `MIN_CANVAS_WIDTH` | `380` |
| `MAX_WIDTH_CAP` | `720` |
| `NUDGE_STEP` | `16` |
| `WIDTH_KEY` | `'striply:panelWidth'` |
| `COLLAPSED_KEY` | `'striply:panelCollapsed'` |

## Global Constraints

- Reuse the existing palette only: active `#FF6B6B` with white content, inactive text `#666666`, hover text `#2D2D2D` on `#E8E6DF`/50, panel surface `#FFFFFF`, rail surface `#FAF9F6`, borders `#E8E6DF`.
- The panel width must be applied as the CSS custom property `--panel-w` and consumed only at the `lg` breakpoint (`w-full lg:w-[var(--panel-w)]`). Never set `style.width` directly — that would break the mobile stacked layout.
- Do not modify `src/App.tsx`.
- Every `localStorage` access must be wrapped in try/catch and degrade to in-memory state.
- The desktop shell invariants fixed in commit `2b90b64` must keep passing: shell height == viewport, document does not scroll at `lg`, `main` bounded and scrollable, strip top reachable.
- The dev server is already running on port 3000 via `npm run dev`. Assume it is up; do not restart it.

---

### Task 1: Pure panel geometry and persistence

**Files:**
- Create: `src/hooks/panelWidth.ts`
- Create: `src/hooks/panelWidth.test.ts`
- Modify: `package.json` (add `vitest` dev dependency and `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `RAIL_WIDTH`, `MIN_WIDTH`, `DEFAULT_WIDTH`, `COLLAPSED_WIDTH`, `WIDTH_KEY`, `COLLAPSED_KEY`, `type PanelState = { width: number; isCollapsed: boolean }`, `type StorageLike`, `computeMaxWidth(viewportWidth: number): number`, `clampWidth(width: number, viewportWidth: number): number`, `readPanelState(storage: StorageLike | null, viewportWidth: number): PanelState`, `writePanelState(storage: StorageLike | null, state: PanelState): void`.

- [ ] **Step 1: Add the test runner**

```bash
npm install --save-dev vitest@^4.1.10
```

Vitest 4 declares `vite: ^6.0.0 || ^7.0.0 || ^8.0.0` and this project is on Vite 6.4.3, so no
peer conflict. No DOM environment is needed: the tests inject a fake storage object and never
touch `window`, so Vitest's default `node` environment is correct and `jsdom` is not installed.

Then add to the `"scripts"` block in `package.json`, after the `"lint"` entry:

```json
    "test": "vitest run"
```

- [ ] **Step 2: Write the failing test**

Create `src/hooks/panelWidth.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  WIDTH_KEY,
  COLLAPSED_KEY,
  computeMaxWidth,
  clampWidth,
  readPanelState,
  writePanelState,
  type StorageLike
} from './panelWidth';

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; }
  };
}

describe('computeMaxWidth', () => {
  it('caps at 720 on a wide viewport', () => {
    expect(computeMaxWidth(1440)).toBe(720);
  });

  it('leaves 380px for the canvas on a mid viewport', () => {
    expect(computeMaxWidth(900)).toBe(520);
  });

  it('never returns less than the minimum width', () => {
    expect(computeMaxWidth(400)).toBe(MIN_WIDTH);
  });
});

describe('clampWidth', () => {
  it('raises a too-small width to the minimum', () => {
    expect(clampWidth(100, 1440)).toBe(MIN_WIDTH);
  });

  it('lowers a too-large width to the viewport-derived maximum', () => {
    expect(clampWidth(9999, 1440)).toBe(720);
  });

  it('keeps an in-range width, rounded to whole pixels', () => {
    expect(clampWidth(432.6, 1440)).toBe(433);
  });

  it('falls back to the default when given a non-finite value', () => {
    expect(clampWidth(Number.NaN, 1440)).toBe(DEFAULT_WIDTH);
  });
});

describe('readPanelState', () => {
  it('returns defaults when there is no storage', () => {
    expect(readPanelState(null, 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });

  it('returns defaults when the keys are absent', () => {
    expect(readPanelState(fakeStorage(), 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });

  it('restores a stored width and collapsed flag', () => {
    const storage = fakeStorage({ [WIDTH_KEY]: '500', [COLLAPSED_KEY]: 'true' });
    expect(readPanelState(storage, 1440)).toEqual({ width: 500, isCollapsed: true });
  });

  it('re-clamps a stored width that no longer fits the viewport', () => {
    const storage = fakeStorage({ [WIDTH_KEY]: '700' });
    expect(readPanelState(storage, 900).width).toBe(520);
  });

  it('falls back to the default for a corrupt width', () => {
    expect(readPanelState(fakeStorage({ [WIDTH_KEY]: 'abc' }), 1440).width).toBe(DEFAULT_WIDTH);
  });

  it('falls back to the default for an empty width string', () => {
    expect(readPanelState(fakeStorage({ [WIDTH_KEY]: '' }), 1440).width).toBe(DEFAULT_WIDTH);
  });

  it('treats any non-"true" collapsed value as expanded', () => {
    expect(readPanelState(fakeStorage({ [COLLAPSED_KEY]: 'nope' }), 1440).isCollapsed).toBe(false);
  });

  it('returns defaults when storage access throws', () => {
    const hostile: StorageLike = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); }
    };
    expect(readPanelState(hostile, 1440)).toEqual({ width: DEFAULT_WIDTH, isCollapsed: false });
  });
});

describe('writePanelState', () => {
  it('writes both keys as strings', () => {
    const storage = fakeStorage();
    writePanelState(storage, { width: 512, isCollapsed: true });
    expect(storage.data[WIDTH_KEY]).toBe('512');
    expect(storage.data[COLLAPSED_KEY]).toBe('true');
  });

  it('does nothing when there is no storage', () => {
    expect(() => writePanelState(null, { width: 400, isCollapsed: false })).not.toThrow();
  });

  it('swallows storage errors so the panel still renders', () => {
    const hostile: StorageLike = {
      getItem: () => null,
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); })
    };
    expect(() => writePanelState(hostile, { width: 400, isCollapsed: false })).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./panelWidth"`, because the module does not exist yet.

- [ ] **Step 4: Write the implementation**

Create `src/hooks/panelWidth.ts`:

```ts
export const RAIL_WIDTH = 68;
export const MIN_WIDTH = 320;
export const DEFAULT_WIDTH = 384;
export const COLLAPSED_WIDTH = RAIL_WIDTH;

/** Never let the sidebar squeeze the canvas below this. */
export const MIN_CANVAS_WIDTH = 380;
/** Absolute ceiling regardless of how wide the display is. */
export const MAX_WIDTH_CAP = 720;

export const WIDTH_KEY = 'striply:panelWidth';
export const COLLAPSED_KEY = 'striply:panelCollapsed';

export interface PanelState {
  width: number;
  isCollapsed: boolean;
}

/** The subset of the Storage API used here, so tests can inject a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function computeMaxWidth(viewportWidth: number): number {
  const room = viewportWidth - MIN_CANVAS_WIDTH;
  // Math.max guards narrow viewports, where `room` could otherwise fall below
  // MIN_WIDTH and invert the clamp range.
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_CAP, room));
}

export function clampWidth(width: number, viewportWidth: number): number {
  if (!Number.isFinite(width)) return DEFAULT_WIDTH;
  const max = computeMaxWidth(viewportWidth);
  return Math.round(Math.min(max, Math.max(MIN_WIDTH, width)));
}

export function readPanelState(storage: StorageLike | null, viewportWidth: number): PanelState {
  const fallback: PanelState = { width: DEFAULT_WIDTH, isCollapsed: false };
  if (!storage) return fallback;
  try {
    const rawWidth = storage.getItem(WIDTH_KEY);
    const rawCollapsed = storage.getItem(COLLAPSED_KEY);
    // Number('') is 0, which would silently clamp to MIN_WIDTH, so reject blanks.
    const parsed = rawWidth === null || rawWidth.trim() === '' ? Number.NaN : Number(rawWidth);
    return {
      width: Number.isFinite(parsed) ? clampWidth(parsed, viewportWidth) : DEFAULT_WIDTH,
      isCollapsed: rawCollapsed === 'true'
    };
  } catch {
    return fallback;
  }
}

export function writePanelState(storage: StorageLike | null, state: PanelState): void {
  if (!storage) return;
  try {
    storage.setItem(WIDTH_KEY, String(state.width));
    storage.setItem(COLLAPSED_KEY, String(state.isCollapsed));
  } catch {
    // Private-mode browsers throw on write; in-memory state is a fine degradation.
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 18 tests across 4 suites.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0, no output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/hooks/panelWidth.ts src/hooks/panelWidth.test.ts
git commit -m "feat: add pure panel width geometry and persistence helpers"
```

---

### Task 2: useResizablePanel hook

**Files:**
- Create: `src/hooks/useResizablePanel.ts`

**Interfaces:**
- Consumes: everything exported by `src/hooks/panelWidth.ts` (Task 1).
- Produces: `useResizablePanel(): { width, isCollapsed, effectiveWidth, minWidth, maxWidth, setWidth, nudgeWidth, resetWidth, toggleCollapsed, expand }` where `width`, `effectiveWidth`, `minWidth` and `maxWidth` are `number`, `isCollapsed` is `boolean`, `setWidth` and `nudgeWidth` take a single `number`, and `resetWidth`, `toggleCollapsed`, `expand` take no arguments.

- [ ] **Step 1: Write the implementation**

Create `src/hooks/useResizablePanel.ts`:

```ts
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
    setState((prev) => ({ ...prev, width: DEFAULT_WIDTH }));
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0. The hook is not consumed yet, which is fine — it is not dead code for long, Task 5 wires it up.

- [ ] **Step 3: Confirm the unit tests still pass**

Run: `npm test`
Expected: PASS — still 18 tests.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useResizablePanel.ts
git commit -m "feat: add useResizablePanel hook with persisted width and collapse"
```

---

### Task 3: ToolRail component

**Files:**
- Create: `src/components/ToolRail.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `type ToolId = 'templates' | 'photos' | 'customize' | 'filters' | 'stickers' | 'captions' | 'export'`; `TOOL_TABS: { id: ToolId; label: string; icon: LucideIcon }[]`; `ToolRail(props: { activeTool: ToolId; isCollapsed: boolean; contentPanelId: string; onSelect: (id: ToolId) => void })`.

- [ ] **Step 1: Write the implementation**

Create `src/components/ToolRail.tsx`. The seven entries and their icons are copied verbatim from the tab bar being replaced, so the tools and their order do not change:

```tsx
import React from 'react';
import {
  Layers,
  Upload,
  Palette,
  Sliders,
  Sticker,
  Type,
  Download,
  type LucideIcon
} from 'lucide-react';

export type ToolId =
  | 'templates'
  | 'photos'
  | 'customize'
  | 'filters'
  | 'stickers'
  | 'captions'
  | 'export';

export const TOOL_TABS: { id: ToolId; label: string; icon: LucideIcon }[] = [
  { id: 'templates', label: 'Styles', icon: Layers },
  { id: 'photos', label: 'Photos', icon: Upload },
  { id: 'customize', label: 'Design', icon: Palette },
  { id: 'filters', label: 'Filters', icon: Sliders },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'captions', label: 'Captions', icon: Type },
  { id: 'export', label: 'Export', icon: Download }
];

interface ToolRailProps {
  activeTool: ToolId;
  isCollapsed: boolean;
  contentPanelId: string;
  onSelect: (id: ToolId) => void;
}

export function ToolRail({ activeTool, isCollapsed, contentPanelId, onSelect }: ToolRailProps) {
  const railRef = React.useRef<HTMLDivElement | null>(null);

  const focusTabAt = (index: number) => {
    const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TOOL_TABS.length - 1;
    let next: number | null = null;

    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    onSelect(TOOL_TABS[next].id);
    focusTabAt(next);
  };

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-orientation="vertical"
      aria-label="Editing tools"
      className="w-[68px] shrink-0 bg-[#FAF9F6] border-r border-[#E8E6DF] flex flex-col gap-1 p-1.5 overflow-y-auto no-scrollbar"
    >
      {TOOL_TABS.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = tool.id === activeTool;
        return (
          <button
            key={tool.id}
            id={`tool-tab-${tool.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={contentPanelId}
            aria-expanded={isActive ? !isCollapsed : undefined}
            tabIndex={isActive ? 0 : -1}
            title={tool.label}
            onClick={() => onSelect(tool.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] ${
              isActive
                ? 'bg-[#FF6B6B] text-white shadow-md'
                : 'text-[#666666] hover:text-[#2D2D2D] hover:bg-[#E8E6DF]/50'
            }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="text-[9.5px] font-semibold leading-none tracking-tight">
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToolRail.tsx
git commit -m "feat: add vertical tool rail with always-visible labels"
```

---

### Task 4: ResizeHandle component

**Files:**
- Create: `src/components/ResizeHandle.tsx`

**Interfaces:**
- Consumes: `NUDGE_STEP` is defined locally here, not imported.
- Produces: `ResizeHandle(props: { width: number; minWidth: number; maxWidth: number; onResize: (px: number) => void; onNudge: (delta: number) => void; onReset: () => void })`.

- [ ] **Step 1: Write the implementation**

Create `src/components/ResizeHandle.tsx`:

```tsx
import React from 'react';

const NUDGE_STEP = 16;

interface ResizeHandleProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (px: number) => void;
  onNudge: (delta: number) => void;
  onReset: () => void;
}

export function ResizeHandle({
  width,
  minWidth,
  maxWidth,
  onResize,
  onNudge,
  onReset
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  // Pointer capture keeps the drag alive once the cursor leaves the 11px hit area.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // The panel is right-anchored, so dragging left widens it.
    onResize(window.innerWidth - event.clientX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (!isDragging) return;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onNudge(NUDGE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNudge(-NUDGE_STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onResize(minWidth);
    } else if (event.key === 'End') {
      event.preventDefault();
      onResize(maxWidth);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize controls sidebar"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      title="Drag to resize. Double-click to reset."
      className="hidden lg:block absolute left-0 top-0 h-full w-[11px] -translate-x-1/2 z-30 cursor-col-resize group touch-none focus-visible:outline-none"
    >
      <div
        className={`mx-auto h-full w-[5px] rounded-full transition-colors ${
          isDragging
            ? 'bg-[#FF6B6B]'
            : 'bg-transparent group-hover:bg-[#FF6B6B]/40 group-focus-visible:bg-[#FF6B6B]'
        }`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ResizeHandle.tsx
git commit -m "feat: add keyboard-accessible sidebar resize handle"
```

---

### Task 5: Wire the rail, handle and collapse into ControlsPanel

**Files:**
- Modify: `src/components/ControlsPanel.tsx` — the `activeTab` declaration at lines 103-105, the icon import list, the root element and tab bar at lines 242-275

**Interfaces:**
- Consumes: `useResizablePanel` (Task 2); `ToolRail`, `TOOL_TABS`, `ToolId` (Task 3); `ResizeHandle` (Task 4).
- Produces: no new exports. `ControlsPanel`'s props are unchanged, so `App.tsx` needs no edit.

- [ ] **Step 1: Add the imports**

Add these three imports below the existing `lucide-react` import block in `src/components/ControlsPanel.tsx`:

```tsx
import { useResizablePanel } from '../hooks/useResizablePanel';
import { ToolRail, type ToolId } from './ToolRail';
import { ResizeHandle } from './ResizeHandle';
```

`Layers`, `Upload`, `Palette`, `Sliders`, `Sticker`, `Type` and `Download` are still imported from `lucide-react` and still used by content sections, so leave the icon import list alone.

- [ ] **Step 2: Retype activeTab and add panel state**

Replace lines 103-105:

```tsx
  const [activeTab, setActiveTab] = useState<
    'photos' | 'templates' | 'customize' | 'filters' | 'stickers' | 'captions' | 'export'
  >('templates');
```

with:

```tsx
  const [activeTab, setActiveTab] = useState<ToolId>('templates');

  const {
    width,
    isCollapsed,
    effectiveWidth,
    minWidth,
    maxWidth,
    setWidth,
    nudgeWidth,
    resetWidth,
    toggleCollapsed,
    expand
  } = useResizablePanel();

  const contentPanelId = 'controls-panel-content';

  // Clicking the active tool collapses the pane; any other tool selects and reopens it.
  const handleSelectTool = (id: ToolId) => {
    if (id === activeTab) {
      toggleCollapsed();
      return;
    }
    setActiveTab(id);
    expand();
  };
```

- [ ] **Step 3: Replace the root element and delete the horizontal tab bar**

Replace this block, which spans from line 242 (the root `<div>`) through line 275 (the opening of the content body):

```tsx
    <div className="bg-white border-l border-[#E8E6DF] text-[#2D2D2D] w-full lg:w-80 xl:w-96 flex flex-col h-full overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="flex items-center overflow-x-auto no-scrollbar border-b border-[#E8E6DF] p-2 gap-1 bg-[#FAF9F6]">
        {[
          { id: 'templates', label: 'Styles', icon: Layers },
          { id: 'photos', label: 'Photos', icon: Upload },
          { id: 'customize', label: 'Design', icon: Palette },
          { id: 'filters', label: 'Filters', icon: Sliders },
          { id: 'stickers', label: 'Stickers', icon: Sticker },
          { id: 'captions', label: 'Captions', icon: Type },
          { id: 'export', label: 'Export', icon: Download }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#FF6B6B] text-white shadow-md'
                  : 'text-[#666666] hover:text-[#2D2D2D] hover:bg-[#E8E6DF]/50'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
```

with:

```tsx
    <div
      style={{ '--panel-w': `${effectiveWidth}px` } as React.CSSProperties}
      className="relative bg-white border-l border-[#E8E6DF] text-[#2D2D2D] w-full lg:w-[var(--panel-w)] shrink-0 flex h-full overflow-hidden"
    >
      <ResizeHandle
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onResize={setWidth}
        onNudge={nudgeWidth}
        onReset={resetWidth}
      />

      <ToolRail
        activeTool={activeTab}
        isCollapsed={isCollapsed}
        contentPanelId={contentPanelId}
        onSelect={handleSelectTool}
      />

      {/* Tab Content Body */}
      <div
        id={contentPanelId}
        role="tabpanel"
        aria-labelledby={`tool-tab-${activeTab}`}
        hidden={isCollapsed}
        className="flex-1 min-w-0 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs"
      >
```

Note three deliberate details: the root changes from `flex flex-col` to `flex` (a row); `shrink-0` stops the flex parent squeezing the panel below its width; and `min-w-0` lets the content pane shrink rather than forcing the panel wider than `--panel-w`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit code 0. If it reports the `Layers`/`Upload`/etc. imports as unused, that means a content section stopped using one — delete only the genuinely unused names from the `lucide-react` import list.

- [ ] **Step 5: Verify all seven tools are visible with no overflow**

With the dev server on port 3000 and the browser viewport at 1440x900, run this in the page:

```js
(() => {
  const rail = document.querySelector('[role="tablist"][aria-orientation="vertical"]');
  const tabs = [...rail.querySelectorAll('[role="tab"]')];
  const railRect = rail.getBoundingClientRect();
  const clipped = tabs.filter(t => {
    const r = t.getBoundingClientRect();
    return r.top < railRect.top - 1 || r.bottom > railRect.bottom + 1;
  });
  return {
    toolCount: tabs.length,
    labels: tabs.map(t => t.innerText.trim()),
    railWidth: Math.round(railRect.width),
    verticalOverflowPx: rail.scrollHeight - rail.clientHeight,
    clipped: clipped.map(t => t.innerText.trim()),
    pass: tabs.length === 7 && clipped.length === 0 && rail.scrollHeight <= rail.clientHeight
  };
})()
```

Expected: `pass: true`, `toolCount: 7`, all seven labels listed, `clipped: []`, `verticalOverflowPx: 0`.

- [ ] **Step 6: Verify drag, clamps, collapse and keyboard**

Run this in the page:

```js
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const panel = document.querySelector('main').parentElement.lastElementChild;
  const handle = panel.querySelector('[role="separator"]');
  const w = () => Math.round(panel.getBoundingClientRect().width);

  const drag = async (toClientX) => {
    const r = handle.getBoundingClientRect();
    const opts = { pointerId: 1, bubbles: true, clientY: r.top + r.height / 2 };
    handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: r.left + 5 }));
    await sleep(50);
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: toClientX }));
    await sleep(50);
    handle.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: toClientX }));
    await sleep(150);
  };

  const results = {};
  await drag(innerWidth - 520);           results.dragTo520 = w();
  await drag(innerWidth - 5000);          results.clampedAtMax = w();
  await drag(innerWidth - 50);            results.clampedAtMin = w();
  await drag(innerWidth - 384);           results.backToDefault = w();

  // keyboard
  handle.focus();
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  await sleep(150); results.afterArrowLeft = w();
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await sleep(150); results.afterArrowRight = w();

  // collapse via the active tool icon
  const activeTab = panel.querySelector('[role="tab"][aria-selected="true"]');
  activeTab.click(); await sleep(200);
  results.collapsedWidth = w();
  results.contentHiddenWhenCollapsed = !!panel.querySelector('[role="tabpanel"]')?.hidden;
  activeTab.click(); await sleep(200);
  results.reopenedWidth = w();

  results.pass =
    results.clampedAtMax === 720 &&
    results.clampedAtMin === 320 &&
    results.collapsedWidth === 68 &&
    results.contentHiddenWhenCollapsed === true &&
    results.afterArrowLeft === results.backToDefault + 16 &&
    results.afterArrowRight === results.backToDefault &&
    results.reopenedWidth === results.backToDefault;
  return results;
})()
```

Expected: `pass: true`, with `clampedAtMax: 720`, `clampedAtMin: 320`, `collapsedWidth: 68`, `contentHiddenWhenCollapsed: true`.

- [ ] **Step 7: Verify the width persists across a reload**

Drag or nudge the panel to a non-default width, then reload the page and run:

```js
(() => {
  const panel = document.querySelector('main').parentElement.lastElementChild;
  return {
    storedWidth: localStorage.getItem('striply:panelWidth'),
    storedCollapsed: localStorage.getItem('striply:panelCollapsed'),
    renderedWidth: Math.round(panel.getBoundingClientRect().width),
    pass: Math.round(panel.getBoundingClientRect().width) === Number(localStorage.getItem('striply:panelWidth'))
  };
})()
```

Expected: `pass: true` — the rendered width equals the stored width.

Then confirm the corrupt-data fallback in the live app:

```js
localStorage.setItem('striply:panelWidth', 'garbage'); location.reload();
```

After the reload, the panel must render at 384px rather than throwing.

- [ ] **Step 8: Commit**

```bash
git add src/components/ControlsPanel.tsx
git commit -m "feat: replace sidebar tab bar with resizable rail and collapsible pane"
```

---

### Task 6: Define the missing scrollbar utilities and run full regression

**Files:**
- Modify: `src/index.css` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: the `.no-scrollbar` and `.custom-scrollbar` CSS classes that `ControlsPanel` and `ToolRail` already reference.

- [ ] **Step 1: Append the utility definitions**

`no-scrollbar` and `custom-scrollbar` are referenced in `ControlsPanel` (and now `ToolRail`) but defined nowhere, so they currently do nothing. Append to `src/index.css`:

```css
/* Used by the tool rail and the horizontal category strips inside the panel. */
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Used by the controls panel content pane. */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d8d4cb transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d8d4cb;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #bdb8ac;
}
```

- [ ] **Step 2: Verify the utilities actually apply**

Run in the page:

```js
(() => {
  const rail = document.querySelector('[role="tablist"][aria-orientation="vertical"]');
  const content = document.querySelector('[role="tabpanel"]');
  return {
    railScrollbarWidth: getComputedStyle(rail).scrollbarWidth,
    contentScrollbarWidth: getComputedStyle(content).scrollbarWidth,
    pass: getComputedStyle(rail).scrollbarWidth === 'none'
       && getComputedStyle(content).scrollbarWidth === 'thin'
  };
})()
```

Expected: `pass: true`.

- [ ] **Step 3: Re-run the shell invariants at three viewports**

For each of 1440x900, 1024x600 and 390x844, resize the viewport and run:

```js
(() => {
  const main = document.querySelector('main');
  const row = main.parentElement, shell = row.parentElement;
  const strip = main.querySelector('.py-8').firstElementChild;
  const r = el => el.getBoundingClientRect();
  const isDesktop = innerWidth >= 1024;
  const f = [];
  const a = (n, c, d) => { if (!c) f.push(n + ' — ' + d); };

  a('no-horizontal-overflow', document.documentElement.scrollWidth <= innerWidth + 1,
    `scrollWidth ${document.documentElement.scrollWidth} > ${innerWidth}`);
  a('strip-rendered', Math.round(r(strip).height) > 100, `strip height ${Math.round(r(strip).height)}`);

  if (isDesktop) {
    a('shell-fits-viewport', Math.round(r(shell).height) <= innerHeight + 1,
      `shell ${Math.round(r(shell).height)} vs ${innerHeight}`);
    a('document-does-not-scroll', document.documentElement.scrollHeight <= innerHeight + 1,
      `doc ${document.documentElement.scrollHeight} > ${innerHeight}`);
    a('main-bounded', Math.round(r(main).height) <= innerHeight + 1,
      `main ${Math.round(r(main).height)} vs ${innerHeight}`);
    main.scrollTop = 0;
    a('strip-top-reachable', Math.round(r(strip).top) >= Math.round(r(main).top) - 1,
      `strip top ${Math.round(r(strip).top)} vs main top ${Math.round(r(main).top)}`);
  } else {
    a('document-scrolls-on-mobile', document.documentElement.scrollHeight > innerHeight,
      `doc ${document.documentElement.scrollHeight} <= ${innerHeight}`);
    a('panel-full-width-on-mobile', Math.round(r(row.lastElementChild).width) >= innerWidth - 1,
      `panel ${Math.round(r(row.lastElementChild).width)} vs ${innerWidth}`);
  }
  return { viewport: [innerWidth, innerHeight], pass: f.length === 0, failures: f };
})()
```

Expected: `pass: true` at all three viewports. The mobile case specifically proves `--panel-w` did not leak below `lg`.

- [ ] **Step 4: Run the unit tests, typecheck and production build**

```bash
npm test && npx tsc --noEmit && npm run build
```

Expected: 18 tests pass, typecheck exits 0, build succeeds with no `import.meta` warning (only the pre-existing >500kB chunk note).

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "fix: define the no-scrollbar and custom-scrollbar utilities"
```

---

### Task 7: Wrap the category chip strips instead of scrolling them

**Files:**
- Modify: `src/components/ControlsPanel.tsx:287` (template category pills)
- Modify: `src/components/ControlsPanel.tsx:841` (sticker category pills)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Presentation-only change.

The tool tab bar was not the only strip hiding content. Measured at a 384px panel:

| Strip | Needs | Gets | Hidden | Off-screen chips |
|---|---|---|---|---|
| Template categories | 820px | 343px | **477px** | Photobooth & Studio, Romance & Events, Music & Tech, Vintage & Film |
| Sticker categories | 517px | 343px | **174px** | Tape, Doodles |

Both are `overflow-x-auto no-scrollbar`, so — exactly like the tab bar — there is no scrollbar hinting that more exists. These are chips, not tabs, so wrapping is the natural fix: every option is visible at once, and rows re-flow automatically as the user widens the now-resizable panel.

- [ ] **Step 1: Wrap the template category pills**

At `src/components/ControlsPanel.tsx:287`, replace:

```tsx
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
```

with:

```tsx
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
```

- [ ] **Step 2: Wrap the sticker category pills**

At `src/components/ControlsPanel.tsx:841`, replace:

```tsx
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
```

with:

```tsx
            <div className="flex flex-wrap items-center gap-1 pb-1">
```

Leave the `whitespace-nowrap` on the individual chip buttons: it keeps each label on one line while the container wraps between chips.

- [ ] **Step 3: Verify no strip in the panel hides anything**

Visit each tool in turn and assert that no horizontally-scrolling strip remains anywhere in the panel:

```js
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const panel = document.querySelector('main').parentElement.lastElementChild;
  const tabs = [...panel.querySelectorAll('[role="tab"]')];
  const offenders = [];
  for (const tab of tabs) {
    tab.click();
    await sleep(350);
    [...panel.querySelectorAll('div')].forEach(d => {
      if (d.scrollWidth > d.clientWidth + 1) {
        const chips = [...d.querySelectorAll('button')];
        offenders.push({
          tool: tab.innerText.trim(),
          hiddenPx: d.scrollWidth - d.clientWidth,
          chips: chips.map(c => c.innerText.trim().replace(/\s+/g, ' '))
        });
      }
    });
  }
  return { pass: offenders.length === 0, offenders };
})()
```

Expected: `pass: true`, `offenders: []`.

- [ ] **Step 4: Confirm the chips re-flow when the panel is resized**

Select the Styles tool, then run:

```js
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const panel = document.querySelector('main').parentElement.lastElementChild;
  const handle = panel.querySelector('[role="separator"]');
  const rows = () => {
    const strip = [...panel.querySelectorAll('div')]
      .find(d => [...d.querySelectorAll('button')].some(b => b.innerText.includes('All Templates')));
    const tops = new Set([...strip.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().top)));
    return { rowCount: tops.size, stripHiddenPx: strip.scrollWidth - strip.clientWidth };
  };
  handle.focus();
  const narrow = rows();
  for (let i = 0; i < 12; i++) { // widen toward the 720px clamp
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await sleep(60);
  }
  await sleep(250);
  const wide = rows();
  return {
    narrow, wide,
    pass: narrow.stripHiddenPx === 0 && wide.stripHiddenPx === 0 && wide.rowCount <= narrow.rowCount
  };
})()
```

Expected: `pass: true` — nothing hidden at either width, and widening the panel uses the same number of rows or fewer.

- [ ] **Step 5: Commit**

```bash
git add src/components/ControlsPanel.tsx
git commit -m "fix: wrap category chip strips so no options are hidden off-screen"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Layout, handle not a flex item | Task 4 (absolute positioning), Task 5 Step 3 |
| `RAIL_WIDTH`/`MIN`/`MAX`/`DEFAULT`/`COLLAPSED` constants | Task 1 Step 4 |
| `MAX_WIDTH` recomputed on window resize and re-clamped | Task 1 (`computeMaxWidth`), Task 2 (resize listener) |
| `useResizablePanel` interface | Task 2 |
| localStorage keys, try/catch degradation | Task 1 Steps 2 and 4 |
| `ResizeHandle` pointer capture, `select-none`, hidden below `lg` | Task 4 |
| `ToolRail`, `TOOL_TABS`, `ToolId`, icon + 9.5px label, palette | Task 3 |
| `ControlsPanel` drops tab bar, keeps `activeTab`, CSS-variable width | Task 5 |
| Content pane not shown when collapsed | Task 5 Step 3 (`hidden={isCollapsed}`) |
| `App.tsx` untouched | No task modifies it |
| Collapse on active-icon click, persisted | Task 5 Step 2 (`handleSelectTool`), Task 2 |
| tablist/tab/tabpanel roles, arrow + Home/End navigation | Task 3 |
| separator role, aria-valuenow/min/max, 16px nudge, Home/End, double-click reset | Task 4 |
| `custom-scrollbar` and `no-scrollbar` defined | Task 6 |
| Verification: overflow, drag, persistence, collapse, keyboard, regression | Task 5 Steps 5-7, Task 6 Steps 2-4 |
| Category chip strips hide options off-screen (added after the spec was written) | Task 7 |

No gaps. Task 7 covers a defect found while measuring, not present in the original spec: the
template and sticker category strips hide 477px and 174px of chips respectively. It is the same
root cause as the tab bar — a `no-scrollbar` horizontal overflow container — so it belongs with
this work rather than in a separate change.

**Placeholder scan:** No TBD/TODO, no "add error handling" hand-waving, no "similar to Task N". Every code step contains complete code and every command has an expected result.

**Type consistency:** `ToolId` is defined once in Task 3 and imported by Task 5. `contentPanelId` is the prop name in both Task 3's interface and Task 5's usage. `setWidth`/`nudgeWidth`/`resetWidth`/`toggleCollapsed`/`expand` are named identically in Task 2's return object, Task 4's props (`onResize`/`onNudge`/`onReset` mapped explicitly) and Task 5's destructuring. Rail button ids are `tool-tab-${id}` in Task 3 and referenced as `aria-labelledby={`tool-tab-${activeTab}`}` in Task 5.

**Deliberate deviation from the spec:** the spec said the collapsed content pane would not be rendered; the plan uses `hidden={isCollapsed}` instead. This keeps `aria-controls` pointing at a real element (an `aria-controls` target that does not exist is an accessibility bug) while still hiding the pane from layout and the accessibility tree. Scroll position resetting was the spec's stated reason for unmounting, which is a minor nicety not worth a dangling `aria-controls`.
