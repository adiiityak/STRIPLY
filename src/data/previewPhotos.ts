import type { PhotoItem } from '../types';

const EMPTY_PREVIEW_SLOT =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"%3E%3C/svg%3E';

export const PREVIEW_PHOTOS: PhotoItem[] = Array.from({ length: 4 }, (_, index) => ({
  id: `preview-${index + 1}`,
  url: EMPTY_PREVIEW_SLOT,
  cropX: 50,
  cropY: 50,
  zoom: 1
}));
