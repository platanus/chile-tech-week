#!/usr/bin/env bash
# The favicon set, from the icon mark (public/brand/icon.{png,svg}, npm run brand:marks):
#   public/icon.svg              the mark itself, for browsers that take an SVG icon
#   public/favicon.ico           16 + 32 + 48 px, cropped tighter so the letters read at tab size
#   public/apple-touch-icon.png  180 px, full bleed (iOS rounds the corners itself)
#   public/icon.png              512 px, with a rounded app-icon silhouette
#   public/icon-maskable.png     512 px, full bleed with Android's maskable-icon safe zone
# Run: npm run brand:favicon    (needs ImageMagick 7: brew install imagemagick)
set -euo pipefail
cd "$(dirname "$0")/../.."
standard=public/brand/icon.png
maskable=public/brand/icon-maskable.png
[ -f "$standard" ] && [ -f "$maskable" ] || { echo "no icon sources: run npm run brand:marks first" >&2; exit 1; }

# Keep the whole rounded surface in the tab icon. Cropping it would make the corners square again.
magick "$standard" -define icon:auto-resize=16,32,48 public/favicon.ico
magick "$maskable" -resize 180x180 -strip -colors 256 -define png:compression-level=9 public/apple-touch-icon.png
magick "$standard" -resize 512x512 -strip -colors 256 -define png:compression-level=9 public/icon.png
# Android applies the final shape itself, so its source must retain the square, full-bleed field.
magick "$maskable" -resize 512x512 -strip -colors 256 -define png:compression-level=9 public/icon-maskable.png
cp public/brand/icon.svg public/icon.svg
ls -la public/favicon.ico public/apple-touch-icon.png public/icon.png public/icon-maskable.png public/icon.svg | awk '{print $5, $9}'
