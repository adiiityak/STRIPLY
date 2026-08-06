import { useState } from 'react';
import type { TemplateDefinition } from '../data/templates';

const CATEGORY_SYMBOLS: Record<TemplateDefinition['category'], string> = {
  travel: '✈️',
  booth: '📸',
  romance: '💌',
  music: '🎵',
  vintage: '🎞️'
};

interface TemplatePreviewCardProps {
  template: TemplateDefinition;
  selected: boolean;
  onSelect: () => void;
}

export function TemplatePreviewCard({ template, selected, onSelect }: TemplatePreviewCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      data-testid={`template-card-${template.id}`}
      onClick={onSelect}
      title={template.tagline}
      aria-label={template.name}
      aria-pressed={selected}
      className={`group min-w-[132px] snap-center shrink-0 overflow-hidden rounded-xl border bg-white text-left transition-all md:min-w-0 ${
        selected
          ? 'border-2 border-[#FF6B6B] bg-[#FFF5F5] shadow-xs'
          : 'border-[#E8E6DF] hover:border-[#CFCBC1] hover:bg-[#FAF9F6]'
      }`}
    >
      <div className="aspect-[2/5] overflow-hidden bg-[#FAF9F6] md:aspect-[1/3]">
        {imageFailed ? (
          <div
            data-testid={`template-fallback-${template.id}`}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center"
            style={{ backgroundColor: template.previewColor }}
          >
            <span aria-hidden className="text-2xl drop-shadow-sm">
              {CATEGORY_SYMBOLS[template.category]}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#2D2D2D]">
              {template.badgeText}
            </span>
          </div>
        ) : (
          <img
            src={`/template-previews/${template.id}.png`}
            alt={`${template.name} preview`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <span
        className={`block px-2.5 py-2 text-center text-[11px] font-black leading-tight ${
          selected ? 'text-[#FF6B6B]' : 'text-[#2D2D2D]'
        }`}
      >
        {template.name}
      </span>
    </button>
  );
}
