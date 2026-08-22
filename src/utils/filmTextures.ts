/**
 * Film grain and dust as tiling textures.
 *
 * These are deliberately plain, alpha-composited images. The exporter renders an
 * `<img>` or a single-layer background faithfully, but it ignores
 * `mix-blend-mode` and does not draw multi-layer gradient backgrounds -- which is
 * why dust drawn as two stacked radial-gradients disappeared from every export
 * while looking fine on screen. Defining an effect once, in a form the exporter
 * can render, is the only way preview and export cannot drift apart.
 *
 * Both tiles are generated from a fixed seed, so a strip exports the same texture
 * it previewed, and both are built once and cached.
 */

const TILE_SIZE = 96;

/**
 * Deterministic pseudo-random source.
 *
 * A seeded generator rather than Math.random: grain that reshuffled on every
 * render would make the export differ from the preview it was taken from.
 */
function createRandom(seed: number): () => number {
  let state = seed % 0x7fffffff;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Returns a data URL, or an empty string where there is no canvas to draw on --
 * jsdom under test, chiefly. Callers treat an empty texture as "no overlay"
 * rather than emitting `url()` with nothing in it.
 */
function createTile(draw: (context: CanvasRenderingContext2D) => void): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return '';
    draw(context);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

let grainTexture: string | null = null;

export function getGrainTexture(): string {
  if (grainTexture === null) {
    grainTexture = createTile((context) => {
      const image = context.createImageData(TILE_SIZE, TILE_SIZE);
      const random = createRandom(20260822);
      for (let pixel = 0; pixel < TILE_SIZE * TILE_SIZE; pixel += 1) {
        // Light and dark specks in equal measure. A mid-grey noise layer would
        // wash the strip toward grey as its opacity rose; balanced specks add
        // texture while leaving the exposure where the photo left it.
        const bright = random() > 0.5;
        const index = pixel * 4;
        image.data[index] = image.data[index + 1] = image.data[index + 2] = bright ? 255 : 0;
        image.data[index + 3] = Math.round(random() * 80);
      }
      context.putImageData(image, 0, 0);
    });
  }
  return grainTexture;
}

let dustTexture: string | null = null;

export function getDustTexture(): string {
  if (dustTexture === null) {
    dustTexture = createTile((context) => {
      const random = createRandom(31337);
      // Scattered flecks, not a lattice: the gradient version repeated on an
      // even 24px grid, which read as a pattern rather than as dust.
      for (let speck = 0; speck < 26; speck += 1) {
        context.fillStyle =
          random() > 0.45 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(30, 25, 20, 0.6)';
        context.beginPath();
        context.arc(
          random() * TILE_SIZE,
          random() * TILE_SIZE,
          0.4 + random() * 0.9,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      // A few hairline scratches, the part "Dust & Scratches" always promised.
      for (let scratch = 0; scratch < 3; scratch += 1) {
        const x = random() * TILE_SIZE;
        context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        context.lineWidth = 0.5;
        context.beginPath();
        context.moveTo(x, random() * TILE_SIZE * 0.3);
        context.lineTo(x + (random() - 0.5) * 6, TILE_SIZE * (0.5 + random() * 0.5));
        context.stroke();
      }
    });
  }
  return dustTexture;
}
