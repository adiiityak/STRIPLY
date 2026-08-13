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

    // Vertical rail on desktop, horizontal bar on mobile, so accept both axes.
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    onSelect(TOOL_TABS[next].id);
    focusTabAt(next);
  };

  // The mobile bar scrolls horizontally, so keep the active tool in view the way Canva does
  // rather than leaving it clipped off an edge.
  React.useEffect(() => {
    const bar = railRef.current;
    if (!bar) return;
    const active = bar.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!active) return;
    if (bar.scrollWidth > bar.clientWidth + 1) {
      active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [activeTool]);

  const hasActiveMatch = TOOL_TABS.some((tool) => tool.id === activeTool);

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label="Editing tools"
      // Canva-style bottom bar on mobile: a horizontally scrolling row of icon-over-label
      // tabs. Reverts to the 68px vertical rail from lg up. `order` puts the bar below the
      // sheet content on mobile while keeping the rail first on desktop.
      className="order-2 lg:order-1 w-full shrink-0 bg-white border-t border-[#E8E6DF] flex flex-row gap-1 px-2 pt-1.5 safe-bottom overflow-x-auto no-scrollbar lg:w-[68px] lg:flex-col lg:bg-[#FAF9F6] lg:border-t-0 lg:border-r lg:p-1.5 lg:pb-1.5 lg:overflow-x-visible lg:overflow-y-auto"
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
            tabIndex={isActive || (!hasActiveMatch && index === 0) ? 0 : -1}
            title={isActive ? `${tool.label} — click to ${isCollapsed ? 'expand' : 'collapse'}` : tool.label}
            onClick={() => onSelect(tool.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`shrink-0 min-w-[64px] lg:min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-1.5 lg:py-2 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] ${
              isActive
                ? 'text-[#FF6B6B] lg:bg-[#FF6B6B] lg:text-white lg:shadow-md'
                : 'text-[#666666] hover:text-[#2D2D2D] lg:hover:bg-[#E8E6DF]/50'
            }`}
          >
            {/* Mobile shows the active tool as a filled chip behind the icon; on desktop the
                whole button fills instead, which is the existing rail treatment. */}
            <span
              className={`flex items-center justify-center rounded-xl transition-colors w-8 h-8 lg:w-auto lg:h-auto lg:rounded-none ${
                isActive ? 'bg-[#FF6B6B] text-white lg:bg-transparent' : 'bg-transparent'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
            </span>
            <span className="text-[9.5px] font-semibold leading-none tracking-tight whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
