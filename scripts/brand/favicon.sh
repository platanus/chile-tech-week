#!/usr/bin/env bash
# The favicon set, from the icon mark (public/brand/icon.{png,svg}, npm run brand:marks):
#   public/icon.svg              the mark itself, for browsers that take an SVG icon
#   public/favicon.ico           16 + 32 + 48 px, cropped tighter so the letters read at tab size
#   public/apple-touch-icon.png  180 px, full bleed (iOS rounds the corners itself)
#   public/icon.png              512 px, full bleed, for manifests and anything else
# Run: npm run brand:favicon    (needs ImageMagick 7: brew install imagemagick)
set -euo pipefail
cd "$(dirname "$0")/../.."
src=public/brand/icon.png
[ -f "$src" ] || { echo "no $src: run npm run brand:marks first" >&2; exit 1; }

# the letters span the middle 76% of the 1024 square; at 16 px that padding is wasted, so the
# ICO layers come from the middle 860 px (letters at ~90%)
tight="-gravity center -crop 860x860+0+0 +repage"
magick "$src" $tight \( -clone 0 -resize 16x16 \) \( -clone 0 -resize 32x32 \) \( -clone 0 -resize 48x48 \) -delete 0 \
  -colors 256 public/favicon.ico
magick "$src" -resize 180x180 -strip -colors 256 -define png:compression-level=9 public/apple-touch-icon.png
magick "$src" -resize 512x512 -strip -colors 256 -define png:compression-level=9 public/icon.png
cp public/brand/icon.svg public/icon.svg
ls -la public/favicon.ico public/apple-touch-icon.png public/icon.png public/icon.svg | awk '{print $5, $9}'
