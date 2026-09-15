import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkLogo, logoDimensionsError, logoPolicy } from './logo-upload';

afterEach(() => vi.unstubAllGlobals());

describe('logo quality', () => {
  it.each([[320, 64], [64, 320], [400, 400], [800, 100]])('accepts %i × %i without imposing a square shape', (width, height) => {
    expect(logoDimensionsError(width, height)).toBeNull();
  });

  it.each([[319, 319], [800, 63], [63, 800], [0, 0]])('rejects insufficient resolution %i × %i', (width, height) => {
    expect(logoDimensionsError(width, height)).toBe(logoPolicy.errors.small);
  });

  it('caps the decoded pixel count', () => {
    expect(logoDimensionsError(5000, 4001)).toBe(logoPolicy.errors.large);
  });

  it('rejects the file size and unsupported types before decoding', async () => {
    expect(await checkLogo(new File(['x'.repeat(logoPolicy.maxBytes + 1)], 'big.png', { type: 'image/png' }))).toEqual({ error: logoPolicy.errors.size });
    expect(await checkLogo(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))).toEqual({ error: logoPolicy.errors.type });
  });

  it('reports corrupt images and releases the object URL', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL });
    vi.stubGlobal('Image', class { decode() { return Promise.reject(new Error('invalid image')); } });
    expect(await checkLogo(new File(['broken'], 'logo.png', { type: 'image/png' }))).toEqual({ error: logoPolicy.errors.invalid });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
