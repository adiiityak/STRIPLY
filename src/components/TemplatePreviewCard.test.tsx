import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import { TemplatePreviewCard } from './TemplatePreviewCard';

describe('TemplatePreviewCard', () => {
  const template = TEMPLATE_DEFINITIONS[0];

  it('shows the generated preview, name, and selected state', () => {
    render(<TemplatePreviewCard template={template} selected onSelect={() => undefined} />);

    const preview = screen.getByRole('img', { name: `${template.name} preview` });
    expect(preview).toHaveAttribute('src', `/template-previews/${template.id}.png`);
    expect(preview).toHaveClass('object-contain');
    expect(preview).not.toHaveClass('object-cover');
    expect(preview).not.toHaveClass('group-hover:scale-[1.02]');
    expect(preview).toHaveAttribute('loading', 'lazy');
    expect(preview).toHaveAttribute('decoding', 'async');
    expect(preview.parentElement).toHaveClass('aspect-[2/5]', 'md:aspect-[1/3]');
    expect(screen.getByRole('button', { name: template.name })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the color fallback when the preview cannot load', () => {
    render(<TemplatePreviewCard template={template} selected={false} onSelect={vi.fn()} />);

    fireEvent.error(screen.getByRole('img', { name: `${template.name} preview` }));

    expect(screen.getByTestId(`template-fallback-${template.id}`)).toBeVisible();
  });
});
