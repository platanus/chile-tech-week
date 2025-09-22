'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface SuccessClientWrapperProps {
  children: React.ReactNode;
}

export default function SuccessClientWrapper({
  children,
}: SuccessClientWrapperProps) {
  const [runConfetti, setRunConfetti] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Set up window dimensions for confetti
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const handleConfettiComplete = () => {
    setRunConfetti(false);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Confetti
        width={dimensions.width}
        height={dimensions.height}
        run={runConfetti}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
        tweenDuration={8000}
        onConfettiComplete={handleConfettiComplete}
      />
      {children}
    </div>
  );
}
