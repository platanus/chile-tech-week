'use client';

interface HackathonVideoProps {
  src: string;
  className?: string;
}

export default function HackathonVideo({
  src,
  className = '',
}: HackathonVideoProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-muted transition-all duration-300 hover:scale-105 ${className}`}
    >
      <video
        className="h-full w-full object-cover grayscale transition-all duration-300 hover:grayscale-0"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
