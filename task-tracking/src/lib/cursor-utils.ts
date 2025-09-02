// Lucide icon SVG paths for cursor generation
const lucideIconPaths: Record<string, string> = {
  Mouse: '<path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/><path d="M12 6v4"/>',
  MousePointer2: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>',
  Hand: '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  Type: '<polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  Move: '<polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
  Move3d: '<path d="m5 3 3 3"/><path d="m8 21 3-3"/><path d="M12 8.5 16 12l-4 3.5L8 12l4-3.5Z"/><path d="M7 21h10"/><path d="M7 3h10"/>',
  Ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  MousePointerClick: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/><circle cx="12" cy="8" r="2"/>',
  HelpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  Loader2: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  Crosshair: '<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>',
  ZoomIn: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  ZoomOut: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/>'
};

/**
 * Generate a cursor style from a Lucide icon
 * @param iconName - Name of the Lucide icon
 * @param options - Customization options
 * @returns CSS cursor value
 */
export function createLucideCursor(
  iconName: string,
  options: {
    size?: number;
    color?: string;
    strokeWidth?: number;
    fallback?: string;
    fill?: string;
  } = {}
) {
  const {
    size = 20,
    color = '#ffffff',
    strokeWidth = 2,
    fallback = 'auto',
    fill = 'none'
  } = options;

  const iconPath = lucideIconPaths[iconName];
  if (!iconPath) {
    console.warn(`Icon '${iconName}' not found in predefined Lucide icons`);
    return fallback;
  }

  const encodedColor = encodeURIComponent(color);
  const encodedFill = encodeURIComponent(fill);
  
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${encodedFill}" stroke="${encodedColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;
  const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
  
  return `url('${svgDataUri}'), ${fallback}`;
}

/**
 * Predefined cursor styles using common Lucide icons
 */
export const lucideCursors = {
  default: createLucideCursor('Mouse', { color: '#ffffff' }),
  pointer: createLucideCursor('MousePointer2', { color: '#ffffff' }),
  hand: createLucideCursor('Hand', { color: '#ffffff' }),
  text: createLucideCursor('Type', { color: '#ffffff' }),
  move: createLucideCursor('Move', { color: '#ffffff' }),
  grab: createLucideCursor('Hand', { color: '#00aaff' }),
  grabbing: createLucideCursor('Move3d', { color: '#00aaff' }),
  ban: createLucideCursor('Ban', { color: '#ff4444', fallback: 'not-allowed' }),
  click: createLucideCursor('MousePointerClick', { color: '#00aaff', fallback: 'pointer' }),
  help: createLucideCursor('HelpCircle', { color: '#ffaa00', fallback: 'help' }),
  wait: createLucideCursor('Loader2', { color: '#ffffff', fallback: 'wait' }),
  crosshair: createLucideCursor('Crosshair', { color: '#ffffff', fallback: 'crosshair' }),
  zoom: createLucideCursor('ZoomIn', { color: '#ffffff', fallback: 'zoom-in' }),
  zoomOut: createLucideCursor('ZoomOut', { color: '#ffffff', fallback: 'zoom-out' })
};

/**
 * Apply a Lucide cursor to an element
 * @param element - DOM element or CSS selector
 * @param iconName - Lucide icon name
 * @param options - Customization options
 */
export function applyLucideCursor(
  element: HTMLElement | string,
  iconName: string,
  options?: Parameters<typeof createLucideCursor>[1]
) {
  const el = typeof element === 'string' ? document.querySelector(element) as HTMLElement : element;
  if (!el) return;
  
  const cursorStyle = createLucideCursor(iconName, options);
  el.style.cursor = cursorStyle;
}

/**
 * Generate CSS class for a Lucide cursor
 * @param className - CSS class name
 * @param iconName - Lucide icon name
 * @param options - Customization options
 * @returns CSS rule string
 */
export function generateCursorCSS(
  className: string,
  iconName: string,
  options?: Parameters<typeof createLucideCursor>[1]
): string {
  const cursorStyle = createLucideCursor(iconName, options);
  return `.${className} { cursor: ${cursorStyle}; }`;
}

/**
 * Get available Lucide icon names for cursors
 * @returns Array of available icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(lucideIconPaths);
}