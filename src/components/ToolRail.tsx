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

    // The rail is vertical at every width, so Up/Down are the canonical keys for it.
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    onSelect(TOOL_TABS[next].id);
    focusTabAt(next);
  };

  const hasActiveMatch = TOOL_TABS.some((tool) => tool.id === activeTool);

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
            tabIndex={isActive || (!hasActiveMatch && index === 0) ? 0 : -1}
            title={isActive ? `${tool.label} — click to ${isCollapsed ? 'expand' : 'collapse'}` : tool.label}
            onClick={() => onSelect(tool.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`shrink-0 flex flex-col items-center justify-center gap-1 py-2.5 lg:py-2 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] ${
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
