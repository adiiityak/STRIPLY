# Resizable sidebar and vertical tool rail

**Date:** 2026-08-05
**Status:** Approved

## Problem

The controls sidebar has seven tools — Styles, Photos, Design, Filters, Stickers, Captions,
Export — laid out in a horizontal tab bar inside a 320–384px panel. Measured at a 1280px
viewport, the bar needs 644px but gets 383px: **261px of tabs are off-screen**, and the
`no-scrollbar` class suppresses the only affordance. Stickers, Captions and Export are
effectively undiscoverable.

Widening the panel is not a fix on its own: fitting all seven tabs in one row needs a 644px
sidebar, which claims half the canvas on a 1280px screen.

Separately, the panel is a fixed width, so users cannot trade canvas space against controls
space to suit the strip they are editing.

## Goals

1. All seven tools visible and identifiable at once, at every panel width.
2. The user can drag the sidebar wider or narrower, and that choice survives a reload.
3. The user can collapse the controls to reclaim the canvas.
4. No regression to the mobile stacked layout or to the desktop shell invariants fixed in
   commit `2b90b64`.

## Non-goals

- Reordering or re-grouping the tools themselves. The seven stay as they are.
- Making the canvas area resizable independently; it simply takes the remaining space.
- Touch-drag resizing on mobile. Below `lg` the panel is full-width and stacked, so there is
  nothing to resize.

## Layout

The panel becomes a two-part flex row — rail then content — with the drag handle absolutely
positioned on the panel's leading edge. The rail sits on the panel's inner edge, against the
canvas:

```
 canvas          ┊ rail │ content
 (flex-1)        ┊ 68px │ (flex-1)
                 ↑
                 handle: absolutely positioned, straddles the boundary,
                 consumes no layout width
```

The handle is deliberately **not** a flex item. A 5px flex child would eat into the content
width and make the width arithmetic below inconsistent; overlaying it keeps
`MIN_WIDTH = RAIL_WIDTH + content` exact. It renders a 5px visible track inside an ~11px hit
area centred on the panel edge, so it is easy to grab from either side.

Dragging leftward widens the panel: `width = window.innerWidth - event.clientX`.

| Constant | Value | Reasoning |
|---|---|---|
| `RAIL_WIDTH` | 68px | Fits an 18px icon above a 9.5px label; "Captions" is the longest at ~40px |
| `MIN_WIDTH` | 320px | 68 rail + 252 content — the narrowest that keeps template cards readable |
| `MAX_WIDTH` | `min(720, innerWidth - 380)` | Guarantees the canvas keeps ≥380px, so the 280px strip plus padding always fits |
| `DEFAULT_WIDTH` | 384px | Matches today's `xl:w-96`, so nothing shifts for a first-time user |
| `COLLAPSED_WIDTH` | 68px | Rail only |

`MAX_WIDTH` is recomputed on window resize, and the stored width is re-clamped against it, so
a width saved on a wide monitor cannot squeeze the canvas on a narrow one.

## Modules

`ControlsPanel.tsx` is already 1581 lines. This work goes into focused units rather than
growing it further.

### `src/hooks/useResizablePanel.ts`

Owns all panel geometry state. Nothing else knows about clamping or storage.

```ts
function useResizablePanel(): {
  width: number;          // current expanded width, always within [MIN, MAX]
  isCollapsed: boolean;
  effectiveWidth: number; // COLLAPSED_WIDTH when collapsed, else width
  setWidth: (px: number) => void;   // clamps internally
  nudgeWidth: (deltaPx: number) => void;
  resetWidth: () => void;           // back to DEFAULT_WIDTH
  toggleCollapsed: () => void;
  maxWidth: number;                 // exposed for aria-valuemax
}
```

- Reads initial state from `localStorage` on mount, falling back to defaults when a key is
  absent, unparseable, or out of range.
- Writes `striply:panelWidth` and `striply:panelCollapsed` on change.
- All `localStorage` access is wrapped in try/catch: a `SecurityError` in private-mode
  browsers must degrade to in-memory state, not crash the panel.

### `src/components/ResizeHandle.tsx`

A presentational drag affordance. Takes `{ width, minWidth, maxWidth, onResize, onNudge,
onReset }` and owns no geometry of its own.

