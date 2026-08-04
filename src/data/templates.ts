import { StripConfiguration, StripStyle } from '../types';

export type TemplateCategory = 'travel' | 'booth' | 'romance' | 'music' | 'vintage';

export interface CategoryInfo {
  id: 'all' | TemplateCategory;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  { id: 'all', name: 'All Templates', icon: '🌟', description: 'Browse all photobooth strip designs' },
  { id: 'travel', name: 'Tickets & Travel', icon: '✈️', description: 'Boarding passes, air mail envelopes & ticket stubs' },
  { id: 'booth', name: 'Photobooth & Studio', icon: '📸', description: 'Classic 2x6, Korean Life 4 Cuts, Selene & polka dots' },
  { id: 'romance', name: 'Romance & Events', icon: '💌', description: 'Wedding bows, love letters, scrapbook & anniversary' },
  { id: 'music', name: 'Music & Tech', icon: '🎵', description: 'Spotify tracks, iOS lockscreen, Y2K & iMessage chat' },
  { id: 'vintage', name: 'Vintage & Film', icon: '🎞️', description: 'Memories archive, 35mm film, Polaroid & newspaper' }
];

export interface TemplateDefinition {
  id: StripStyle;
  name: string;
  category: TemplateCategory;
  tagline: string;
  previewColor: string;
  badgeText: string;
  config: StripConfiguration;
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // --- TICKETS & TRAVEL CATEGORY ---
  {
    id: 'boardingpass',
    name: 'Airline Boarding Pass',
    category: 'travel',
    tagline: 'Airline ticket strip with departure/arrival airport codes, flight info, seats & barcode headers',
    previewColor: '#dc2626',
    badgeText: 'Boarding Pass',
    config: {
      style: 'boardingpass',
      frameType: 'rounded',
      fontType: 'sans',
      background: { type: 'solid', color: '#ffffff' },
      filter: {
        preset: 'normal',
        grain: 10,
        fade: 0,
        warmth: 0,
        contrast: 102,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'URARCHIVE AIRLINES',
      subCaptionText: 'FIRST CLASS BOARDING PASS',
      showDateStamp: true,
      customDateText: 'FLIGHT URC08 • GATE 08',
      framePadding: 10,
      outerPadding: 20,
      photoBorderRadius: 6,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      boardingPass: {
        airlineName: 'URARCHIVE AIRLINES',
        classType: 'FIRST CLASS',
        departureCode: 'JKT',
        departureCity: 'JAKARTA',
        arrivalCode: 'BJM',
        arrivalCity: 'BANJARMASIN',
        flightNo: 'URC08',
        terminal: '8',
        gate: '08',
        seat: '08U'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'airmail',
    name: 'Air Mail Postcard',
    category: 'travel',
    tagline: 'Vintage airmail border with diagonal red/blue stripes, postage stamps, postmarks & signature lines',
    previewColor: '#f3eae1',
    badgeText: 'Air Mail',
    config: {
      style: 'airmail',
      frameType: 'square',
      fontType: 'handwritten',
      background: { type: 'solid', color: '#f3eae1' },
      filter: {
        preset: 'vintageWarm',
        grain: 20,
        fade: 10,
        warmth: 20,
        contrast: 100,
        brightness: 98,
        dustOverlay: false,
        lightLeak: false,
        vignette: true
      },
      captionText: 'Air Mail Postcard',
      subCaptionText: 'Sincerely, With love xoxo',
      showDateStamp: true,
      customDateText: '08.04.2026',
      framePadding: 12,
      outerPadding: 22,
      photoBorderRadius: 4,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      airMail: {
        airMailBadge: 'PAR AVION / BY AIR MAIL',
        postcardTitle: 'Air Mail Postcard',
        stampText: 'AIR MAIL',
        postmarkText: 'WITH LOVE',
        senderNote: 'Sincerely, With love xoxo',
        parcelNo: 'PARCEL NO. 8840-02',
        postDate: '08.04.2026'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'ticketstub',
    name: 'Pixelbooth Ticket Stub',
    category: 'travel',
    tagline: 'Cinema / Concert ticket stub layout with barcodes & side notch cutouts',
    previewColor: '#7f1d1d',
    badgeText: 'Ticket Stub',
    config: {
      style: 'ticketstub',
      frameType: 'ticket',
      fontType: 'typewriter',
      background: { type: 'solid', color: '#7f1d1d' },
      filter: {
        preset: 'normal',
        grain: 15,
        fade: 5,
        warmth: 5,
        contrast: 105,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'Special Day',
      subCaptionText: 'PIXELBOOTH • ADMIT ONE',
      showDateStamp: true,
      customDateText: 'ROW 02 • SEAT 66',
      framePadding: 12,
      outerPadding: 20,
      photoBorderRadius: 4,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      ticket: {
        eventTitle: 'Special Day',
        subtitle: 'PIXELBOOTH',
        barcodeText: '984021839',
        studioName: 'PIXELBOOTH'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },

  // --- PHOTOBOOTH & STUDIO CATEGORY ---
  {
    id: 'classic',
    name: 'Classic Photobooth',
    category: 'booth',
    tagline: '2x6 strip, clean white border, timeless studio look',
    previewColor: '#ffffff',
    badgeText: 'Classic 2x6',
    config: {
      style: 'classic',
      frameType: 'square',
      fontType: 'serif',
      background: { type: 'solid', color: '#ffffff' },
      filter: {
        preset: 'normal',
        grain: 10,
        fade: 5,
        warmth: 0,
        contrast: 100,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'PHOTOBOOTH MEMORIES',
      subCaptionText: 'STUDIO NO. 04',
      showDateStamp: true,
      customDateText: '08.04.2026',
      framePadding: 16,
      outerPadding: 24,
      photoBorderRadius: 4,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: 'Studio No. 4, Downtown',
        date: 'August 4, 2026',
        song: 'As It Was - Harry Styles',
        weather: '☀️ 24°C Sunny',
        shortNote: 'Captured in classic black & white photobooth style.',
        qrEnabled: true,
        qrUrl: 'https://striply.app/share/classic-memory'
      }
    }
  },
  {
    id: 'korean',
    name: 'Korean Photo Booth',
    category: 'booth',
    tagline: 'Soft pastel pinks, cute typography, date stamps & cute stickers',
    previewColor: '#fce7f3',
    badgeText: 'Life 4 Cuts',
    config: {
      style: 'korean',
      frameType: 'rounded',
      fontType: 'cute',
      background: { type: 'solid', color: '#fbcfe8' },
      filter: {
        preset: 'pastel',
        grain: 15,
        fade: 15,
        warmth: 10,
        contrast: 98,
        brightness: 105,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: '인생네컷 • Life 4 Cuts',
      subCaptionText: 'Seoul Memory ✨',
      showDateStamp: true,
      customDateText: '2026.08.04',
      framePadding: 18,
      outerPadding: 22,
      photoBorderRadius: 16,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [
        { id: 'k-stk-1', symbol: '🎀', x: 82, y: 4, scale: 1.2, rotation: 12 },
        { id: 'k-stk-2', symbol: '✨', x: 12, y: 92, scale: 1.1, rotation: -8 }
      ],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: true,
        location: 'Hongdae Street, Seoul',
        date: '2026.08.04',
        song: 'Ditto - NewJeans',
        weather: '🌸 Warm Spring Breeze',
        shortNote: 'Cute four cuts captured with best friends in Seoul! ✨',
        qrEnabled: true,
        qrUrl: 'https://striply.app/korean-four-cuts'
      }
    }
  },
  {
    id: 'selene',
    name: 'Selene Film Reel',
    category: 'booth',
    tagline: 'Dark film strip with sprocket holes, Selene script & care symbols',
    previewColor: '#18181b',
    badgeText: 'Selene Reel',
    config: {
      style: 'selene',
      frameType: 'film',
      fontType: 'handwritten',
      background: { type: 'solid', color: '#121212' },
      filter: {
        preset: 'bwNoir',
        grain: 25,
        fade: 10,
        warmth: -5,
        contrast: 115,
        brightness: 95,
        dustOverlay: true,
        lightLeak: false,
        vignette: true
      },
      captionText: 'Selene',
      subCaptionText: 'STUDIO REEL • 35MM',
      showDateStamp: false,
      customDateText: '2026',
      framePadding: 14,
      outerPadding: 24,
      photoBorderRadius: 2,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: 'Selene Studio',
        date: '2026',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'polkadot',
    name: 'Snapobox Polka Dot',
    category: 'booth',
    tagline: 'Black & white polka dot background with handwritten studio logo',
    previewColor: '#121212',
    badgeText: 'Polka Dot',
    config: {
      style: 'polkadot',
      frameType: 'square',
      fontType: 'handwritten',
      background: { type: 'pattern', color: '#121212', patternName: 'polka' },
      filter: {
        preset: 'normal',
        grain: 15,
        fade: 5,
        warmth: 0,
        contrast: 100,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'SNAPOBOX',
      subCaptionText: 'STUDIO NO. 1',
      showDateStamp: true,
      customDateText: '08.04.26',
      framePadding: 16,
      outerPadding: 24,
      photoBorderRadius: 2,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'boothycall',
    name: 'Boothy Call Circles',
    category: 'booth',
    tagline: 'Circular photo cutouts on giant red polka dots with Boothy Call heart logo',
    previewColor: '#7f1d1d',
    badgeText: 'Boothy Call',
    config: {
      style: 'boothycall',
      frameType: 'circle',
      fontType: 'handwritten',
      background: { type: 'pattern', color: '#991b1b', patternName: 'polka' },
      filter: {
        preset: 'bwNoir',
        grain: 20,
        fade: 5,
        warmth: 0,
        contrast: 110,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'Boothy Call',
      subCaptionText: 'ring ring... 📞❤️',
      showDateStamp: true,
      customDateText: '08.04.26',
      framePadding: 10,
      outerPadding: 20,
      photoBorderRadius: 999,
      photoGap: 16,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },

  // --- ROMANCE & EVENTS CATEGORY ---
  {
    id: 'weddingribbon',
    name: 'Wedding Scalloped Bows',
    category: 'romance',
    tagline: 'Navy blue & slate strip with delicate bow ties around scalloped photo frames',
    previewColor: '#1e3a8a',
    badgeText: 'Wedding Bows',
    config: {
      style: 'weddingribbon',
      frameType: 'bowRibbon',
      fontType: 'handwritten',
      background: { type: 'solid', color: '#1e293b' },
      filter: {
        preset: 'normal',
        grain: 10,
        fade: 5,
        warmth: 5,
        contrast: 100,
        brightness: 102,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'The Wedding of',
      subCaptionText: 'Najla & Ridwan',
      showDateStamp: true,
      customDateText: '06 Juni 2026',
      framePadding: 12,
      outerPadding: 22,
      photoBorderRadius: 16,
      photoGap: 16,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'wedding',
    name: 'Wedding Minimalist',
    category: 'romance',
    tagline: 'Clean white strip, large elegant date stamp & couple names',
    previewColor: '#ffffff',
    badgeText: 'Wedding Elegant',
    config: {
      style: 'wedding',
      frameType: 'borderless',
      fontType: 'sans',
      background: { type: 'solid', color: '#ffffff' },
      filter: {
        preset: 'goldenHour',
        grain: 10,
        fade: 5,
        warmth: 15,
        contrast: 100,
        brightness: 102,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: '08.07.26',
      subCaptionText: 'Brooklyn & Cory',
      showDateStamp: false,
      customDateText: '08.07.26',
      framePadding: 12,
      outerPadding: 22,
      photoBorderRadius: 4,
      photoGap: 16,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'iloveyou',
    name: 'I ❤ YOU Headline',
    category: 'romance',
    tagline: 'Giant bold vintage I ❤ YOU header in classic serif typography',
    previewColor: '#ffffff',
    badgeText: 'I ❤ YOU',
    config: {
      style: 'iloveyou',
      frameType: 'square',
      fontType: 'serif',
      background: { type: 'solid', color: '#ffffff' },
      filter: {
        preset: 'bwNoir',
        grain: 20,
        fade: 5,
        warmth: 0,
        contrast: 110,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'I ❤️ YOU',
      subCaptionText: 'FOREVER & ALWAYS',
      showDateStamp: false,
      customDateText: '2026',
      framePadding: 14,
      outerPadding: 24,
      photoBorderRadius: 2,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'lipstick',
    name: 'Lipstick & Scrapbook',
    category: 'romance',
    tagline: 'Red lipstick kiss prints, love notes, red hearts & scrapbook tears',
    previewColor: '#fff0f3',
    badgeText: 'Scrapbook Kiss',
    config: {
      style: 'lipstick',
      frameType: 'torn',
      fontType: 'handwritten',
      background: { type: 'solid', color: '#fff0f3' },
      filter: {
        preset: 'pastel',
        grain: 25,
        fade: 15,
        warmth: 15,
        contrast: 98,
        brightness: 105,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'i love love love you',
      subCaptionText: 'always & forever 💋',
      showDateStamp: true,
      customDateText: '08.04.2026',
      framePadding: 16,
      outerPadding: 22,
      photoBorderRadius: 6,
      photoGap: 16,
      showTimelineLabels: false,
      stickerList: [
        { id: 'lip-1', symbol: '💋', x: 82, y: 5, scale: 1.4, rotation: 15 },
        { id: 'lip-2', symbol: '❤️', x: 12, y: 92, scale: 1.3, rotation: -10 }
      ],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'callmebyname',
    name: 'Call Me By Your Name',
    category: 'romance',
    tagline: 'Blush vintage beige canvas with muted warm monochrome photos',
    previewColor: '#ebe1d9',
    badgeText: 'Blush Vintage',
    config: {
      style: 'callmebyname',
      frameType: 'rounded',
      fontType: 'serif',
      background: { type: 'solid', color: '#ebe1d9' },
      filter: {
        preset: 'vintageWarm',
        grain: 20,
        fade: 15,
        warmth: 20,
        contrast: 98,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: true
      },
      captionText: 'Somewhere in Northern Italy',
      subCaptionText: 'Call Me By Your Name',
      showDateStamp: true,
      customDateText: 'SUMMER 1983',
      framePadding: 14,
      outerPadding: 20,
      photoBorderRadius: 8,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },

  // --- MUSIC & TECH CATEGORY ---
  {
    id: 'musicplayer',
    name: 'Lavender Spotify Track',
    category: 'music',
    tagline: 'Soft pastel purple strip with music player title & playback bar',
    previewColor: '#d8bfd8',
    badgeText: 'Spotify Track',
    config: {
      style: 'musicplayer',
      frameType: 'rounded',
      fontType: 'sans',
      background: { type: 'solid', color: '#d8bfd8' },
      filter: {
        preset: 'pastel',
        grain: 12,
        fade: 10,
        warmth: 10,
        contrast: 100,
        brightness: 104,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'Fix You',
      subCaptionText: 'Coldplay • Parachutes',
      showDateStamp: false,
      customDateText: 'MSDK ♡',
      framePadding: 16,
      outerPadding: 22,
      photoBorderRadius: 10,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      musicTrack: {
        title: 'Fix You',
        artist: 'Coldplay'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'spotifydark',
    name: 'Spotify Dark SNOOZE',
    category: 'music',
    tagline: 'Deep dark background with Spotify green accents & progress bar',
    previewColor: '#121212',
    badgeText: 'Spotify Dark',
    config: {
      style: 'spotifydark',
      frameType: 'rounded',
      fontType: 'sans',
      background: { type: 'solid', color: '#121212' },
      filter: {
        preset: 'normal',
        grain: 10,
        fade: 0,
        warmth: 0,
        contrast: 105,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'SNOOZE',
      subCaptionText: 'SZA • SOS',
      showDateStamp: false,
      customDateText: 'SPOTIFY',
      framePadding: 12,
      outerPadding: 20,
      photoBorderRadius: 8,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      musicTrack: {
        title: 'SNOOZE',
        artist: 'SZA',
        accentColor: '#1DB954'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'ioslockscreen',
    name: 'iPhone Lockscreen',
    category: 'music',
    tagline: 'iOS clock header 11:26, date & music widget player at bottom',
    previewColor: '#27272a',
    badgeText: 'iOS Lockscreen',
    config: {
      style: 'ioslockscreen',
      frameType: 'rounded',
      fontType: 'sans',
      background: { type: 'solid', color: '#27272a' },
      filter: {
        preset: 'normal',
        grain: 15,
        fade: 5,
        warmth: 0,
        contrast: 102,
        brightness: 98,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'I Wanna Be Yours',
      subCaptionText: 'Arctic Monkeys — AM',
      showDateStamp: false,
      customDateText: '11:26',
      framePadding: 12,
      outerPadding: 20,
      photoBorderRadius: 12,
      photoGap: 10,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      lockscreen: {
        time: '11:26',
        date: 'Saturday, November 30',
        songTitle: 'I Wanna Be Yours',
        artistName: 'Arctic Monkeys'
      },
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'imessage',
    name: 'iMessage Reactions',
    category: 'music',
    tagline: 'iOS iMessage reaction bubbles (❤️, 👍, 😮) over photos & bottom chat bar',
    previewColor: '#e5e7eb',
    badgeText: 'iMessage Chat',
    config: {
      style: 'imessage',
      frameType: 'rounded',
      fontType: 'sans',
      background: { type: 'solid', color: '#f3f4f6' },
      filter: {
        preset: 'normal',
        grain: 10,
        fade: 5,
        warmth: 0,
        contrast: 100,
        brightness: 102,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'LeMora Pix',
      subCaptionText: 'Tap and hold to super react',
      showDateStamp: true,
      customDateText: '1:22 AM',
      framePadding: 12,
      outerPadding: 20,
      photoBorderRadius: 16,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'y2kblue',
    name: 'Y2K Cobalt Moment',
    category: 'music',
    tagline: 'Electric cobalt blue background, "EVERY MOMENT 1.0" & barcodes',
    previewColor: '#1d4ed8',
    badgeText: 'Y2K Cobalt',
    config: {
      style: 'y2kblue',
      frameType: 'square',
      fontType: 'retro',
      background: { type: 'solid', color: '#1d4ed8' },
      filter: {
        preset: 'cyberFilm',
        grain: 20,
        fade: 0,
        warmth: -10,
        contrast: 115,
        brightness: 100,
        dustOverlay: false,
        lightLeak: true,
        vignette: false
      },
      captionText: 'EVERY MOMENT 1.0',
      subCaptionText: 'DIGITAL ARCHIVE • 2000s',
      showDateStamp: true,
      customDateText: '2000.08.04',
      framePadding: 12,
      outerPadding: 20,
      photoBorderRadius: 6,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },

  // --- VINTAGE & FILM CATEGORY ---
  {
    id: 'memoriesarchive',
    name: 'Memories Archive Stamp',
    category: 'vintage',
    tagline: 'Cream/black vintage strip with "GOOD VIBES" stamp, tape strips, red seal & pass barcode',
    previewColor: '#f7f4ec',
    badgeText: 'Archive Stamp',
    config: {
      style: 'memoriesarchive',
      frameType: 'square',
      fontType: 'serif',
      background: { type: 'solid', color: '#f7f4ec' },
      filter: {
        preset: 'normal',
        grain: 15,
        fade: 5,
        warmth: 10,
        contrast: 105,
        brightness: 98,
        dustOverlay: false,
        lightLeak: false,
        vignette: true
      },
      captionText: 'MEMORIES archive',
      subCaptionText: 'THE BEST MEMORIES ARE MADE TOGETHER',
      showDateStamp: true,
      customDateText: 'PASS NO. 0724 0608 2024',
      framePadding: 10,
      outerPadding: 20,
      photoBorderRadius: 2,
      photoGap: 10,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'editorial',
    name: 'EXCLUSIVE Editorial',
    category: 'vintage',
    tagline: 'Newspaper masthead headline "EXCLUSIVE" and "yeppo" footer mark',
    previewColor: '#ffffff',
    badgeText: 'Magazine Edit',
    config: {
      style: 'editorial',
      frameType: 'square',
      fontType: 'serif',
      background: { type: 'solid', color: '#ffffff' },
      filter: {
        preset: 'bwNoir',
        grain: 20,
        fade: 5,
        warmth: 0,
        contrast: 120,
        brightness: 98,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'EXCLUSIVE',
      subCaptionText: '08/08 • POSE, CLICK, REPEAT • 2026',
      showDateStamp: true,
      customDateText: 'yeppo 👧 yeppo 👧 yeppo',
      framePadding: 10,
      outerPadding: 20,
      photoBorderRadius: 2,
      photoGap: 10,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'film',
    name: 'Film Strip Sprocket',
    category: 'vintage',
    tagline: 'Kodak-inspired sprocket holes, dark frame, frame numbers',
    previewColor: '#18181b',
    badgeText: 'Kodak 400',
    config: {
      style: 'film',
      frameType: 'film',
      fontType: 'typewriter',
      background: { type: 'solid', color: '#111113' },
      filter: {
        preset: 'vintageWarm',
        grain: 40,
        fade: 20,
        warmth: 25,
        contrast: 110,
        brightness: 95,
        dustOverlay: true,
        lightLeak: true,
        vignette: true
      },
      captionText: 'KODAK PORTRA 400',
      subCaptionText: '35MM FILM • EXP 24',
      showDateStamp: true,
      customDateText: 'AUG 2026',
      framePadding: 20,
      outerPadding: 28,
      photoBorderRadius: 2,
      photoGap: 16,
      showTimelineLabels: true,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: true,
        location: 'Pacific Coast Highway',
        date: 'Aug 04, 2026',
        song: 'Dreams - Fleetwood Mac',
        weather: '🌅 Golden Sunset',
        shortNote: 'Shot on 35mm analogue film roll #04. Unedited grain and warmth.',
        qrEnabled: true,
        qrUrl: 'https://striply.app/35mm-roll-04'
      }
    }
  },
  {
    id: 'polaroid',
    name: 'Polaroid Strip',
    category: 'vintage',
    tagline: 'Individual instant Polaroid frames with handwritten captions',
    previewColor: '#fef3c7',
    badgeText: 'Instant Film',
    config: {
      style: 'polaroid',
      frameType: 'shadow',
      fontType: 'handwritten',
      background: { type: 'solid', color: '#fef08a' },
      filter: {
        preset: 'goldenHour',
        grain: 25,
        fade: 25,
        warmth: 20,
        contrast: 95,
        brightness: 102,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'Summer 2026 ❤️',
      subCaptionText: 'First Date & Beach Days',
      showDateStamp: true,
      customDateText: '08/04/26',
      framePadding: 20,
      outerPadding: 24,
      photoBorderRadius: 4,
      photoGap: 20,
      showTimelineLabels: false,
      stickerList: [
        { id: 'p-stk-1', symbol: '❤️', x: 85, y: 94, scale: 1.3, rotation: 15 }
      ],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: true,
        location: 'Santa Monica Pier',
        date: 'August 04, 2026',
        song: 'Lover - Taylor Swift',
        weather: '☀️ 26°C Beach Breeze',
        shortNote: 'Instant memories shake like a Polaroid picture!',
        qrEnabled: true,
        qrUrl: 'https://striply.app/polaroid-instant'
      }
    }
  },
  {
    id: 'retro90s',
    name: 'Retro 90s Flash',
    category: 'vintage',
    tagline: 'Yellow/orange digital LED timestamp, film grain & flash burn',
    previewColor: '#451a03',
    badgeText: 'Camcorder \'98',
    config: {
      style: 'retro90s',
      frameType: 'vintage',
      fontType: 'retro',
      background: { type: 'solid', color: '#1c1917' },
      filter: {
        preset: 'retro90s',
        grain: 55,
        fade: 10,
        warmth: 30,
        contrast: 115,
        brightness: 105,
        dustOverlay: true,
        lightLeak: true,
        vignette: true
      },
      captionText: 'DISPOSABLE CAM \'98',
      subCaptionText: 'AUTO FLASH ON',
      showDateStamp: true,
      customDateText: '\'98 08 04',
      framePadding: 16,
      outerPadding: 24,
      photoBorderRadius: 2,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [
        { id: 'r-stk-1', symbol: '⭐', x: 8, y: 6, scale: 1.2, rotation: -12 },
        { id: 'r-stk-2', symbol: '📸', x: 88, y: 88, scale: 1.1, rotation: 10 }
      ],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: 'Downtown Arcade',
        date: '08.04.1998',
        song: 'Wannabe - Spice Girls',
        weather: '🌙 Midnight Neon',
        shortNote: 'Shot on Fujicolor Disposable 27 Exp flash camera.',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'stripes',
    name: 'Retro Bowling Stripes',
    category: 'vintage',
    tagline: 'Bold vertical maroon & sky blue striped frame with PhotoTrend mark',
    previewColor: '#8b263e',
    badgeText: 'Collegiate Stripe',
    config: {
      style: 'stripes',
      frameType: 'square',
      fontType: 'serif',
      background: { type: 'pattern', color: '#8b263e', patternName: 'bowling' },
      filter: {
        preset: 'vintageWarm',
        grain: 20,
        fade: 10,
        warmth: 15,
        contrast: 105,
        brightness: 98,
        dustOverlay: false,
        lightLeak: false,
        vignette: true
      },
      captionText: 'PhotoTrend',
      subCaptionText: 'RETRO EDITION',
      showDateStamp: false,
      customDateText: '1979',
      framePadding: 16,
      outerPadding: 24,
      photoBorderRadius: 0,
      photoGap: 14,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'scalloped',
    name: 'Scalloped Wavy Frame',
    category: 'vintage',
    tagline: 'Decorative scalloped wavy border frame in playful pastel colors',
    previewColor: '#fbcfe8',
    badgeText: 'Wavy Scallop',
    config: {
      style: 'scalloped',
      frameType: 'scalloped',
      fontType: 'cute',
      background: { type: 'solid', color: '#fbcfe8' },
      filter: {
        preset: 'pastel',
        grain: 10,
        fade: 10,
        warmth: 5,
        contrast: 100,
        brightness: 105,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'sweet memories',
      subCaptionText: 'xoxo ✨',
      showDateStamp: true,
      customDateText: '08.04.26',
      framePadding: 16,
      outerPadding: 22,
      photoBorderRadius: 12,
      photoGap: 12,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: '',
        date: '',
        song: '',
        weather: '',
        shortNote: '',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal Gallery',
    category: 'vintage',
    tagline: 'Apple-inspired clean layout, subtle border, typography elegance',
    previewColor: '#f4f4f5',
    badgeText: 'Minimalist',
    config: {
      style: 'minimal',
      frameType: 'borderless',
      fontType: 'sans',
      background: { type: 'solid', color: '#f8fafc' },
      filter: {
        preset: 'normal',
        grain: 0,
        fade: 0,
        warmth: 0,
        contrast: 100,
        brightness: 100,
        dustOverlay: false,
        lightLeak: false,
        vignette: false
      },
      captionText: 'A S T R A L',
      subCaptionText: 'Volume 01',
      showDateStamp: true,
      customDateText: '08.04.26',
      framePadding: 14,
      outerPadding: 20,
      photoBorderRadius: 8,
      photoGap: 10,
      showTimelineLabels: false,
      stickerList: [],
      exportFormat: 'strip2x6',
      memoryCard: {
        enabled: false,
        location: 'Modern Art Pavilion',
        date: '2026.08.04',
        song: 'Experience - Ludovico Einaudi',
        weather: '☁️ 19°C Calm',
        shortNote: 'Framed in pure architectural minimalism.',
        qrEnabled: false,
        qrUrl: ''
      }
    }
  }
];
