import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StripCanvas } from './components/StripCanvas';
import { PREVIEW_PHOTOS } from './data/previewPhotos';
import { TEMPLATE_DEFINITIONS } from './data/templates';
import './index.css';

function TemplatePreviews() {
  useEffect(() => {
    const markReady = async () => {
      await Promise.all(
        Array.from(document.images).map((image) => image.decode().catch(() => undefined))
      );
      document.body.dataset.templatePreviewReady = 'true';
    };

    void markReady();
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, max-content))',
        alignItems: 'start',
        gap: 32,
        padding: 32,
        background: '#f8fafc'
      }}
    >
      {TEMPLATE_DEFINITIONS.map((template) => (
        <section
          key={template.id}
          data-template-preview={template.id}
          aria-label={`${template.name} template preview`}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}
        >
          <StripCanvas
            photos={PREVIEW_PHOTOS}
            config={template.config}
            onUpdateSticker={() => undefined}
            onDeleteSticker={() => undefined}
            zoomLevel={1}
          />
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<TemplatePreviews />);
