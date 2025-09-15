'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for navigating back with fallback URL
 * Uses router.back() if there's browser history, otherwise uses fallback URL
 */
export function useNavigateBack() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we came from within the same origin
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;

      // We can safely go back if there's a referrer from the same origin
      setCanGoBack(Boolean(referrer?.startsWith(currentOrigin)));
    }
  }, []);

  const navigateBack = useCallback(
    (fallbackUrl: string) => {
      if (canGoBack) {
        router.back();
      } else {
        router.push(fallbackUrl);
      }
    },
    [router, canGoBack],
  );

  return navigateBack;
}
