import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { PageHead, Wordmark } from '@/components/edition2025/layout';
import { edition2025_root_path } from '@/routes';
import type { Edition2025BrandShow } from '@/types';

const ASSETS = [
  {
    id: 'logo-rectangle',
    name: 'RECTANGLE LOGO BLACK BACKGROUND',
    description: 'Full horizontal logo for social media posts and banners',
    transparent: false,
  },
  {
    id: 'logo-icon',
    name: 'ICON LOGO BLACK BACKGROUND',
    description: 'Square icon for profile pictures and favicons',
    transparent: false,
  },
  {
    id: 'logo-rectangle-transparent',
    name: 'RECTANGLE LOGO TRANSPARENT',
    description: 'Full horizontal logo with transparent background',
    transparent: true,
  },
  {
    id: 'logo-icon-transparent',
    name: 'ICON LOGO TRANSPARENT',
    description: 'Square icon with transparent background',
    transparent: true,
  },
];

const COLORS = [
  { name: 'RED', hex: '#EE2B2B', bg: 'bg-primary', text: 'text-white' },
  { name: 'WHITE', hex: '#FFFFFF', bg: 'bg-white', text: 'text-black' },
  { name: 'BLACK', hex: '#000000', bg: 'bg-black', text: 'text-white' },
];

const CHECKERBOARD =
  'bg-gray-700 bg-[length:40px_40px] bg-[position:0_0,0_20px,20px_-20px,-20px_0px] bg-[image:linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)]';

// The 2025 brand kit: font, colours and the logo files (public/25/brand).
export default function Show(page: Edition2025BrandShow) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      window.setTimeout(() => setCopied((current) => (current === hex ? null : current)), 1500);
    } catch {
      // Clipboard access denied: the hex is printed right above the button anyway.
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <PageHead {...page} />

      <div className="border-b-4 border-white bg-black p-8">
        <div className="mx-auto max-w-6xl text-center">
          <Link href={edition2025_root_path()} className="inline-block transition-opacity hover:opacity-80">
            <Wordmark size="small" />
          </Link>
        </div>
      </div>

      <div className="bg-black py-8 text-center">
        <h1 className="inline-block border-6 border-white bg-primary px-8 py-4 font-mono text-2xl font-black uppercase tracking-widest text-white shadow-[8px_8px_0px_0px_#ffffff] md:text-4xl">
          BRAND KIT
        </h1>
      </div>

      <div className="mx-auto max-w-6xl p-8 md:p-16">
        <div className="mb-16 text-center">
          <div className="border-4 border-white bg-black p-6">
            <p className="mb-4 font-mono text-lg leading-relaxed text-white">
              Chile Tech Week uses font <strong className="text-primary">JetBrains Mono</strong>
            </p>
            <a
              href="https://fonts.google.com/specimen/JetBrains+Mono"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-2 border-white bg-transparent px-6 py-3 font-mono text-sm uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black"
            >
              Get Font
            </a>
          </div>
        </div>

        <div className="mb-16">
          <div className="border-4 border-white bg-black p-8">
            <h2 className="mb-6 text-center font-mono text-xl font-black uppercase tracking-widest text-white">
              BRAND COLORS
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {COLORS.map((color) => (
                <div key={color.name} className="border-2 border-white">
                  <div className={`${color.bg} p-8 text-center`}>
                    <div className={`font-mono text-2xl font-black uppercase tracking-wide ${color.text}`}>
                      {color.name}
                    </div>
                  </div>
                  <div className="bg-black p-4 text-center">
                    <div className="mb-3 font-mono text-sm text-white">{color.hex}</div>
                    <button
                      type="button"
                      onClick={() => copy(color.hex)}
                      className="border-2 border-white bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black"
                    >
                      {copied === color.hex ? 'Copied!' : 'Copy Hex'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          {ASSETS.map((asset) => (
            <div key={asset.id} className="border-4 border-white bg-black">
              <div className="border-b-4 border-white bg-white p-8">
                <div
                  className={`relative flex h-48 items-center justify-center ${asset.transparent ? CHECKERBOARD : ''}`}
                >
                  <img
                    src={`/25/brand/${asset.id}.png`}
                    alt={asset.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <div className="p-8">
                <h3 className="mb-4 font-mono text-xl font-black uppercase tracking-wide text-primary">
                  {asset.name}
                </h3>
                <p className="mb-6 font-mono text-sm leading-relaxed text-white">{asset.description}</p>

                <div className="flex gap-4">
                  <a
                    href={`/25/brand/${asset.id}.svg`}
                    download={`chile-tech-week-${asset.id}.svg`}
                    className="flex-1 border-4 border-white bg-transparent px-6 py-4 text-center font-mono text-lg font-black uppercase tracking-wide text-white transition-all hover:bg-white hover:text-black"
                  >
                    Download SVG
                  </a>
                  <a
                    href={`/25/brand/${asset.id}.png`}
                    download={`chile-tech-week-${asset.id}.png`}
                    className="flex-1 border-4 border-primary bg-primary px-6 py-4 text-center font-mono text-lg font-black uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    Download PNG
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
