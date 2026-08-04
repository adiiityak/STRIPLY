import { PhotoItem } from '../types';

export interface SampleSet {
  id: string;
  name: string;
  icon: string;
  photos: PhotoItem[];
}

export const SAMPLE_PHOTO_SETS: SampleSet[] = [
  {
    id: 'korean_cafe',
    name: 'Seoul Cafe Vibes',
    icon: '🌸',
    photos: [
      {
        id: 'sample-k1',
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        caption: 'Matcha Latte Hour 🍵',
        yearLabel: '2024'
      },
      {
        id: 'sample-k2',
        url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
        caption: 'Best Friends Forever 💖',
        yearLabel: '2025'
      },
      {
        id: 'sample-k3',
        url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
        caption: 'Laughs & Hugs ✨',
        yearLabel: '2025'
      },
      {
        id: 'sample-k4',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        caption: 'Golden Hour Smile ☀️',
        yearLabel: '2026'
      }
    ]
  },
  {
    id: 'summer_roadtrip',
    name: 'Summer Roadtrip',
    icon: '🌊',
    photos: [
      {
        id: 'sample-s1',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        caption: 'Coastline Views 🏖️',
        yearLabel: 'Day 1'
      },
      {
        id: 'sample-s2',
        url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        caption: 'Van Life Memories 🚐',
        yearLabel: 'Day 2'
      },
      {
        id: 'sample-s3',
        url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80',
        caption: 'Sunset Beach Swim 🌅',
        yearLabel: 'Day 3'
      },
      {
        id: 'sample-s4',
        url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
        caption: 'Campfire Stories 🔥',
        yearLabel: 'Day 4'
      }
    ]
  },
  {
    id: 'couple_memories',
    name: 'First Date & Love',
    icon: '❤️',
    photos: [
      {
        id: 'sample-c1',
        url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
        caption: 'First Coffee Date ☕',
        yearLabel: '2023'
      },
      {
        id: 'sample-c2',
        url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
        caption: 'Holding Hands 🤝',
        yearLabel: '2024'
      },
      {
        id: 'sample-c3',
        url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
        caption: 'Stargazing Night ⭐',
        yearLabel: '2025'
      },
      {
        id: 'sample-c4',
        url: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=800&q=80',
        caption: 'Forever & Always 💍',
        yearLabel: '2026'
      }
    ]
  },
  {
    id: 'retro_party',
    name: '90s Film Night',
    icon: '🎞️',
    photos: [
      {
        id: 'sample-r1',
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        caption: 'Neon Party Flash ⚡',
        yearLabel: '1998'
      },
      {
        id: 'sample-r2',
        url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        caption: 'Midnight Jam 🎸',
        yearLabel: '1998'
      },
      {
        id: 'sample-r3',
        url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        caption: 'Retro Vinyl Beats 🎧',
        yearLabel: '1999'
      },
      {
        id: 'sample-r4',
        url: 'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&w=800&q=80',
        caption: 'Confetti After Dark 🎉',
        yearLabel: '1999'
      }
    ]
  }
];
