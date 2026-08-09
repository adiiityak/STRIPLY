/**
 * Tailwind 4 emits its palette as `oklch()`. html2canvas 1.4.1 cannot parse that colour
 * function and throws "Attempting to parse an unsupported color function" the moment it meets
 * one, which aborts the whole export. The strip carries 90-odd oklch values across its
 * templates, so rewriting every utility class by hand is not realistic.
 *
 * Instead the export converts them just-in-time: walk the strip, inline an rgb() equivalent
 * wherever a computed style resolves to oklch, rasterise, then strip the inlined values back
 * out. Nothing about the page's own styling changes.
 */

/** Converts one `oklab(L a b)` / `oklab(L a b / A)` colour to an `rgb()` / `rgba()` string. */
export function oklabToRgbString(lightness: number, a: number, b: number, alpha?: number): string {
  // Oklab -> LMS (cube roots), per Björn Ottosson's definition.
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];

  const [r, g, bl] = linear.map((channel) => {
    const encoded =
      channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(encoded * 255)));
  });

  return alpha != null && alpha < 1 ? `rgba(${r}, ${g}, ${bl}, ${alpha})` : `rgb(${r}, ${g}, ${bl})`;
}

/** Converts one `oklch(L C H)` / `oklch(L C H / A)` colour to an `rgb()` / `rgba()` string. */
export function oklchToRgbString(lightness: number, chroma: number, hueDeg: number, alpha?: number): string {
  const hue = (hueDeg * Math.PI) / 180;
  return oklabToRgbString(lightness, chroma * Math.cos(hue), chroma * Math.sin(hue), alpha);
}

/**
 * Replaces every `oklch(...)` and `oklab(...)` inside a CSS value, leaving the rest untouched.
 * Tailwind 4 emits oklch for its palette and oklab wherever an opacity modifier is used, e.g.
 * `bg-amber-50/90`, and html2canvas rejects both.
 */
export function replaceOklchInValue(value: string): string {
  return value.replace(/okl(ab|ch)\(([^)]+)\)/g, (whole, kind: string, args: string) => {
    const [coords, alphaPart] = args.split('/');
    const parts = coords.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return whole;

    const lightness = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    const second = parseFloat(parts[1]);
    const third = parseFloat(parts[2]);
    if ([lightness, second, third].some((n) => Number.isNaN(n))) return whole;

    let alpha: number | undefined;
    if (alphaPart != null) {
      const raw = alphaPart.trim();
      alpha = raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
      if (Number.isNaN(alpha)) alpha = undefined;
    }

    return kind === 'ch'
      ? oklchToRgbString(lightness, second, third, alpha)
      : oklabToRgbString(lightness, second, third, alpha);
  });
}

/**
 * Inlines rgb() equivalents for any oklch/oklab colours under `root`, and returns a function
 * that removes them again. Always call the cleanup, so the live page keeps its own styling.
 *
 * Every computed property is checked rather than a hand-written list of colour properties.
 * html2canvas parses a wide set of declarations, and a curated list missed ones it read --
 * each omission surfaced only as another "unsupported color function" at export time. Walking
 * the whole declaration is exhaustive and costs one pass over an element the size of a strip.
 */
export function inlineOklchFallbacks(root: HTMLElement): () => void {
  const undo: Array<() => void> = [];
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (const element of elements) {
    const computed = getComputedStyle(element);

    for (let index = 0; index < computed.length; index += 1) {
      const cssName = computed.item(index);
      const value = computed.getPropertyValue(cssName);
      if (!value || !value.includes('okl')) continue;

      const converted = replaceOklchInValue(value);
      if (converted === value) continue;

      const previous = element.style.getPropertyValue(cssName);
      const previousPriority = element.style.getPropertyPriority(cssName);
      element.style.setProperty(cssName, converted, 'important');
      undo.push(() => {
        if (previous) element.style.setProperty(cssName, previous, previousPriority);
        else element.style.removeProperty(cssName);
      });
    }
  }

  return () => undo.forEach((restore) => restore());
}
