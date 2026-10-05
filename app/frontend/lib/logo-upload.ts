import type { Locale } from '@/lib/i18n';
import policy from '../../../config/logo_upload.json';

// The limits are shared; the sentences that explain them come in each language.
export { policy as logoPolicy };
export type LogoCheck = { error: string | null; width?: number; height?: number };

export function logoCopy(locale: Locale = 'es') {
  return policy[locale];
}

export function logoDimensionsError(width: number, height: number, locale: Locale = 'es'): string | null {
  const { errors } = logoCopy(locale);
  if (width * height > policy.maxPixels) return errors.large;
  if (Math.max(width, height) < policy.minLongSide || Math.min(width, height) < policy.minShortSide) return errors.small;
  return null;
}

export async function checkLogo(file: File, locale: Locale = 'es'): Promise<LogoCheck> {
  const { errors } = logoCopy(locale);
  if (file.size > policy.maxBytes) return { error: errors.size };
  if (!policy.types.includes(file.type)) return { error: errors.type };
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    return { error: logoDimensionsError(width, height, locale), width, height };
  } catch {
    return { error: errors.invalid };
  } finally {
    URL.revokeObjectURL(url);
  }
}
