export type StripStyle =
  | 'classic'
  | 'korean'
  | 'film'
  | 'polaroid'
  | 'retro90s'
  | 'minimal'
  | 'selene'
  | 'wedding'
  | 'callmebyname'
  | 'blackframe'
  | 'parchment'
  | 'lipstick'
  | 'musicplayer'
  | 'ioslockscreen'
  | 'spotifydark'
  | 'iloveyou'
  | 'polkadot'
  | 'stripes'
  | 'scalloped'
  | 'ticketstub'
  | 'y2kblue'
  | 'imessage'
  | 'editorial'
  | 'boardingpass'
  | 'weddingribbon'
  | 'airmail'
  | 'boothycall'
  | 'memoriesarchive';

export type FrameType = 'rounded' | 'square' | 'film' | 'torn' | 'vintage' | 'shadow' | 'borderless' | 'scalloped' | 'ticket' | 'parchment' | 'circle' | 'bowRibbon';

export type FontType = 'handwritten' | 'serif' | 'sans' | 'typewriter' | 'retro' | 'cute';

export interface PhotoItem {
  id: string;
  url: string;
  originalUrl?: string;
  caption?: string;
  yearLabel?: string;
  cropY?: number; // 0 to 100% focal offset
  cropX?: number; // 0 to 100% focal offset
  zoom?: number; // 1 to 2x zoom
  rotation?: number; // 0, 90, 180, 270
}

export type FilterPreset = 'normal' | 'vintageWarm' | 'bwNoir' | 'retro90s' | 'pastel' | 'cyberFilm' | 'sepia' | 'goldenHour';

export interface FilterSettings {
  preset: FilterPreset;
  grain: number; // 0 - 100
  fade: number; // 0 - 100
  warmth: number; // -50 to +50
  contrast: number; // 50 to 150
  brightness: number; // 50 to 150
  dustOverlay: boolean;
  lightLeak: boolean;
  vignette: boolean;
}

export interface PlacedSticker {
  id: string;
  symbol: string;
  x: number; // percentage of canvas width (0 - 100)
  y: number; // percentage of canvas height (0 - 100)
  scale: number; // 0.5 to 2.5
  rotation: number; // -180 to 180
}

export interface BackgroundSetting {
  type: 'solid' | 'gradient' | 'pattern';
  color: string;
  gradientTo?: string;
  patternName?: 'dots' | 'grid' | 'hearts' | 'stripes' | 'noise' | 'polka' | 'bowling' | 'scalloped';
}

export interface MemoryCardDetails {
  enabled: boolean;
  location: string;
  date: string;
  song: string;
  weather: string;
  shortNote: string;
  qrEnabled: boolean;
  qrUrl: string;
}

export type ExportFormat = 'strip2x6' | 'strip4x6' | 'igStory' | 'igPost' | 'wallpaper' | 'a4Print';

export type PhotoLayout = 'vertical-1x4' | 'grid-2x2';

export type StickerAnimation = 'float' | 'bounce' | 'sway' | 'none';

export type CaptionAnimation = 'typewriter' | 'fadeSlide' | 'pulse' | 'none';

export interface MusicTrackInfo {
  title: string;
  artist: string;
  albumUrl?: string;
  accentColor?: string;
}

export interface LockscreenInfo {
  time: string;
  date: string;
  songTitle?: string;
  artistName?: string;
}

export interface TicketInfo {
  eventTitle: string;
  subtitle: string;
  barcodeText: string;
  studioName: string;
}

export interface BoardingPassInfo {
  airlineName: string;
  classType: string;
  departureCode: string;
  departureCity: string;
  arrivalCode: string;
  arrivalCity: string;
  flightNo: string;
  terminal: string;
  gate: string;
  seat: string;
}

export interface AirMailInfo {
  airMailBadge?: string;
  postcardTitle?: string;
  stampText?: string;
  postmarkText?: string;
  senderNote?: string;
  parcelNo?: string;
  postDate?: string;
}

export interface StripConfiguration {
  style: StripStyle;
  frameType: FrameType;
  fontType: FontType;
  background: BackgroundSetting;
  filter: FilterSettings;
  captionText: string;
  subCaptionText: string;
  showDateStamp: boolean;
  customDateText: string;
  framePadding: number; // inner photo padding
  outerPadding: number; // strip margin
  photoBorderRadius: number;
  photoGap: number;
  photoCount: number; // 2-6 photo slots; strip height stays constant across counts
  memoryCard: MemoryCardDetails;
  showTimelineLabels: boolean;
  stickerList: PlacedSticker[];
  exportFormat: ExportFormat;
  photoLayout: PhotoLayout;
  stickerAnimation?: StickerAnimation;
  captionAnimation?: CaptionAnimation;

  // Custom Pinterest Template Settings
  musicTrack?: MusicTrackInfo;
  lockscreen?: LockscreenInfo;
  ticket?: TicketInfo;
  boardingPass?: BoardingPassInfo;
  airMail?: AirMailInfo;
}
