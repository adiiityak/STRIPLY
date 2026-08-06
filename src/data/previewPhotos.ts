import type { PhotoItem } from '../types';

function portraitSvg(from: string, to: string, shirt: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="600" height="450" fill="url(#g)"/><circle cx="300" cy="185" r="82" fill="#f2c6a5"/>
    <path d="M205 450c8-105 52-155 95-155s87 50 95 155" fill="${shirt}"/><path d="M224 172c8-88 146-109 161 7-35-42-112-55-161-7" fill="#302822"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PREVIEW_PHOTOS: PhotoItem[] = [
  ['#ffd6e7', '#fef3c7', '#be185d'],
  ['#dbeafe', '#ede9fe', '#3730a3'],
  ['#dcfce7', '#cffafe', '#0f766e'],
  ['#ffedd5', '#fee2e2', '#c2410c']
].map(([from, to, shirt], index) => ({
  id: `preview-${index + 1}`,
  url: portraitSvg(from, to, shirt),
  cropX: 50,
  cropY: 50,
  zoom: 1
}));
