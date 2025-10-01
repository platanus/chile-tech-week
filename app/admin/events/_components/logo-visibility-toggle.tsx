'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  toggleCohostLogoVisibility,
  toggleEventLogoVisibility,
} from '../_actions/toggle-logo-visibility.action';

interface LogoVisibilityToggleProps {
  id: string;
  isShown: boolean;
  type: 'event' | 'cohost';
}

export function LogoVisibilityToggle({
  id,
  isShown,
  type,
}: LogoVisibilityToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useState(isShown);

  const handleToggle = () => {
    const newShownState = !shown;
    setShown(newShownState);

    startTransition(async () => {
      if (type === 'event') {
        await toggleEventLogoVisibility(id, newShownState);
      } else {
        await toggleCohostLogoVisibility(id, newShownState);
      }
    });
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      variant="outline"
      size="sm"
      className="gap-2 border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
    >
      {shown ? (
        <>
          <Eye className="h-4 w-4" />
          Logo Shown
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          Logo Hidden
        </>
      )}
    </Button>
  );
}
