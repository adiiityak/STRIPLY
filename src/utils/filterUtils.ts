import { FilterSettings } from '../types';

export function getFilterCSS(filter: FilterSettings): string {
  const contrast = filter.contrast / 100;
  const brightness = filter.brightness / 100;
  let sepia = 0;
  let saturate = 1;
  let hueRotate = 0;

  switch (filter.preset) {
    case 'vintageWarm':
      sepia = 0.25;
      saturate = 1.1;
      hueRotate = -5;
      break;
    case 'bwNoir':
      sepia = 0.05;
      saturate = 0;
      break;
    case 'retro90s':
      sepia = 0.3;
      saturate = 1.25;
      hueRotate = -10;
      break;
    case 'pastel':
      sepia = 0.1;
      saturate = 0.9;
      hueRotate = 5;
      break;
    case 'cyberFilm':
      sepia = 0;
      saturate = 1.3;
      hueRotate = 15;
      break;
    case 'sepia':
      sepia = 0.7;
      saturate = 0.9;
      break;
    case 'goldenHour':
      sepia = 0.2;
      saturate = 1.2;
      hueRotate = -8;
      break;
    case 'normal':
    default:
      break;
  }

  // Adjust warmth
  if (filter.warmth > 0) {
    sepia += (filter.warmth / 100) * 0.3;
  } else if (filter.warmth < 0) {
    hueRotate += (filter.warmth / 100) * 20;
  }

  return `contrast(${contrast}) brightness(${brightness}) sepia(${sepia}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;
}

/**
 * Opacity of the grain overlay.
 *
 * Capped well below 1: the slider is a strength dial, and grain at full alpha
 * would bury the photo rather than age it.
 */
export function getGrainOpacity(filter: FilterSettings): number {
  return (filter.grain / 100) * 0.45;
}

export function getFadeOpacity(filter: FilterSettings): number {
  return (filter.fade / 100) * 0.25;
}
