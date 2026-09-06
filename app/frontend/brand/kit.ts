// The 2026 brand kit's content: the marks under public/brand (written by npm run brand:marks),
// their variants, the type and the colours. /brand and /brand/icon read this; the server
// only names the documents.

export const RED = '#EE2B2B';

export type VariantId = 'black' | 'transparent' | 'light';
export type Variant = {
  id: VariantId;
  /** file name suffix: /brand/<mark><suffix>.<ext> */
  suffix: '' | '-transparent' | '-light';
  name: string;
  use: string;
  /** what to preview it on */
  surface: 'black' | 'checker' | 'white';
};

export const VARIANTS: Variant[] = [
  { id: 'black', suffix: '', name: 'Sobre negro', use: 'Con su fondo.', surface: 'black' },
  {
    id: 'transparent',
    suffix: '-transparent',
    name: 'Transparente',
    use: 'Tinta blanca, sin fondo.',
    surface: 'checker',
  },
  { id: 'light', suffix: '-light', name: 'Sobre blanco', use: 'Tinta negra, sin fondo.', surface: 'white' },
];

export type MarkId = 'logo' | 'logo-horizontal' | 'icon';
export type Mark = {
  id: MarkId;
  name: string;
  use: string;
  /** width / height of the SVG's viewBox */
  aspect: number;
  /** the PNG's width in pixels */
  png: number;
};

export const MARKS: Mark[] = [
  {
    id: 'logo',
    name: 'Logo',
    use: 'El de la landing. Para todo lo que tenga espacio.',
    aspect: 440 / 408,
    png: 2048,
  },
  {
    id: 'icon',
    name: 'Ícono',
    use: 'Favicon, perfiles y calendarios.',
    aspect: 1,
    png: 1024,
  },
  {
    id: 'logo-horizontal',
    name: 'Logo horizontal',
    use: 'Cabeceras, firmas y espacios angostos.',
    aspect: 1367 / 138,
    png: 3200,
  },
];

export const markFile = (mark: Mark, variant: Variant, ext: 'svg' | 'png') => `/brand/${mark.id}${variant.suffix}.${ext}`;
export const markDownload = (mark: Mark, variant: Variant, ext: 'svg' | 'png') =>
  `chile-tech-week-2026-${mark.id}${variant.suffix}.${ext}`;

export type Color = { name: string; hex: string; use: string; ink: 'white' | 'black' };
export const COLORS: Color[] = [
  { name: 'Rojo', hex: RED, use: 'Acentos y el 26.', ink: 'white' },
  { name: 'Negro', hex: '#000000', use: 'Fondo.', ink: 'white' },
  { name: 'Blanco', hex: '#FFFFFF', use: 'Tinta y títulos.', ink: 'black' },
  { name: 'Gris', hex: '#A3A3A3', use: 'Texto secundario.', ink: 'black' },
  { name: 'Gris wireframe', hex: '#525252', use: 'Tinta del wireframe.', ink: 'white' },
  { name: 'Línea', hex: '#262626', use: 'Bordes de 1 px.', ink: 'white' },
];

export type FontSpec = {
  family: string;
  role: string;
  weights: string;
  use: string;
  /** the landing.css variable */
  cssVar: '--display' | '--body' | '--mono';
  url: string;
};
export const FONTS: FontSpec[] = [
  {
    family: 'Unbounded',
    role: 'Display',
    weights: '800',
    use: 'Títulos y logos, en mayúsculas, espaciado -0.03em.',
    cssVar: '--display',
    url: 'https://fonts.google.com/specimen/Unbounded',
  },
  {
    family: 'Syne',
    role: 'Texto',
    weights: '400 · 600',
    use: 'Párrafos.',
    cssVar: '--body',
    url: 'https://fonts.google.com/specimen/Syne',
  },
  {
    family: 'Space Mono',
    role: 'Etiquetas',
    weights: '400 · 700',
    use: 'Etiquetas y datos, en mayúsculas, espaciado 0.22em.',
    cssVar: '--mono',
    url: 'https://fonts.google.com/specimen/Space+Mono',
  },
];

/** The <link> the site itself loads, for anyone building a page in the brand. */
export const FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Syne:wght@400;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">';
