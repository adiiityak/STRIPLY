import React, { useState } from 'react';
import {
  PhotoItem,
  StripConfiguration,
  StripStyle,
  FrameType,
  FontType,
  FilterPreset,
  ExportFormat,
  PlacedSticker,
  StickerAnimation,
  CaptionAnimation
} from '../types';
import { TEMPLATE_DEFINITIONS, TEMPLATE_CATEGORIES, TemplateCategory } from '../data/templates';
import { STICKER_COLLECTION, BACKGROUND_PRESETS } from '../data/stickers';
import {
  Upload,
  Layers,
  Download,
  Sparkles,
  RefreshCw,
  Trash2,
  Plus,
  Video,
  Wand2,
  Calendar,
  MapPin,
  Music,
  Sun,
  QrCode,
  FileText,
  Check,
  RotateCw,
  MoveUp,
  MoveDown,
  Share2,
  Plane,
  Ticket,
  Smile,
  Gift,
  Camera,
  Film,
  Keyboard,
  Zap,
  Wind,
  Activity,
  Square,
  Lightbulb,
  Heart,
  Edit3,
  Clock,
  Compass,
  Mail
} from 'lucide-react';
import { BoardingPassInfo, TicketInfo, MusicTrackInfo, LockscreenInfo, AirMailInfo } from '../types';
import { computeSlotLayout, FLUSH_THRESHOLD } from '../utils/stripLayout';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { ToolRail, type ToolId } from './ToolRail';
import { ResizeHandle } from './ResizeHandle';

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  all: <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" />,
  travel: <Plane className="w-3.5 h-3.5 text-red-500 inline" />,
  booth: <Camera className="w-3.5 h-3.5 text-sky-500 inline" />,
  romance: <Heart className="w-3.5 h-3.5 text-pink-500 inline" />,
  music: <Music className="w-3.5 h-3.5 text-purple-500 inline" />,
  vintage: <Film className="w-3.5 h-3.5 text-amber-700 inline" />
};

const TemplateCard: React.FC<{
  tmpl: (typeof TEMPLATE_DEFINITIONS)[number];
  isActive: boolean;
  onSelect: () => void;
}> = ({ tmpl, isActive, onSelect }) => (
  <button
    onClick={onSelect}
    title={`${tmpl.name} — ${tmpl.tagline}`}
    aria-pressed={isActive}
    className={`aspect-square p-2 rounded-xl border transition-all relative overflow-hidden flex flex-col items-center justify-center gap-1 text-center ${
      isActive
        ? 'border-2 border-[#FF6B6B] bg-[#FFF5F5] shadow-xs'
        : 'border border-[#E8E6DF] bg-white hover:bg-[#FAF9F6]'
    }`}
  >
    <span className="text-base leading-none">{CATEGORY_ICON_MAP[tmpl.category]}</span>
    <span
      className={`font-bold text-[10.5px] leading-tight line-clamp-2 ${
        isActive ? 'text-[#FF6B6B]' : 'text-[#2D2D2D]'
      }`}
    >
      {tmpl.name}
    </span>
    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#666666] border border-[#E8E6DF] max-w-full truncate">
      {tmpl.badgeText}
    </span>
  </button>
);

