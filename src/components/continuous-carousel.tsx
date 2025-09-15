'use client';

import { useEffect, useRef, useState } from 'react';

interface ContinuousCarouselProps {
  children: React.ReactNode[];
  speed?: number; // pixels per second
  gap?: number; // gap in pixels
  pauseOnHover?: boolean;
  className?: string;
  height?: string; // fixed height for all items
}

export default function ContinuousCarousel({
  children,
  speed = 50,
  gap = 12,
  pauseOnHover = true,
  className = '',
  height,
}: ContinuousCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [offset, setOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  // Measure content width on mount and resize
  useEffect(() => {
    const measureContent = () => {
      if (contentRef.current) {
        const firstChild = contentRef.current.firstElementChild as HTMLElement;
        if (firstChild) {
          const childrenCount = children.length;
          const childWidth = firstChild.offsetWidth;
          const totalGaps = (childrenCount - 1) * gap;
          setContentWidth(childWidth * childrenCount + totalGaps);
        }
      }
    };

    measureContent();

    // Remeasure on window resize
    window.addEventListener('resize', measureContent);
    return () => window.removeEventListener('resize', measureContent);
  }, [children.length, gap]);

  // Animation loop
  useEffect(() => {
    if (!contentWidth) return;

    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;

      if (!isHovered) {
        const deltaTime = currentTime - lastTime;
        const pixelsToMove = (speed * deltaTime) / 1000;

        setOffset((prevOffset) => {
          const newOffset = prevOffset + pixelsToMove;
          // Reset when we've moved one full set of content
          return newOffset >= contentWidth
            ? newOffset - contentWidth
            : newOffset;
        });
      }

      lastTime = currentTime;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed, isHovered, contentWidth]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsHovered(false);
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Continuous carousel"
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        className="flex"
        style={{
          transform: `translateX(-${offset}px)`,
          gap: `${gap}px`,
          width: 'max-content',
        }}
      >
        {/* First set */}
        {children.map((child, index) => (
          <div
            key={`original-${index}-${typeof child === 'object' && child && 'key' in child ? child.key : index}`}
            className="flex-shrink-0"
            style={height ? { height } : undefined}
          >
            {child}
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {children.map((child, index) => (
          <div
            key={`duplicate-${index}-${typeof child === 'object' && child && 'key' in child ? child.key : index}`}
            className="flex-shrink-0"
            style={height ? { height } : undefined}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
