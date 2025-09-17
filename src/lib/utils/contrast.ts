export function calculateContrastRatio(
  imageData: ImageData,
  backgroundColor: [number, number, number] = [0, 0, 0], // Default black
): Promise<number> {
  return new Promise((resolve) => {
    const { data } = imageData;
    let totalLuminance = 0;
    let pixelCount = 0;

    // Calculate average luminance of non-transparent pixels
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      // Skip transparent pixels
      if (alpha < 50) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to relative luminance (WCAG formula)
      const luminance = getLuminance([r, g, b]);
      totalLuminance += luminance;
      pixelCount++;
    }

    if (pixelCount === 0) {
      resolve(1); // No visible pixels, assume poor contrast
      return;
    }

    const avgLuminance = totalLuminance / pixelCount;
    const bgLuminance = getLuminance(backgroundColor);

    // Calculate contrast ratio (WCAG formula)
    const lighter = Math.max(avgLuminance, bgLuminance);
    const darker = Math.min(avgLuminance, bgLuminance);
    const contrastRatio = (lighter + 0.05) / (darker + 0.05);

    resolve(contrastRatio);
  });
}

function getLuminance([r, g, b]: [number, number, number]): number {
  // Convert RGB to relative luminance using sRGB formula
  const [rRel, gRel, bRel] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rRel + 0.7152 * gRel + 0.0722 * bRel;
}

export function checkImageContrast(
  imageFile: File,
  backgroundColor: [number, number, number] = [0, 0, 0],
): Promise<{
  contrastRatio: number;
  isGoodContrast: boolean;
  imageData: ImageData;
}> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const handleImageLoad = async () => {
      try {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Calculate contrast ratio
        const contrastRatio = await calculateContrastRatio(
          imageData,
          backgroundColor,
        );

        // WCAG AA standard requires at least 3:1 for large text/graphics
        // We'll use 2.5:1 as minimum for logos to be more lenient
        const isGoodContrast = contrastRatio >= 2.5;

        // Clean up
        URL.revokeObjectURL(objectURL);

        resolve({
          contrastRatio,
          isGoodContrast,
          imageData,
        });
      } catch (error) {
        URL.revokeObjectURL(objectURL);
        reject(error);
      }
    };

    img.onload = handleImageLoad;
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Failed to load image'));
    };

    // Create object URL and load image
    const objectURL = URL.createObjectURL(imageFile);
    img.src = objectURL;
  });
}