interface ControlsPanelProps {
  photos: PhotoItem[];
  config: StripConfiguration;
  onChangeConfig: (newConfig: StripConfiguration) => void;
  onUploadPhotos: (files: FileList) => void;
  onReorderPhotos: (newPhotos: PhotoItem[]) => void;
  onRemovePhoto: (id: string) => void;
  onOpenWebcam: () => void;
  onAutoCropFaces: () => void;
  onAutoArrange: () => void;
  onAddSticker: (symbol: string) => void;
  onExportPNG: () => void;
  onExportPDF: (layout: '2x6' | '4x6_double' | 'a4_grid') => void;
  onOpenShareModal?: () => void;
  isExporting: boolean;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  photos,
  config,
  onChangeConfig,
  onUploadPhotos,
  onReorderPhotos,
  onRemovePhoto,
  onOpenWebcam,
  onAutoCropFaces,
  onAutoArrange,
  onAddSticker,
  onExportPNG,
  onExportPDF,
  onOpenShareModal,
  isExporting
}) => {
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

  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [stickerCategory, setStickerCategory] = useState<string>('hearts');
  const [selectedCategory, setSelectedCategory] = useState<'all' | TemplateCategory>('all');

  // Handle Tab Change
  const updateConfig = (updates: Partial<StripConfiguration>) => {
    onChangeConfig({ ...config, ...updates });
  };

  // The strip forces the inter-photo gap to 0 from FLUSH_THRESHOLD up, so the Photo Gap slider is
  // a no-op there. `config.photoGap` is left untouched, so lowering the count restores the user's
  // value; the readout comes from the same helper the canvas uses so the two cannot drift.
  const isGapFlush = config.photoCount >= FLUSH_THRESHOLD;
  const renderedGap = computeSlotLayout(config.photoCount, config.photoGap).gap;

  const updateBoardingPass = (updates: Partial<BoardingPassInfo>) => {
    updateConfig({
      boardingPass: {
        airlineName: config.boardingPass?.airlineName || 'URARCHIVE AIRLINES',
        classType: config.boardingPass?.classType || 'FIRST CLASS',
        departureCode: config.boardingPass?.departureCode || 'JKT',
        departureCity: config.boardingPass?.departureCity || 'JAKARTA',
        arrivalCode: config.boardingPass?.arrivalCode || 'BJM',
        arrivalCity: config.boardingPass?.arrivalCity || 'BANJARMASIN',
        flightNo: config.boardingPass?.flightNo || 'URC08',
        terminal: config.boardingPass?.terminal || '8',
        gate: config.boardingPass?.gate || '08',
        seat: config.boardingPass?.seat || '08U',
        ...updates
      }
    });
  };

  const updateTicket = (updates: Partial<TicketInfo>) => {
    updateConfig({
      ticket: {
        eventTitle: config.ticket?.eventTitle || 'Special Day',
        subtitle: config.ticket?.subtitle || 'PIXELBOOTH',
        barcodeText: config.ticket?.barcodeText || '984021839',
        studioName: config.ticket?.studioName || 'PIXELBOOTH',
        ...updates
      }
    });
  };

  const updateMusicTrack = (updates: Partial<MusicTrackInfo>) => {
    updateConfig({
      musicTrack: {
        title: config.musicTrack?.title || 'Fix You',
        artist: config.musicTrack?.artist || 'Coldplay',
        ...updates
      }
    });
  };

  const updateLockscreen = (updates: Partial<LockscreenInfo>) => {
    updateConfig({
      lockscreen: {
        time: config.lockscreen?.time || '11:26',
        date: config.lockscreen?.date || 'Saturday, November 30',
        songTitle: config.lockscreen?.songTitle || 'I Wanna Be Yours',
        artistName: config.lockscreen?.artistName || 'Arctic Monkeys',
        ...updates
      }
    });
  };

  const updateAirMail = (updates: Partial<AirMailInfo>) => {
    updateConfig({
      airMail: {
        airMailBadge: config.airMail?.airMailBadge || 'PAR AVION / BY AIR MAIL',
        postcardTitle: config.airMail?.postcardTitle || config.captionText || 'Air Mail Postcard',
        stampText: config.airMail?.stampText || 'AIR MAIL',
        postmarkText: config.airMail?.postmarkText || 'WITH LOVE',
        senderNote: config.airMail?.senderNote || config.subCaptionText || 'Sincerely, With love xoxo',
        parcelNo: config.airMail?.parcelNo || 'PARCEL NO. 8840-02',
        postDate: config.airMail?.postDate || config.customDateText || '08.04.2026',
        ...updates
      }
    });
  };

  // AI Caption Generator Call
  const handleGenerateCaptions = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: config.style, topic: aiTopic })
      });
      const data = await res.json();
      if (data.captions && Array.isArray(data.captions)) {
        setSuggestedCaptions(data.captions);
      }
    } catch (err) {
      console.error('AI Caption generation error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Memory Note Generator Call
  const handleGenerateMemoryNote = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-memory-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: config.captionText,
          location: config.memoryCard.location,
          date: config.memoryCard.date
        })
      });
      const data = await res.json();
      if (data.note) {
        updateConfig({
          memoryCard: { ...config.memoryCard, shortNote: data.note }
        });
      }
    } catch (err) {
      console.error('AI Memory Note error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Move photo up or down
  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newArr = [...photos];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    onReorderPhotos(newArr);
  };

  // Stacked on mobile: the rail is a full-width horizontal bar there, so a row
  // direction would let it consume the whole line and crush the content pane.
  return (
    <div
      style={{ '--panel-w': `${effectiveWidth}px` } as React.CSSProperties}
      className="relative bg-white border-l border-[#E8E6DF] text-[#2D2D2D] w-full lg:w-[var(--panel-w)] shrink-0 flex flex-col lg:flex-row h-full overflow-hidden"
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
        {/* ================= TEMPLATES TAB ================= */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-1 block">
                1. Preset Templates
              </label>
              <p className="text-[#666666] text-[11px]">Choose a style baseline to instantly layout your photobooth strip.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-[#FF6B6B] text-white border-[#FF6B6B] shadow-xs'
                      : 'bg-white text-[#666666] border-[#E8E6DF] hover:bg-[#FAF9F6] hover:text-[#2D2D2D]'
                  }`}
                >
                  <span>{CATEGORY_ICON_MAP[cat.id]}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Templates Display */}
            {selectedCategory === 'all' ? (
              /* Render grouped by category */
              <div className="space-y-5">
                {TEMPLATE_CATEGORIES.filter((cat) => cat.id !== 'all').map((cat) => {
                  const catTemplates = TEMPLATE_DEFINITIONS.filter((t) => t.category === cat.id);
                  if (catTemplates.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-1.5">
                        <span className="font-bold text-xs text-[#2D2D2D] flex items-center gap-1.5">
                          <span>{CATEGORY_ICON_MAP[cat.id]}</span>
                          <span>{cat.name}</span>
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">({catTemplates.length})</span>
                      </div>

                      <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(84px,1fr))]">
                        {catTemplates.map((tmpl) => (
                          <TemplateCard
                            key={tmpl.id}
                            tmpl={tmpl}
                            isActive={config.style === tmpl.id}
                            onSelect={() =>
                              onChangeConfig({
                                ...tmpl.config,
                                captionText: config.captionText || tmpl.config.captionText,
                                subCaptionText: config.subCaptionText || tmpl.config.subCaptionText,
                                photoCount: config.photoCount || tmpl.config.photoCount
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Render single selected category */
              <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(84px,1fr))]">
                {TEMPLATE_DEFINITIONS.filter((t) => t.category === selectedCategory).map((tmpl) => (
                  <TemplateCard
                    key={tmpl.id}
                    tmpl={tmpl}
                    isActive={config.style === tmpl.id}
                    onSelect={() =>
                      onChangeConfig({
                        ...tmpl.config,
                        captionText: config.captionText || tmpl.config.captionText,
                        subCaptionText: config.subCaptionText || tmpl.config.subCaptionText,
                        photoCount: config.photoCount || tmpl.config.photoCount
                      })
                    }
                  />
                ))}
              </div>
            )}

            {/* Layout Formats */}
            <div className="pt-4 border-t border-[#E8E6DF] space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                Export Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'strip2x6', label: '2×6 Classic Strip' },
                  { id: 'strip4x6', label: '4×6 Double Print' },
                  { id: 'igStory', label: 'Instagram Story (9:16)' },
                  { id: 'igPost', label: 'Instagram Post (Square)' },
                  { id: 'wallpaper', label: 'Phone Wallpaper' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => updateConfig({ exportFormat: fmt.id as ExportFormat })}
                    className={`p-2 rounded-xl text-center font-semibold border text-xs transition-colors ${
                      config.exportFormat === fmt.id
                        ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                        : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= PHOTOS TAB ================= */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                2. Upload Photos ({photos.length}/8)
              </label>
              <p className="text-[#666666] text-[11px]">Upload 3 to 8 photos or snap live shots with webcam.</p>
              {photos.length > config.photoCount && (
                <p className="text-[#FF6B6B] text-[11px] font-semibold mt-1.5">
                  Showing first {config.photoCount} of {photos.length} photos — raise Photos Per
                  Strip to include the rest.
                </p>
              )}
            </div>

            {/* File Upload Drop Area */}
            <label className="border-2 border-dashed border-[#E8E6DF] rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 hover:border-[#FF6B6B] bg-[#FFFBFB] cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && onUploadPhotos(e.target.files)}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-[#FF6B6B] opacity-60" />
              <span className="text-sm font-semibold text-[#2D2D2D]">Click or drag photos here</span>
              <span className="text-[10px] text-[#999999]">JPG, PNG, WEBP up to 10MB</span>
            </label>

            {/* Smart Utilities Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenWebcam}
                className="p-2.5 bg-[#FFF5F5] border border-[#FF6B6B]/20 rounded-xl font-bold text-[#FF6B6B] flex items-center justify-center gap-1.5 hover:bg-[#FFE8E8] transition-colors"
              >
                <Video className="w-4 h-4 text-[#FF6B6B]" />
                <span>Web Booth</span>
              </button>

              <button
                onClick={onAutoCropFaces}
                className="p-2.5 bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl font-bold text-[#2D2D2D] flex items-center justify-center gap-1.5 hover:bg-[#F0EEE9] transition-colors"
              >
                <Wand2 className="w-4 h-4 text-[#FF6B6B]" />
                <span>Auto-Crop</span>
              </button>
            </div>

            {/* Arrange & Timeline Controls */}
            <div className="flex items-center justify-between bg-[#FAF9F6] p-3 rounded-xl border border-[#E8E6DF]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="timeline-mode"
                  checked={config.showTimelineLabels}
                  onChange={(e) => updateConfig({ showTimelineLabels: e.target.checked })}
                  className="accent-[#FF6B6B] rounded w-4 h-4"
                />
                <label htmlFor="timeline-mode" className="font-semibold text-[#2D2D2D] cursor-pointer text-xs">
                  Timeline Labels Mode
                </label>
              </div>

              <button
                onClick={onAutoArrange}
                className="text-[#FF6B6B] hover:text-[#ff5252] font-bold text-[11px] flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto Arrange
              </button>
            </div>

            {/* Photo List Items */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
                Photo Order
              </label>
              {photos.length === 0 ? (
                <div className="text-[#999999] text-center py-4 italic">No photos uploaded yet</div>
              ) : (
                photos.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-[#FAF9F6] p-2 rounded-xl border border-[#E8E6DF] hover:border-[#FF6B6B]/50 transition-colors"
                  >
                    <img src={p.url} alt={`Thumb ${idx + 1}`} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#2D2D2D] truncate">
                        {p.caption || `Photo #${idx + 1}`}
                      </div>
                      <div className="text-[10px] text-[#999999]">
                        {p.yearLabel ? `Label: ${p.yearLabel}` : `Frame 0${idx + 1}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => movePhoto(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:text-[#FF6B6B] text-[#999999] disabled:opacity-20"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => movePhoto(idx, 'down')}
                        disabled={idx === photos.length - 1}
                        className="p-1 hover:text-[#FF6B6B] text-[#999999] disabled:opacity-20"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemovePhoto(p.id)}
                        className="p-1 text-[#FF6B6B] hover:text-[#ff5252] ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= DESIGN / CUSTOMIZE TAB ================= */}
        {activeTab === 'customize' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                3. Strip Background Color
              </label>
              <p className="text-[#666666] text-[11px]">Select canvas theme background color and photo frame border.</p>
            </div>

            {/* Background Color Presets */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2.5">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() =>
                      updateConfig({
                        background: {
                          type: preset.type as any,
                          color: preset.color,
                          gradientTo: preset.gradientTo,
                          patternName: preset.patternName as any
                        }
                      })
                    }
                    className={`w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform ${
                      config.background.color === preset.color
                        ? 'ring-2 ring-[#FF6B6B] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {config.background.color === preset.color && (
                      <Check className="w-3.5 h-3.5 text-[#2D2D2D] mx-auto drop-shadow-xs" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Color Picker */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[#666666] font-medium">Custom Color:</span>
                <input
                  type="color"
                  value={config.background.color}
                  onChange={(e) =>
                    updateConfig({
                      background: { ...config.background, type: 'solid', color: e.target.value }
                    })
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-[#2D2D2D] font-bold">{config.background.color}</span>
              </div>
            </div>

            {/* Frame Style Selector */}
            <div className="space-y-2 pt-3 border-t border-[#E8E6DF]">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                Photo Frame Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'rounded', label: 'Rounded Pill' },
                  { id: 'square', label: 'Classic Square' },
                  { id: 'film', label: 'Film Sprocket' },
                  { id: 'torn', label: 'Torn Paper' },
                  { id: 'vintage', label: 'Vintage Border' },
                  { id: 'shadow', label: 'Floating Shadow' },
                  { id: 'borderless', label: 'Borderless' }
                ].map((fr) => (
                  <button
                    key={fr.id}
                    onClick={() => updateConfig({ frameType: fr.id as FrameType })}
                    className={`p-2 rounded-xl text-center font-semibold border text-xs transition-colors ${
                      config.frameType === fr.id
                        ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                        : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {fr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photos Per Strip */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                Photos Per Strip
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateConfig({ photoCount: n })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      config.photoCount === n
                        ? 'bg-[#FF6B6B] text-white border-[#FF6B6B] shadow-xs'
                        : 'bg-white text-[#666666] border-[#E8E6DF] hover:bg-[#FAF9F6] hover:text-[#2D2D2D]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#666666]">
                Strip size stays the same at every count. At 5 and 6, photos sit flush against each
                other — the strip keeps its outer margin.
              </p>
            </div>

            {/* Spacing & Radius Sliders */}
            <div className="space-y-3 pt-3 border-t border-[#E8E6DF]">
              <div>
                <div className="flex justify-between text-[#666666] mb-1 font-semibold">
                  <span>Outer Margin:</span>
                  <span className="text-[#2D2D2D]">{config.outerPadding}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="40"
                  value={config.outerPadding}
                  onChange={(e) => updateConfig({ outerPadding: parseInt(e.target.value) })}
                  className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#666666] mb-1 font-semibold">
                  <span>Photo Gap{isGapFlush ? ' (flush)' : ''}:</span>
                  <span className="text-[#2D2D2D]">{renderedGap}px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={config.photoGap}
                  disabled={isGapFlush}
                  onChange={(e) => updateConfig({ photoGap: parseInt(e.target.value) })}
                  className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {isGapFlush && (
                  <p className="text-[11px] text-[#666666] mt-1">
                    Photos sit flush at {config.photoCount} — your {config.photoGap}px gap returns
                    below {FLUSH_THRESHOLD}.
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-[#666666] mb-1 font-semibold">
                  <span>Corner Radius:</span>
                  <span className="text-[#2D2D2D]">{config.photoBorderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={config.photoBorderRadius}
                  onChange={(e) => updateConfig({ photoBorderRadius: parseInt(e.target.value) })}
                  className="w-full accent-[#FF6B6B] bg-[#E8E6DF] rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= FILTERS TAB ================= */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                4. Filters & Grain
              </label>
              <p className="text-[#666666] text-[11px]">Apply film color grading across all photos.</p>
            </div>

            {/* Filter Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'normal', name: 'Original Clean' },
                { id: 'vintageWarm', name: 'Vintage Warm' },
                { id: 'bwNoir', name: 'B&W Film Noir' },
                { id: 'retro90s', name: 'Retro 90s Flash' },
                { id: 'pastel', name: 'Korean Soft' },
                { id: 'cyberFilm', name: 'Cyber Cool Tint' },
                { id: 'sepia', name: 'Sepia Nostalgia' },
                { id: 'goldenHour', name: 'Golden Hour' }
              ].map((fp) => (
                <button
                  key={fp.id}
                  onClick={() =>
                    updateConfig({
                      filter: { ...config.filter, preset: fp.id as FilterPreset }
                    })
                  }
                  className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-colors ${
                    config.filter.preset === fp.id
                      ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                      : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                  }`}
                >
                  {fp.name}
                </button>
              ))}
            </div>

            {/* Grain & Effects Sliders */}
            <div className="space-y-3 pt-3 border-t border-[#E8E6DF]">
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase mb-1">
                  <span className="text-[#666666]">Film Grain</span>
                  <span className="text-[#FF6B6B]">{config.filter.grain}%</span>
                </div>
                <div className="h-2 bg-[#E8E6DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B6B] transition-all"
                    style={{ width: `${config.filter.grain}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.filter.grain}
                  onChange={(e) =>
                    updateConfig({
                      filter: { ...config.filter, grain: parseInt(e.target.value) }
                    })
                  }
                  className="w-full accent-[#FF6B6B] mt-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold uppercase mb-1">
                  <span className="text-[#666666]">Vintage Fade</span>
                  <span className="text-[#FF6B6B]">{config.filter.fade}%</span>
                </div>
                <div className="h-2 bg-[#E8E6DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B6B] transition-all"
                    style={{ width: `${config.filter.fade}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.filter.fade}
                  onChange={(e) =>
                    updateConfig({
                      filter: { ...config.filter, fade: parseInt(e.target.value) }
                    })
                  }
                  className="w-full accent-[#FF6B6B] mt-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold uppercase mb-1">
                  <span className="text-[#666666]">Warmth</span>
                  <span className="text-[#FF6B6B]">{config.filter.warmth}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={config.filter.warmth}
                  onChange={(e) =>
                    updateConfig({
                      filter: { ...config.filter, warmth: parseInt(e.target.value) }
                    })
                  }
                  className="w-full accent-[#FF6B6B] mt-1 cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() =>
                    updateConfig({
                      filter: { ...config.filter, dustOverlay: !config.filter.dustOverlay }
                    })
                  }
                  className={`p-2 rounded-xl border text-center font-semibold text-xs transition-colors ${
                    config.filter.dustOverlay
                      ? 'bg-[#FFFBF2] border-[#FFE66D] text-[#8B7D4B]'
                      : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666]'
                  }`}
                >
                  Dust & Scratches
                </button>

                <button
                  onClick={() =>
                    updateConfig({
                      filter: { ...config.filter, lightLeak: !config.filter.lightLeak }
                    })
                  }
                  className={`p-2 rounded-xl border text-center font-semibold text-xs transition-colors ${
                    config.filter.lightLeak
                      ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                      : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666]'
                  }`}
                >
                  Light Leak Burn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STICKERS TAB ================= */}
        {activeTab === 'stickers' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                5. Stickers & Doodles
              </label>
              <p className="text-[#666666] text-[11px]">Click a sticker to place it onto your photo strip.</p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1 pb-1">
              {[
                { id: 'hearts', label: 'Hearts', icon: <Heart className="w-3.5 h-3.5 text-rose-500" /> },
                { id: 'sparkles', label: 'Sparkles', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
                { id: 'cute', label: 'Cute', icon: <Smile className="w-3.5 h-3.5 text-pink-500" /> },
                { id: 'retro', label: 'Retro', icon: <Camera className="w-3.5 h-3.5 text-sky-500" /> },
                { id: 'tape', label: 'Tape', icon: <Layers className="w-3.5 h-3.5 text-amber-700" /> },
                { id: 'doodles', label: 'Doodles', icon: <Edit3 className="w-3.5 h-3.5 text-emerald-500" /> }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setStickerCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    stickerCategory === cat.id
                      ? 'bg-[#FF6B6B] text-white'
                      : 'bg-[#FAF9F6] text-[#666666] hover:bg-[#E8E6DF]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Sticker Grid */}
            <div className="grid grid-cols-4 gap-3 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6DF]">
              {STICKER_COLLECTION.filter((s) => s.category === stickerCategory).map((stk) => (
                <button
                  key={stk.id}
                  onClick={() => onAddSticker(stk.symbol)}
                  className="aspect-square bg-white rounded-lg flex items-center justify-center text-xl cursor-pointer hover:bg-[#FFF5F5] border border-[#E8E6DF] transition-transform active:scale-90"
                  title={stk.label}
                >
                  {stk.symbol}
                </button>
              ))}
            </div>

            {/* Sticker Animation Motion Effect Selector */}
            <div className="space-y-1.5 pt-2 border-t border-[#E8E6DF]">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
                Sticker Animation Motion
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'float', label: 'Float', icon: <Wind className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'bounce', label: 'Bounce', icon: <Activity className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'sway', label: 'Sway', icon: <RotateCw className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'none', label: 'Static', icon: <Square className="w-3 h-3 text-[#FF6B6B]" /> }
                ].map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => updateConfig({ stickerAnimation: anim.id as StickerAnimation })}
                    className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      (config.stickerAnimation || 'float') === anim.id
                        ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                        : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    <span>{anim.icon}</span>
                    <span>{anim.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Stickers List */}
            {config.stickerList.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E8E6DF]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#2D2D2D]">Placed Stickers ({config.stickerList.length})</span>
                  <button
                    onClick={() => updateConfig({ stickerList: [] })}
                    className="text-[#FF6B6B] hover:text-[#ff5252] text-[11px] font-bold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-1">
                  {config.stickerList.map((stk) => (
                    <div
                      key={stk.id}
                      className="flex items-center justify-between bg-[#FAF9F6] px-3 py-1.5 rounded-xl border border-[#E8E6DF]"
                    >
                      <span className="text-xl">{stk.symbol}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const updated = config.stickerList.filter((s) => s.id !== stk.id);
                            updateConfig({ stickerList: updated });
                          }}
                          className="text-[#FF6B6B] hover:text-[#ff5252] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= CAPTIONS TAB ================= */}
        {activeTab === 'captions' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                6. Captions & Date Stamp
              </label>
              <p className="text-[#666666] text-[11px]">Add custom text, date stamps, and memory notes.</p>
            </div>

            {/* Typography Font Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
                Typography Font Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'serif', label: 'Classic Serif' },
                  { id: 'cute', label: 'Cute Rounded' },
                  { id: 'handwritten', label: 'Handwritten Script' },
                  { id: 'typewriter', label: 'Typewriter' },
                  { id: 'retro', label: 'Retro 8-Bit' },
                  { id: 'sans', label: 'Clean Sans' }
                ].map((ft) => (
                  <button
                    key={ft.id}
                    onClick={() => updateConfig({ fontType: ft.id as FontType })}
                    className={`p-2 rounded-xl text-center font-semibold border text-xs transition-colors ${
                      config.fontType === ft.id
                        ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                        : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Inputs */}
            <div className="space-y-3 pt-3 border-t border-[#E8E6DF]">
              <div>
                <label className="text-[#666666] block mb-1 font-semibold">Main Caption Title:</label>
                <input
                  type="text"
                  value={config.captionText}
                  onChange={(e) => updateConfig({ captionText: e.target.value })}
                  placeholder="e.g. Summer in Seoul ✨"
                  className="w-full bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl px-3 py-2 text-[#2D2D2D] font-medium focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>

              <div>
                <label className="text-[#666666] block mb-1 font-semibold">Subcaption / Tagline:</label>
                <input
                  type="text"
                  value={config.subCaptionText}
                  onChange={(e) => updateConfig({ subCaptionText: e.target.value })}
                  placeholder="e.g. Best Friends Forever"
                  className="w-full bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl px-3 py-2 text-[#2D2D2D] font-medium focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="show-date"
                  checked={config.showDateStamp}
                  onChange={(e) => updateConfig({ showDateStamp: e.target.checked })}
                  className="accent-[#FF6B6B] rounded w-4 h-4 cursor-pointer"
                />
                <label htmlFor="show-date" className="text-[#2D2D2D] font-semibold cursor-pointer">
                  Show Date Stamp
                </label>
                {config.showDateStamp && (
                  <input
                    type="text"
                    value={config.customDateText}
                    onChange={(e) => updateConfig({ customDateText: e.target.value })}
                    className="ml-auto bg-[#FAF9F6] border border-[#E8E6DF] rounded-lg px-2 py-1 text-xs w-28 text-[#2D2D2D]"
                  />
                )}
              </div>
            </div>

            {/* Dynamic Template Text Editors */}
            <div className="pt-3 border-t border-[#E8E6DF] space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
                Template Specific Fields ({config.style})
              </label>

              {/* Air Mail Postcard Editable Text Fields */}
              {config.style === 'airmail' && (
                <div className="bg-[#FFFDF7] p-3 rounded-2xl border border-amber-300 space-y-2 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-200">
                    <Mail className="w-4 h-4 text-red-600" />
                    <span>Air Mail Postcard Details</span>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Top Banner Badge:</label>
                    <input
                      type="text"
                      value={config.airMail?.airMailBadge || 'PAR AVION / BY AIR MAIL'}
                      onChange={(e) => updateAirMail({ airMailBadge: e.target.value })}
                      placeholder="e.g. PAR AVION / BY AIR MAIL"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Postcard Title:</label>
                    <input
                      type="text"
                      value={config.airMail?.postcardTitle || config.captionText || ''}
                      onChange={(e) => {
                        updateConfig({ captionText: e.target.value });
                        updateAirMail({ postcardTitle: e.target.value });
                      }}
                      placeholder="e.g. Air Mail Postcard"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Stamp Text:</label>
                      <input
                        type="text"
                        value={config.airMail?.stampText || 'AIR MAIL'}
                        onChange={(e) => updateAirMail({ stampText: e.target.value })}
                        placeholder="e.g. AIR MAIL"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs uppercase text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Postmark Seal:</label>
                      <input
                        type="text"
                        value={config.airMail?.postmarkText || 'WITH LOVE'}
                        onChange={(e) => updateAirMail({ postmarkText: e.target.value })}
                        placeholder="e.g. WITH LOVE"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Sender Note / Sign-off:</label>
                    <input
                      type="text"
                      value={config.airMail?.senderNote || config.subCaptionText || ''}
                      onChange={(e) => {
                        updateConfig({ subCaptionText: e.target.value });
                        updateAirMail({ senderNote: e.target.value });
                      }}
                      placeholder="e.g. Sincerely, With love xoxo"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Parcel / Track No:</label>
                      <input
                        type="text"
                        value={config.airMail?.parcelNo || 'PARCEL NO. 8840-02'}
                        onChange={(e) => updateAirMail({ parcelNo: e.target.value })}
                        placeholder="e.g. PARCEL NO. 8840-02"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Post Date:</label>
                      <input
                        type="text"
                        value={config.airMail?.postDate || config.customDateText || ''}
                        onChange={(e) => {
                          updateConfig({ customDateText: e.target.value });
                          updateAirMail({ postDate: e.target.value });
                        }}
                        placeholder="e.g. 08.04.2026"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#2D2D2D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Boarding Pass Editable Text Fields */}
              {config.style === 'boardingpass' && (
                <div className="bg-[#FFFBFB] p-3 rounded-2xl border border-red-200 space-y-2 text-xs">
                  <div className="font-bold text-red-600 flex items-center gap-1.5 pb-1 border-b border-red-100">
                    <Plane className="w-4 h-4" />
                    <span>Boarding Pass Ticket Details</span>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Airline Name:</label>
                    <input
                      type="text"
                      value={config.boardingPass?.airlineName || config.captionText || ''}
                      onChange={(e) => updateBoardingPass({ airlineName: e.target.value })}
                      placeholder="e.g. URARCHIVE AIRLINES"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Departure Code:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.departureCode || ''}
                        onChange={(e) => updateBoardingPass({ departureCode: e.target.value })}
                        placeholder="e.g. JKT"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono uppercase text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Departure City:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.departureCity || ''}
                        onChange={(e) => updateBoardingPass({ departureCity: e.target.value })}
                        placeholder="e.g. JAKARTA"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Arrival Code:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.arrivalCode || ''}
                        onChange={(e) => updateBoardingPass({ arrivalCode: e.target.value })}
                        placeholder="e.g. BJM"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono uppercase text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Arrival City:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.arrivalCity || ''}
                        onChange={(e) => updateBoardingPass({ arrivalCity: e.target.value })}
                        placeholder="e.g. BANJARMASIN"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Flight No:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.flightNo || ''}
                        onChange={(e) => updateBoardingPass({ flightNo: e.target.value })}
                        placeholder="e.g. URC08"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono uppercase text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Class Type:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.classType || ''}
                        onChange={(e) => updateBoardingPass({ classType: e.target.value })}
                        placeholder="e.g. FIRST CLASS"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Terminal:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.terminal || ''}
                        onChange={(e) => updateBoardingPass({ terminal: e.target.value })}
                        placeholder="8"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2 py-1 text-xs text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Gate:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.gate || ''}
                        onChange={(e) => updateBoardingPass({ gate: e.target.value })}
                        placeholder="08"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2 py-1 text-xs text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Seat:</label>
                      <input
                        type="text"
                        value={config.boardingPass?.seat || ''}
                        onChange={(e) => updateBoardingPass({ seat: e.target.value })}
                        placeholder="08U"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2 py-1 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Stub Editable Fields */}
              {config.style === 'ticketstub' && (
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6DF] space-y-2 text-xs">
                  <div className="font-bold text-[#2D2D2D] flex items-center gap-1.5 pb-1 border-b border-[#E8E6DF]">
                    <Ticket className="w-4 h-4 text-[#FF6B6B]" />
                    <span>Ticket Stub Custom Text</span>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Event Title:</label>
                    <input
                      type="text"
                      value={config.ticket?.eventTitle || config.captionText}
                      onChange={(e) => {
                        updateConfig({ captionText: e.target.value });
                        updateTicket({ eventTitle: e.target.value });
                      }}
                      placeholder="e.g. Special Day"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Subtitle / Studio:</label>
                    <input
                      type="text"
                      value={config.ticket?.subtitle || config.subCaptionText}
                      onChange={(e) => {
                        updateConfig({ subCaptionText: e.target.value });
                        updateTicket({ subtitle: e.target.value });
                      }}
                      placeholder="e.g. PIXELBOOTH"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Seat / Row Text:</label>
                      <input
                        type="text"
                        value={config.customDateText}
                        onChange={(e) => updateConfig({ customDateText: e.target.value })}
                        placeholder="e.g. ROW 02 • SEAT 66"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Barcode Pass ID:</label>
                      <input
                        type="text"
                        value={config.ticket?.barcodeText || ''}
                        onChange={(e) => updateTicket({ barcodeText: e.target.value })}
                        placeholder="e.g. 984021839"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#2D2D2D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Music Track Fields */}
              {(config.style === 'musicplayer' || config.style === 'spotifydark') && (
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6DF] space-y-2 text-xs">
                  <div className="font-bold text-[#2D2D2D] flex items-center gap-1.5 pb-1 border-b border-[#E8E6DF]">
                    <Music className="w-4 h-4 text-purple-600" />
                    <span>Music Player Song Details</span>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Song Title:</label>
                    <input
                      type="text"
                      value={config.musicTrack?.title || config.captionText}
                      onChange={(e) => {
                        updateConfig({ captionText: e.target.value });
                        updateMusicTrack({ title: e.target.value });
                      }}
                      placeholder="e.g. Fix You"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Artist Name:</label>
                    <input
                      type="text"
                      value={config.musicTrack?.artist || config.subCaptionText}
                      onChange={(e) => {
                        updateConfig({ subCaptionText: e.target.value });
                        updateMusicTrack({ artist: e.target.value });
                      }}
                      placeholder="e.g. Coldplay"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>
                </div>
              )}

              {/* Lockscreen Fields */}
              {config.style === 'ioslockscreen' && (
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6DF] space-y-2 text-xs">
                  <div className="font-bold text-[#2D2D2D] flex items-center gap-1.5 pb-1 border-b border-[#E8E6DF]">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>iOS Lockscreen Clock & Song</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Clock Time:</label>
                      <input
                        type="text"
                        value={config.lockscreen?.time || ''}
                        onChange={(e) => updateLockscreen({ time: e.target.value })}
                        placeholder="e.g. 11:26"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#2D2D2D]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666666] font-semibold block mb-0.5">Lockscreen Date:</label>
                      <input
                        type="text"
                        value={config.lockscreen?.date || ''}
                        onChange={(e) => updateLockscreen({ date: e.target.value })}
                        placeholder="e.g. Saturday, Nov 30"
                        className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Song Title:</label>
                    <input
                      type="text"
                      value={config.lockscreen?.songTitle || config.captionText}
                      onChange={(e) => {
                        updateConfig({ captionText: e.target.value });
                        updateLockscreen({ songTitle: e.target.value });
                      }}
                      placeholder="e.g. I Wanna Be Yours"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666666] font-semibold block mb-0.5">Artist Name:</label>
                    <input
                      type="text"
                      value={config.lockscreen?.artistName || config.subCaptionText}
                      onChange={(e) => {
                        updateConfig({ subCaptionText: e.target.value });
                        updateLockscreen({ artistName: e.target.value });
                      }}
                      placeholder="e.g. Arctic Monkeys"
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text & Caption Animation Selector */}
            <div className="space-y-1.5 pt-3 border-t border-[#E8E6DF]">
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
                Caption Animation Effect
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'typewriter', label: 'Typewriter', icon: <Keyboard className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'fadeSlide', label: 'Fade & Slide', icon: <Sparkles className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'pulse', label: 'Soft Glow', icon: <Zap className="w-3 h-3 text-[#FF6B6B]" /> },
                  { id: 'none', label: 'Static', icon: <Square className="w-3 h-3 text-[#FF6B6B]" /> }
                ].map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => updateConfig({ captionAnimation: anim.id as CaptionAnimation })}
                    className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      (config.captionAnimation || 'typewriter') === anim.id
                        ? 'bg-[#FFF5F5] border-[#FF6B6B] text-[#FF6B6B]'
                        : 'bg-[#FAF9F6] border-[#E8E6DF] text-[#666666] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    <span>{anim.icon}</span>
                    <span>{anim.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Caption Generator */}
            <div className="p-4 bg-[#FFF5F5] border border-[#FF6B6B]/20 rounded-2xl space-y-2">
              <div className="flex items-center justify-between font-bold text-[#FF6B6B]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF6B6B]" />
                  <span>AI Caption Generator</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Topic / vibe (e.g. Seoul Trip, Birthday)"
                  className="flex-1 min-w-0 bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D]"
                />
                <button
                  onClick={handleGenerateCaptions}
                  disabled={aiLoading}
                  className="px-3.5 py-1.5 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-xl font-bold flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0"
                >
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
                </button>
              </div>

              {suggestedCaptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestedCaptions.map((cap, i) => (
                    <button
                      key={i}
                      onClick={() => updateConfig({ captionText: cap })}
                      className="px-2.5 py-1 bg-white hover:bg-[#FFE8E8] border border-[#E8E6DF] hover:border-[#FF6B6B] rounded-lg text-[11px] text-[#2D2D2D] font-medium transition-colors"
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= EXPORT TAB ================= */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] mb-2 block">
                7. Export & Print
              </label>
              <p className="text-[#666666] text-[11px]">Download high-resolution PNG images or print-ready PDF sheets.</p>
            </div>

            {/* PNG Export Button */}
            <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#E8E6DF] space-y-3">
              <div className="font-bold text-[#2D2D2D]">1. High-Res PNG Image</div>
              <p className="text-[#666666] text-[11px]">Perfect for sharing on Instagram, TikTok, WhatsApp, or printing.</p>

              <button
                onClick={onExportPNG}
                disabled={isExporting}
                className="w-full py-3 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold rounded-full shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 text-xs"
              >
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Download PNG (High Resolution)</span>
              </button>
            </div>

            {/* Social Share Card */}
            <div className="p-4 bg-[#FFF5F5] border border-[#FF6B6B]/20 rounded-2xl space-y-3">
              <div className="font-bold text-[#FF6B6B] flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-[#FF6B6B]" />
                <span>2. Direct Social Sharing & Links</span>
              </div>
              <p className="text-[#666666] text-[11px]">Instantly post to Instagram, Twitter/X, Facebook, WhatsApp, or copy a shareable link.</p>

              <button
                onClick={onOpenShareModal}
                className="w-full py-3 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold rounded-full shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer text-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Open Social Share Sheet</span>
              </button>
            </div>

            {/* PDF Export Button */}
            <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#E8E6DF] space-y-3">
              <div className="font-bold text-[#2D2D2D]">2. Print-Ready PDF Documents</div>
              <p className="text-[#666666] text-[11px]">Formatted with exact dimensions for home or shop printers.</p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => onExportPDF('2x6')}
                  disabled={isExporting}
                  className="p-2.5 bg-white hover:bg-[#FFF5F5] border border-[#E8E6DF] text-[#2D2D2D] font-semibold rounded-xl text-left flex items-center justify-between transition-colors"
                >
                  <span>2×6 Cut Sheet PDF</span>
                  <FileText className="w-4 h-4 text-[#FF6B6B]" />
                </button>

                <button
                  onClick={() => onExportPDF('4x6_double')}
                  disabled={isExporting}
                  className="p-2.5 bg-white hover:bg-[#FFF5F5] border border-[#E8E6DF] text-[#2D2D2D] font-semibold rounded-xl text-left flex items-center justify-between transition-colors"
                >
                  <span>4×6 Double Strip PDF (Print 2 Side-by-Side)</span>
                  <FileText className="w-4 h-4 text-[#FF6B6B]" />
                </button>

                <button
                  onClick={() => onExportPDF('a4_grid')}
                  disabled={isExporting}
                  className="p-2.5 bg-white hover:bg-[#FFF5F5] border border-[#E8E6DF] text-[#2D2D2D] font-semibold rounded-xl text-left flex items-center justify-between transition-colors"
                >
                  <span>A4 Multi-Strip Paper Grid PDF</span>
                  <FileText className="w-4 h-4 text-[#FF6B6B]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Pro Tip Box (from Vibrant Palette Design HTML) */}
        <div className="mt-auto p-4 bg-[#FFFBF2] border border-[#FFE66D] rounded-2xl flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-[#8B7D4B] leading-snug">
              Pro Tip: Use 'Face Auto-Crop' to center every smile automatically across your photo strip.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
