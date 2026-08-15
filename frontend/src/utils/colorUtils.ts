export interface ColorStyle {
  bg: string;
  border: string;
  isDark: boolean;
}

export function getColorHex(colorName: string): ColorStyle {
  if (!colorName) return { bg: '#C8BBAA', border: '#A39584', isDark: false };

  const name = colorName.toLowerCase().trim();

  if (name.includes('emerald') || name.includes('green')) {
    return { bg: '#1B4D3E', border: '#113328', isDark: true };
  }
  if (name.includes('ivory') || name.includes('white') || name.includes('cream') || name.includes('bouclé') || name.includes('boucle')) {
    return { bg: '#F8F5EE', border: '#D8CCBD', isDark: false };
  }
  if (name.includes('charcoal') || name.includes('black') || name.includes('obsidian') || name.includes('dark')) {
    return { bg: '#1A1A1A', border: '#000000', isDark: true };
  }
  if (name.includes('slate') || name.includes('grey') || name.includes('gray')) {
    return { bg: '#5A6572', border: '#3E4752', isDark: true };
  }
  if (name.includes('beige') || name.includes('tan') || name.includes('oak') || name.includes('honey')) {
    return { bg: '#D8C3A5', border: '#B5A285', isDark: false };
  }
  if (name.includes('walnut') || name.includes('brown') || name.includes('wood') || name.includes('teak')) {
    return { bg: '#4A3B32', border: '#2D231D', isDark: true };
  }
  if (name.includes('mustard') || name.includes('yellow') || name.includes('gold')) {
    return { bg: '#E5A93C', border: '#B88220', isDark: false };
  }
  if (name.includes('terracotta') || name.includes('rust') || name.includes('orange')) {
    return { bg: '#C87D55', border: '#9E5B37', isDark: true };
  }
  if (name.includes('brass')) {
    return { bg: '#C5A880', border: '#9B7E58', isDark: false };
  }
  if (name.includes('blue') || name.includes('navy')) {
    return { bg: '#1F3A60', border: '#12243D', isDark: true };
  }
  if (name.includes('cognac')) {
    return { bg: '#9E472A', border: '#702E19', isDark: true };
  }

  return { bg: '#8C7C6D', border: '#605347', isDark: true };
}

export function parseAvailableColors(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((c) => String(c).trim()).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
}
