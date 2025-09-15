import Image from 'next/image';

// Available flag widths from FlagCDN
type FlagWidth = 20 | 40 | 80 | 160 | 320 | 640 | 1280 | 2560;

interface CountryFlagProps {
  countryCode: string;
  width?: FlagWidth;
  className?: string;
  alt?: string;
}

export function CountryFlag({
  countryCode,
  width = 20,
  className = '',
  alt,
}: CountryFlagProps) {
  const code = countryCode.toLowerCase();
  const src = `https://flagcdn.com/w${width}/${code}.png`;

  return (
    <Image
      src={src}
      alt={alt || `${countryCode.toUpperCase()} flag`}
      width={width}
      height={width * 0.75} // Standard flag ratio is 4:3
      className={`inline-block ${className}`}
      unoptimized // Since this is an external CDN
    />
  );
}
