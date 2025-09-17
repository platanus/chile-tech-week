'use client';

import { Loader2, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/src/components/ui/input';

export function EmailsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useDebouncedCallback((term: string) => {
    setIsSearching(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      if (term) {
        params.set('search', term);
      } else {
        params.delete('search');
      }

      // Reset to first page when searching
      params.delete('page');

      router.replace(`/emails?${params.toString()}`);
      setIsSearching(false);
    });
  }, 300);

  const showSpinner = isPending || isSearching;

  return (
    <div className="relative">
      <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
      {showSpinner && (
        <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <Input
        placeholder="Search emails..."
        className="pr-10 pl-10"
        defaultValue={searchParams.get('search') || ''}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
}
