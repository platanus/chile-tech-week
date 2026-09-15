import policy from '../../../config/logo_upload.json';

export { policy as logoPolicy };
export type LogoCheck = { error: string | null; width?: number; height?: number };

export function logoDimensionsError(width: number, height: number): string | null {
  if (width * height > policy.maxPixels) return policy.errors.large;
  if (Math.max(width, height) < policy.minLongSide || Math.min(width, height) < policy.minShortSide) return policy.errors.small;
  return null;
}

export async function checkLogo(file: File): Promise<LogoCheck> {
  if (file.size > policy.maxBytes) return { error: policy.errors.size };
  if (!policy.types.includes(file.type)) return { error: policy.errors.type };
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    return { error: logoDimensionsError(width, height), width, height };
  } catch {
    return { error: policy.errors.invalid };
  } finally {
    URL.revokeObjectURL(url);
  }
}
