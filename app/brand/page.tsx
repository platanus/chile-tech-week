'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

interface BrandAsset {
  id: string;
  name: string;
  description: string;
  pngPath: string;
  svgPath: string;
  preview: string;
}

export default function BrandKitPage() {
  const [downloadFormat, setDownloadFormat] = useState<
    Record<string, 'png' | 'svg'>
  >({});

  const brandAssets: BrandAsset[] = [
    {
      id: 'logo-rectangle',
      name: 'RECTANGLE LOGO',
      description: 'Full horizontal logo for social media posts and banners',
      pngPath: '/assets/brand/logo-rectangle.png',
      svgPath: '/assets/brand/logo-rectangle.svg',
      preview: '/assets/brand/logo-rectangle.png',
    },
    {
      id: 'logo-icon',
      name: 'ICON LOGO',
      description: 'Square icon for profile pictures and favicons',
      pngPath: '/assets/brand/logo-icon.png',
      svgPath: '/assets/brand/logo-icon.svg',
      preview: '/assets/brand/logo-icon.png',
    },
  ];

  const handleDownload = (asset: BrandAsset, format: 'png' | 'svg') => {
    const path = format === 'png' ? asset.pngPath : asset.svgPath;
    const link = document.createElement('a');
    link.href = path;
    link.download = `chile-tech-week-${asset.id}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const _toggleFormat = (assetId: string) => {
    setDownloadFormat((prev) => ({
      ...prev,
      [assetId]: prev[assetId] === 'svg' ? 'png' : 'svg',
    }));
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-white border-b-4 bg-black p-8">
        <div className="mx-auto max-w-6xl text-center">
          {/* Chile Tech Week Logo */}
          <Link
            href="/"
            className="inline-block space-y-0 transition-opacity hover:opacity-80"
          >
            {/* First line - Solid primary color */}
            <div className="font-black font-mono text-primary text-sm uppercase tracking-wider md:text-2xl lg:text-3xl">
              CHILE TECH WEEK 2025
            </div>

            {/* Second line - Solid transition color */}
            <div
              className="font-black font-mono text-sm uppercase tracking-wider md:text-2xl lg:text-3xl"
              style={{ color: 'hsl(0, 60%, 70%)' }}
            >
              CHILE TECH WEEK 2025
            </div>

            {/* Third line - Solid white */}
            <div className="font-black font-mono text-sm text-white uppercase tracking-wider md:text-2xl lg:text-3xl">
              CHILE TECH WEEK 2025
            </div>
          </Link>
        </div>
      </div>

      {/* Brand Kit Title */}
      <div className="bg-black py-8 text-center">
        <h1 className="inline-block border-6 border-white bg-primary px-8 py-4 font-black font-mono text-2xl text-white uppercase tracking-widest shadow-[8px_8px_0px_0px_#ffffff] md:text-4xl">
          BRAND KIT
        </h1>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl p-8 md:p-16">
        {/* Font Section */}
        <div className="mb-16 text-center">
          <div className="border-4 border-white bg-black p-6">
            <p className="mb-4 font-mono text-lg text-white leading-relaxed">
              Chile Tech Week uses font{' '}
              <strong className="text-primary">JetBrains Mono</strong>
            </p>
            <Link
              href="https://fonts.google.com/specimen/JetBrains+Mono"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-2 border-white bg-transparent px-6 py-3 font-mono text-sm text-white uppercase tracking-wide transition-colors hover:bg-white hover:text-black"
            >
              Get Font
            </Link>
          </div>
        </div>

        {/* Colors Section */}
        <div className="mb-16">
          <div className="border-4 border-white bg-black p-8">
            <h2 className="mb-6 text-center font-black font-mono text-white text-xl uppercase tracking-widest">
              BRAND COLORS
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  name: 'RED',
                  hex: '#EE2B2B',
                  bgClass: 'bg-primary',
                  textClass: 'text-white',
                },
                {
                  name: 'WHITE',
                  hex: '#FFFFFF',
                  bgClass: 'bg-white',
                  textClass: 'text-black',
                },
                {
                  name: 'BLACK',
                  hex: '#000000',
                  bgClass: 'bg-black',
                  textClass: 'text-white',
                },
              ].map((color) => (
                <div key={color.name} className="border-2 border-white">
                  <div className={`${color.bgClass} p-8 text-center`}>
                    <div
                      className={`font-black font-mono ${color.textClass} text-2xl uppercase tracking-wide`}
                    >
                      {color.name}
                    </div>
                  </div>
                  <div className="bg-black p-4 text-center">
                    <div className="mb-3 font-mono text-sm text-white">
                      {color.hex}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(color.hex);
                          toast.success(`Copied ${color.hex} to clipboard`);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                          toast.error('Failed to copy to clipboard');
                        }
                      }}
                      className="border-2 border-white bg-transparent px-4 py-2 font-mono text-white text-xs uppercase tracking-wide transition-colors hover:bg-white hover:text-black"
                    >
                      Copy Hex
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid gap-12 md:grid-cols-2">
          {brandAssets.map((asset) => {
            const _currentFormat = downloadFormat[asset.id] || 'png';

            return (
              <div key={asset.id} className="border-4 border-white bg-black">
                {/* Asset Preview */}
                <div className="border-white border-b-4 bg-white p-8">
                  <div className="relative flex h-48 items-center justify-center">
                    <Image
                      src={asset.preview}
                      alt={asset.name}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        // Fallback for missing images
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex h-full items-center justify-center border-4 border-dashed border-gray-400">
                              <span class="font-mono text-gray-600 text-sm uppercase tracking-wide">Image Preview</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Asset Info */}
                <div className="p-8">
                  <h3 className="mb-4 font-black font-mono text-primary text-xl uppercase tracking-wide">
                    {asset.name}
                  </h3>
                  <p className="mb-6 font-mono text-sm text-white leading-relaxed">
                    {asset.description}
                  </p>

                  {/* Download Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleDownload(asset, 'svg')}
                      className="flex-1 border-4 border-white bg-transparent px-6 py-4 font-black font-mono text-lg text-white uppercase tracking-wide transition-all hover:bg-white hover:text-black"
                    >
                      Download SVG
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(asset, 'png')}
                      className="flex-1 border-4 border-primary bg-primary px-6 py-4 font-black font-mono text-lg text-primary-foreground uppercase tracking-wide transition-all hover:bg-primary/90"
                    >
                      Download PNG
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