- Absolutely positioned on the panel's leading edge, consuming no layout width. 5px visible
  track inside an ~11px hit area straddling the edge; `cursor-col-resize`.
- Pointer drag via `setPointerCapture` so the drag survives the cursor leaving the element.
- Adds `select-none` to the document during drag to stop text selection.
- Hidden below `lg`.

### `src/components/ToolRail.tsx`

The vertical rail, plus the shared tool definitions so the rail and the content pane cannot
disagree about what exists:

```ts
export type ToolId = 'templates' | 'photos' | 'customize' | 'filters'
                   | 'stickers' | 'captions' | 'export';
export const TOOL_TABS: { id: ToolId; label: string; icon: LucideIcon }[]
```

Each item renders an 18px icon above a 9.5px label. Active uses the existing `#FF6B6B` fill
with white content; inactive is `#666666` over a transparent surface with an `#E8E6DF`/50
hover tint — the same palette the current tab bar uses, so the panel's look is unchanged
apart from the orientation.

### `ControlsPanel.tsx` (modified)

- Deletes the horizontal tab bar.
- Becomes `relative` so the absolutely-positioned handle anchors to it, then renders
  `<ResizeHandle/>`, `<ToolRail/>`, and its existing content pane.
- Keeps its `activeTab` state, retyped to `ToolId`; this stays the single source of truth that
  both the rail and the content read.
- Applies the width as a CSS custom property rather than a hard `style.width`:
  `style={{ '--panel-w': effectiveWidth + 'px' }}` with
  `className="w-full lg:w-[var(--panel-w)]"`.
  Because the variable is only consumed at `lg`, the mobile full-width stacked layout is
  untouched with no JS media query anywhere.
- Content pane is not rendered when collapsed, so its scroll position resets cleanly and the
  DOM stays small.

`App.tsx` needs no changes.

## Collapse behaviour

Clicking the **active** tool's icon collapses the content pane, leaving the 68px rail.
Clicking **any** icon while collapsed reopens the pane and selects that tool. The state
persists. The active rail button carries `aria-expanded` to describe this.

## Accessibility

- Rail is a `role="tablist"` with `aria-orientation="vertical"`; each button is a `role="tab"`
  with `aria-selected` and `aria-controls` pointing at the content pane, which is a
  `role="tabpanel"`.
- Up/Down arrows move between tools and wrap at the ends; Home/End jump to first/last.
- Handle is a focusable `role="separator"` with `aria-orientation="vertical"` and
  `aria-valuenow` / `aria-valuemin` / `aria-valuemax`, plus an `aria-label` naming it as the
  sidebar width control.
- Left/Right arrows resize by 16px; Home/End jump to min/max; double-click resets to 384px.
- Focus-visible rings on both, consistent with existing controls.

## Incidental fix

`no-scrollbar` and `custom-scrollbar` are referenced in `ControlsPanel` but defined nowhere in
`src/index.css` — they are dead classes today. macOS overlay scrollbars hide the effect, but
on Windows and Linux the panel shows unstyled scrollbars. Removing the horizontal tab bar
retires `no-scrollbar`; `custom-scrollbar` gets a real definition in `index.css` for the
content pane.

## Verification

The repo has no test framework, so verification uses the browser-assertion harness that
diagnosed the layout bug in `2b90b64`: measure the real DOM and assert invariants.

1. **No overflow** — rail `scrollHeight === clientHeight`; all seven items report
   `fullyVisible`, at 320px, 384px and 720px panel widths.
2. **Drag** — simulated pointer drag widens and narrows the panel; verify it stops exactly at
   `MIN_WIDTH` and at `MAX_WIDTH` and never lets the canvas fall below 380px.
3. **Persistence** — set a non-default width, reload, assert the width is restored; corrupt
   the stored value and assert it falls back to 384px rather than throwing.
4. **Collapse** — collapse, assert panel width is 68px and the content pane is absent; reopen
   and assert the previous width returns; verify it survives a reload.
5. **Keyboard** — focus the handle, assert Left/Right change width by 16px and Home/End hit
   the clamps; focus the rail, assert Up/Down change the selected tool.
6. **No regression** — re-run the desktop (1440×900), short-desktop (1024×600) and mobile
   (390×844) invariant suites from the earlier fix, plus `tsc --noEmit` and a production
   build.
