export interface StickerItem {
  id: string;
  symbol: string;
  label: string;
  category: 'hearts' | 'sparkles' | 'cute' | 'retro' | 'tape' | 'doodles';
}

export const STICKER_COLLECTION: StickerItem[] = [
  // Hearts & Love
  { id: 's-h1', symbol: '❤️', label: 'Red Heart', category: 'hearts' },
  { id: 's-h2', symbol: '💖', label: 'Sparkle Heart', category: 'hearts' },
  { id: 's-h3', symbol: '💗', label: 'Growing Heart', category: 'hearts' },
  { id: 's-h4', symbol: '🤍', label: 'White Heart', category: 'hearts' },
  { id: 's-h5', symbol: '🖤', label: 'Black Heart', category: 'hearts' },
  { id: 's-h6', symbol: '💌', label: 'Love Letter', category: 'hearts' },

  // Sparkles & Stars
  { id: 's-sp1', symbol: '✨', label: 'Sparkles', category: 'sparkles' },
  { id: 's-sp2', symbol: '⭐', label: 'Gold Star', category: 'sparkles' },
  { id: 's-sp3', symbol: '🌟', label: 'Glowing Star', category: 'sparkles' },
  { id: 's-sp4', symbol: '💫', label: 'Dizzy Star', category: 'sparkles' },
  { id: 's-sp5', symbol: '🌙', label: 'Crescent Moon', category: 'sparkles' },
  { id: 's-sp6', symbol: '☀️', label: 'Sun', category: 'sparkles' },

  // Cute & Aesthetic
  { id: 's-c1', symbol: '🎀', label: 'Ribbon', category: 'cute' },
  { id: 's-c2', symbol: '🌸', label: 'Cherry Blossom', category: 'cute' },
  { id: 's-c3', symbol: '☁️', label: 'Cloud', category: 'cute' },
  { id: 's-c4', symbol: '🐻', label: 'Cute Bear', category: 'cute' },
  { id: 's-c5', symbol: '🐰', label: 'Bunny', category: 'cute' },
  { id: 's-c6', symbol: '🐱', label: 'Kitty', category: 'cute' },
  { id: 's-c7', symbol: '🍒', label: 'Cherries', category: 'cute' },
  { id: 's-c8', symbol: '🍰', label: 'Shortcake', category: 'cute' },

  // Retro & Camera
  { id: 's-r1', symbol: '📸', label: 'Camera', category: 'retro' },
  { id: 's-r2', symbol: '🎞️', label: 'Film Frame', category: 'retro' },
  { id: 's-r3', symbol: '📹', label: 'Camcorder', category: 'retro' },
  { id: 's-r4', symbol: '📼', label: 'VHS Tape', category: 'retro' },
  { id: 's-r5', symbol: '🎧', label: 'Headphones', category: 'retro' },
  { id: 's-r6', symbol: '✌️', label: 'Peace Hand', category: 'retro' },
  { id: 's-r7', symbol: '🍹', label: 'Summer Drink', category: 'retro' },
  { id: 's-r8', symbol: '🕶️', label: 'Sunglasses', category: 'retro' },

  // Tape & Doodles
  { id: 's-d1', symbol: '🩹', label: 'Washi Tape', category: 'tape' },
  { id: 's-d2', symbol: '📌', label: 'Pushpin', category: 'tape' },
  { id: 's-d3', symbol: '🏷️', label: 'Tag', category: 'tape' },
  { id: 's-d4', symbol: '✏️', label: 'Scribble', category: 'doodles' },
  { id: 's-d5', symbol: '➡️', label: 'Arrow', category: 'doodles' },
  { id: 's-d6', symbol: '😊', label: 'Smiley', category: 'doodles' },
  { id: 's-d7', symbol: '🎉', label: 'Popper', category: 'doodles' },
  { id: 's-d8', symbol: '👑', label: 'Crown', category: 'doodles' }
];

export const BACKGROUND_PRESETS = [
  { id: 'bg-white', name: 'Studio White', color: '#ffffff', type: 'solid' },
  { id: 'bg-cream', name: 'Warm Cream', color: '#fef3c7', type: 'solid' },
  { id: 'bg-beige', name: 'Vintage Beige', color: '#f5f5dc', type: 'solid' },
  { id: 'bg-lavender', name: 'Soft Lavender', color: '#e0e7ff', type: 'solid' },
  { id: 'bg-pink', name: 'Pastel Pink', color: '#fce7f3', type: 'solid' },
  { id: 'bg-blue', name: 'Sky Blue', color: '#e0f2fe', type: 'solid' },
  { id: 'bg-green', name: 'Matcha Green', color: '#dcfce7', type: 'solid' },
  { id: 'bg-charcoal', name: 'Matte Charcoal', color: '#27272a', type: 'solid' },
  { id: 'bg-black', name: 'Midnight Black', color: '#09090b', type: 'solid' },
  { id: 'bg-grad-sunset', name: 'Sunset Gradient', color: '#fef3c7', gradientTo: '#fbcfe8', type: 'gradient' },
  { id: 'bg-grad-cosmic', name: 'Cosmic Gradient', color: '#e0e7ff', gradientTo: '#fce7f3', type: 'gradient' },
  { id: 'bg-grid', name: 'Notebook Grid', color: '#f8fafc', patternName: 'grid', type: 'pattern' },
  { id: 'bg-dots', name: 'Polka Dots', color: '#fff1f2', patternName: 'dots', type: 'pattern' },
  { id: 'bg-hearts', name: 'Tiny Hearts', color: '#fdf2f8', patternName: 'hearts', type: 'pattern' }
];
