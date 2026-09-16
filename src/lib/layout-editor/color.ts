// Deriva as variáveis de cor derivadas (--primary-strong, --secondary, etc.)
// a partir de uma única cor primária escolhida pelo editor — assim ele só
// escolhe 1 cor e o resto do tema continua com contraste/harmonia razoáveis,
// sem expor 10 campos de cor confusos nem deixar CSS livre.

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export type DerivedTheme = {
  primary: string;
  primaryStrong: string;
  secondary: string;
  secondaryForeground: string;
  ring: string;
};

export function deriveThemeColors(primaryHex: string): DerivedTheme {
  const [h, s, l] = hexToHsl(primaryHex);
  return {
    primary: primaryHex,
    primaryStrong: hslToHex(h, s, Math.max(l - 15, 8)),
    secondary: hslToHex(h, Math.min(s, 55), Math.min(l + 40, 96)),
    secondaryForeground: hslToHex(h, s, Math.max(l - 22, 10)),
    ring: primaryHex,
  };
}
