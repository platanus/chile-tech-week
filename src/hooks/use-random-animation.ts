'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseRandomAnimationOptions {
  slitCount: number;
  animationInterval?: number;
  waveInterval?: number;
  burstInterval?: number;
}

export function useRandomAnimation({
  slitCount,
  animationInterval = 3000,
  waveInterval = 12000,
  burstInterval = 8000,
}: UseRandomAnimationOptions) {
  // Store animation controls as a ref to avoid hook rule violations
  const slitControlsRef = useRef<any[]>([]);

  // Initialize controls factory function
  const initializeControls = useCallback((controls: any[]) => {
    slitControlsRef.current = controls;
  }, []);

  // Get current controls
  const slitControls = slitControlsRef.current;

  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  const slitVariants = {
    closed: {
      scaleY: 0,
      opacity: 0.9,
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    open: {
      scaleY: 1,
      opacity: 0.3,
      transition: { duration: 0.8, ease: 'easeInOut' },
    },
    wiggle: {
      scaleY: [1, 0.7, 1.1, 0.8, 1],
      rotateZ: [0, 2, -1, 1, 0],
      transition: { duration: 1.2, ease: 'easeInOut' },
    },
    wave: {
      scaleY: [1, 1.3, 1],
      scaleX: [1, 0.8, 1],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
    flutter: {
      scaleY: [1, 0.3, 1.2, 0.8, 1],
      scaleX: [1, 1.3, 0.7, 1.1, 1],
      rotateZ: [0, -3, 2, -1, 0],
      transition: { duration: 2, ease: 'easeInOut' },
    },
    pulse: {
      scaleY: [1, 1.5, 1],
      opacity: [0.3, 0.8, 0.3],
      transition: { duration: 1, ease: 'easeInOut' },
    },
  };

  const getRandomAnimation = useCallback(() => {
    const animations = ['closed', 'open', 'wiggle', 'wave', 'flutter', 'pulse'];
    return animations[Math.floor(Math.random() * animations.length)];
  }, []);

  const createWaveEffect = useCallback(() => {
    const direction = Math.random() > 0.5 ? 1 : -1; // Left to right or right to left

    slitControls.forEach((control, index) => {
      const delay =
        direction > 0 ? index * 0.008 : (slitCount - index - 1) * 0.008;

      control.start({
        scaleY: [1, 1.4, 1],
        scaleX: [1, 0.9, 1],
        transition: {
          delay,
          duration: 0.8,
          ease: 'easeInOut',
        },
      });
    });
  }, [slitControls, slitCount]);

  const createRandomBurst = useCallback(() => {
    const burstCount = Math.floor(Math.random() * 30) + 15; // 15-45 slits
    const startIndex = Math.floor(Math.random() * (slitCount - burstCount));

    for (let i = 0; i < burstCount; i++) {
      const index = startIndex + i;
      if (index < slitControls.length) {
        slitControls[index].start({
          scaleY: [1, 0.1, 1.3, 1],
          scaleX: [1, 1.8, 0.6, 1],
          rotateZ: [0, Math.random() * 15 - 7.5, 0],
          transition: {
            delay: i * 0.03,
            duration: 1.8,
            ease: 'easeInOut',
          },
        });
      }
    }
  }, [slitControls, slitCount]);

  const createRippleEffect = useCallback(() => {
    const centerIndex = Math.floor(slitCount / 2);
    const maxRadius = Math.floor(slitCount / 4);

    for (let radius = 0; radius <= maxRadius; radius++) {
      const delay = radius * 0.05;

      // Left side
      const leftIndex = centerIndex - radius;
      if (leftIndex >= 0) {
        slitControls[leftIndex].start({
          scaleY: [1, 1.6, 1],
          transition: { delay, duration: 1, ease: 'easeInOut' },
        });
      }

      // Right side
      const rightIndex = centerIndex + radius;
      if (rightIndex < slitCount) {
        slitControls[rightIndex].start({
          scaleY: [1, 1.6, 1],
          transition: { delay, duration: 1, ease: 'easeInOut' },
        });
      }
    }
  }, [slitControls, slitCount]);

  const startRandomAnimations = useCallback(() => {
    slitControls.forEach((control, _index) => {
      const delay = Math.random() * animationInterval;

      const timeoutId = setTimeout(() => {
        const animation = getRandomAnimation();
        control.start(animation);
      }, delay);

      intervalsRef.current.push(timeoutId);
    });
  }, [slitControls, animationInterval, getRandomAnimation]);

  const startPeriodicEffects = useCallback(() => {
    // Wave effects
    const waveIntervalId = setInterval(() => {
      if (Math.random() > 0.3) {
        // 70% chance
        createWaveEffect();
      }
    }, waveInterval);

    // Burst effects
    const burstIntervalId = setInterval(() => {
      if (Math.random() > 0.4) {
        // 60% chance
        createRandomBurst();
      }
    }, burstInterval);

    // Ripple effects
    const rippleIntervalId = setInterval(() => {
      if (Math.random() > 0.7) {
        // 30% chance
        createRippleEffect();
      }
    }, waveInterval * 1.5);

    intervalsRef.current.push(
      waveIntervalId,
      burstIntervalId,
      rippleIntervalId,
    );
  }, [
    createWaveEffect,
    createRandomBurst,
    createRippleEffect,
    waveInterval,
    burstInterval,
  ]);

  const stopAllAnimations = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const resetAllSlits = useCallback(() => {
    slitControls.forEach((control) => {
      control.start('open');
    });
  }, [slitControls]);

  useEffect(() => {
    startRandomAnimations();
    startPeriodicEffects();

    return () => {
      stopAllAnimations();
    };
  }, [startRandomAnimations, startPeriodicEffects, stopAllAnimations]);

  return {
    slitControls,
    slitVariants,
    initializeControls,
    createWaveEffect,
    createRandomBurst,
    createRippleEffect,
    resetAllSlits,
    stopAllAnimations,
  };
}
