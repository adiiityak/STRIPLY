import React, { useState, useRef, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { StripCanvas } from './components/StripCanvas';
import { ControlsPanel } from './components/ControlsPanel';
import { WebcamModal } from './components/WebcamModal';
import { PhotoEditModal } from './components/PhotoEditModal';
import { ShareModal } from './components/ShareModal';
import { StartScreen } from './components/StartScreen';
import { PhotoItem, StripConfiguration, PlacedSticker } from './types';
import { TEMPLATE_DEFINITIONS } from './data/templates';
import { autoCropPhoto, autoArrangePhotos } from './utils/smartCropUtils';
import { downloadStripAsPNG, downloadStripAsPDF, exportStripToDataUrl } from './utils/exportUtils';
import { useCanvasPan } from './hooks/useCanvasPan';
import { optimisePhotoFile } from './utils/photoImport';
import { ZoomIn, ZoomOut, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const DEFAULT_TEMPLATE_ID = 'airmail';
const DEFAULT_TEMPLATE =
  TEMPLATE_DEFINITIONS.find((t) => t.id === DEFAULT_TEMPLATE_ID) ?? TEMPLATE_DEFINITIONS[0];

export default function App() {
  // The strip starts empty; the user supplies photos via upload or the web booth.
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  // Default template, looked up by id so adding or reordering templates cannot
  // silently change which one the app opens on.
  const [config, setConfig] = useState<StripConfiguration>(DEFAULT_TEMPLATE.config);

  // Canvas ref for html-to-image exports
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Drag-to-pan the strip. The scroll container is <main>; anything marked data-no-pan
  // (the zoom toolbar, the sticker layer) keeps its own gestures.
  const viewportRef = useRef<HTMLElement | null>(null);

  // Zoom & Modal States
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Zoom bounds are shared by the toolbar buttons and the pinch gesture so both clamp alike.
  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 1.4;
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const { isPanning, canPan, centre } = useCanvasPan(viewportRef, {
    ignoreSelector: '[data-no-pan]',
    zoom: zoomLevel,
    onZoom: (next) => setZoomLevel(clampZoom(next))
  });
  // The booth opens only when the user asks for it, so the camera permission prompt
  // arrives with intent behind it rather than on page load.
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  // A visit begins on the start screen: capture, upload, or skip into the editor.
  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    if (!new URLSearchParams(location.search).has('room')) return;
    setShowStartScreen(false);
    setIsWebcamOpen(true);
  }, []);

  // Toast Notification. One effect owns dismissal so the initial welcome message
  // expires like any other, and a new toast restarts the clock instead of being
  // cut short by the previous toast's timer.
  const [toast, setToast] = useState<{ msg: string; id: number } | null>({
    id: 0,
    msg: 'Welcome to Striply! Turn your memories into photo strips 📸'
  });

  const toastNonce = useRef(0);
  const showToast = (msg: string) => setToast({ msg, id: ++toastNonce.current });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 2. Upload Photos from Disk
  const handleUploadPhotos = async (files: FileList) => {
    const ArrayFiles = Array.from(files).slice(0, 8 - photos.length);

    try {
      // Process sequentially so several full-resolution camera bitmaps are never decoded at the
      // same time. This also preserves the user's selection order.
      const imported: PhotoItem[] = [];
      const importId = Date.now();
      for (const [index, file] of ArrayFiles.entries()) {
        const url = await optimisePhotoFile(file);
        imported.push({
          id: `upload-${importId}-${index}`,
          url,
          originalUrl: url,
          cropX: 50,
          cropY: 20,
          zoom: 1
        });
      }
      setPhotos((prev) => [...prev, ...imported].slice(0, 8));
    } catch (error) {
      console.error('Failed to import photos:', error);
      showToast('One or more photos could not be prepared. Please try again.');
      return;
    }

    if (ArrayFiles.length >= 2 && ArrayFiles.length <= 6) {
      setConfig((prev) => ({ ...prev, photoCount: ArrayFiles.length }));
    }

    showToast(`Added ${ArrayFiles.length} photo(s)!`);
  };

  // 3. Web Cam Captured Photos
  const handleWebcamPhotosCaptured = (urls: string[]) => {
    const capturedItems: PhotoItem[] = urls.map((url, i) => ({
      id: `webcam-${Date.now()}-${i}`,
      url,
      cropX: 50,
      cropY: 20,
      zoom: 1,
      caption: `Webcam Shot #${i + 1}`
    }));
    setPhotos(capturedItems);
    const count = Math.min(6, Math.max(2, urls.length));
    setConfig((prev) => ({ ...prev, photoCount: count }));
    showToast(`Added ${capturedItems.length} live webcam shots! 📸`);
  };

  const handleRemoteSessionComplete = (
    capturedPhotos: PhotoItem[],
    sharedConfig: StripConfiguration
  ) => {
    setPhotos(capturedPhotos.slice(0, 4));
    setConfig({ ...sharedConfig, photoCount: 4 });
    setShowStartScreen(false);
    showToast('Your long-distance booth is ready to edit! ✨');
  };

  // 4. Auto Crop Faces
  const handleAutoCropFaces = () => {
    const cropped = photos.map((p) => autoCropPhoto(p));
    setPhotos(cropped);
    showToast('Face auto-crop applied! Centered subject focal points. ✨');
  };

  // 5. Auto Arrange Composition
  const handleAutoArrange = () => {
    const arranged = autoArrangePhotos(photos);
    setPhotos(arranged);
    showToast('Photos auto-arranged for best composition! 🎨');
  };

  // 6. Add Sticker
  const handleAddSticker = (symbol: string) => {
    const newSticker: PlacedSticker = {
      id: `stk-${Date.now()}`,
      symbol,
      x: 30 + Math.random() * 40, // place near middle
      y: 20 + Math.random() * 60,
      scale: 1.2,
      rotation: Math.floor(Math.random() * 30) - 15
    };
    setConfig((prev) => ({
      ...prev,
      stickerList: [...prev.stickerList, newSticker]
    }));
    showToast(`Added sticker ${symbol}! Drag or click to adjust.`);
  };

  // Update Sticker
  const handleUpdateSticker = (id: string, updates: Partial<PlacedSticker>) => {
    setConfig((prev) => ({
      ...prev,
      stickerList: prev.stickerList.map((s) => (s.id === id ? { ...s, ...updates } : s))
    }));
  };

  // Delete Sticker
  const handleDeleteSticker = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      stickerList: prev.stickerList.filter((s) => s.id !== id)
    }));
  };

  // 7. Shuffle Layout (Randomize photo sequence, background tint, & sticker rotation)
  const handleShuffleLayout = () => {
    if (photos.length > 1) {
      const shuffledPhotos = [...photos].sort(() => Math.random() - 0.5);
      setPhotos(shuffledPhotos);
    }

    // Randomize sticker rotation slightly
    const shuffledStickers = config.stickerList.map((stk) => ({
      ...stk,
      rotation: Math.floor(Math.random() * 60) - 30
    }));

    setConfig((prev) => ({
      ...prev,
      stickerList: shuffledStickers
    }));

    showToast('Layout & stickers shuffled! 🎲');
  };

  // 8. Export PNG
  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    showToast('Preparing high-res PNG download... ✨');
    try {
      await downloadStripAsPNG(canvasRef.current, `striply-photo-strip-${Date.now()}.png`);
      showToast('Photo strip downloaded successfully! 🎉');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PNG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // 9. Export PDF
  const handleExportPDF = async (layout: '2x6' | '4x6_double' | 'a4_grid') => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    showToast(`Generating ${layout} PDF print sheet... 📄`);
    try {
      await downloadStripAsPDF(canvasRef.current, `striply-strip-${layout}-${Date.now()}.pdf`, layout);
      showToast('PDF print sheet downloaded successfully! 🎉');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // The shell is exactly one viewport tall at every width: the canvas and the controls
  // sheet each scroll internally, so the page itself never scrolls.
  return (
    <div className="app-shell overflow-hidden bg-[#FAF9F6] text-[#2D2D2D] flex flex-col font-sans selection:bg-[#FF6B6B] selection:text-white">
      {/* Top Header */}
      <Header
        onOpenWebcam={() => setIsWebcamOpen(true)}
        onShuffleLayout={handleShuffleLayout}
        onQuickExportPNG={handleExportPNG}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        isExporting={isExporting}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {showStartScreen && (
          <StartScreen
            onTakeLivePicture={() => {
              setShowStartScreen(false);
              setIsWebcamOpen(true);
            }}
            onUploadPhotos={(files) => {
              handleUploadPhotos(files);
              setShowStartScreen(false);
            }}
            onExploreApp={() => setShowStartScreen(false)}
          />
        )}

        {/* Middle Canvas Preview Area */}
        {/* Centring is done with my-auto on the strip wrapper rather than justify-center:
            auto margins still allow scrolling to the top once the strip overflows. */}
        <main
          ref={viewportRef}
          // touch-pan-y keeps one-finger vertical scrolling native and smooth, while
          // suppressing the browser's own pinch so two fingers reach our zoom handler.
          className={`flex-1 min-h-0 bg-[#F0EEE9] p-4 sm:p-8 flex flex-col items-center relative overflow-auto touch-pan-y ${
            isPanning ? 'cursor-grabbing' : canPan ? 'cursor-grab' : ''
          }`}
        >
          {/* Canvas Zoom Toolbar floating top-right */}
          <div
            data-no-pan
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-[#E8E6DF] rounded-2xl p-1.5 flex items-center gap-1 shadow-md z-20 text-xs text-[#2D2D2D]"
          >
            <button
              onClick={() => setZoomLevel((z) => clampZoom(z - 0.1))}
              className="p-2.5 lg:p-1.5 hover:bg-[#FAF9F6] text-[#666666] hover:text-[#2D2D2D] rounded-xl transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[#2D2D2D] px-2 font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => clampZoom(z + 0.1))}
              className="p-2.5 lg:p-1.5 hover:bg-[#FAF9F6] text-[#666666] hover:text-[#2D2D2D] rounded-xl transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.0);
                // Reset undoes panning too, otherwise the strip stays wherever it was dragged.
                // The strip wrapper animates its size over 200ms, so centring on the next frame
                // would measure the pre-reset extents and get clamped. Centre once immediately for
                // responsiveness, then again after the transition settles on the final size.
                requestAnimationFrame(centre);
                window.setTimeout(centre, 260);
              }}
              className="px-3 py-2.5 lg:px-2 lg:py-1 hover:bg-[#FAF9F6] text-[#666666] hover:text-[#2D2D2D] rounded-xl text-[11px] font-bold transition-colors border-l border-[#E8E6DF]"
              title="Reset zoom and recentre the strip"
            >
              Reset
            </button>
          </div>

          {/* Interactive Live Strip Canvas */}
          <div className="py-8 my-auto max-w-full flex justify-center items-center">
            <StripCanvas
              ref={canvasRef}
              photos={photos}
              config={config}
              onUpdateSticker={handleUpdateSticker}
              onDeleteSticker={handleDeleteSticker}
              onEditPhoto={(photo) => setEditingPhoto(photo)}
              zoomLevel={zoomLevel}
            />
          </div>
        </main>

        {/* Right Sidebar Customization Controls Panel */}
        <ControlsPanel
          photos={photos}
          config={config}
          onChangeConfig={setConfig}
          onUploadPhotos={handleUploadPhotos}
          onReorderPhotos={setPhotos}
          onRemovePhoto={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
          onOpenWebcam={() => setIsWebcamOpen(true)}
          onAutoCropFaces={handleAutoCropFaces}
          onAutoArrange={handleAutoArrange}
          onAddSticker={handleAddSticker}
          onExportPNG={handleExportPNG}
          onExportPDF={handleExportPDF}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          isExporting={isExporting}
        />
      </div>

      {/* Web Cam Photobooth Modal */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onPhotosCaptured={handleWebcamPhotosCaptured}
        onRemoteSessionComplete={handleRemoteSessionComplete}
      />

      {/* Social Media & Link Direct Sharing Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        config={config}
        onExportPNG={async () => {
          if (!canvasRef.current) return null;
          return await exportStripToDataUrl(canvasRef.current);
        }}
      />

      {/* Individual Photo Adjustment Modal */}
      <PhotoEditModal
        photo={editingPhoto}
        isOpen={Boolean(editingPhoto)}
        onClose={() => setEditingPhoto(null)}
        onSave={(updated) => {
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          showToast('Updated photo settings!');
        }}
        onDelete={(id) => {
          setPhotos((prev) => prev.filter((p) => p.id !== id));
          showToast('Photo removed.');
        }}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#2D2D2D] text-white px-5 py-3 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-white/10">
          <Sparkles className="w-4 h-4 text-[#FF6B6B] shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Vercel Speed Insights */}
      <SpeedInsights />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
