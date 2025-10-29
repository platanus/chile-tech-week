'use client';

import { X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { updateCustomUrlAction } from '../_actions/update-custom-url.action';

interface CustomUrlEditProps {
  eventId: string;
  currentCustomUrl: string | null;
}

export function CustomUrlEdit({
  eventId,
  currentCustomUrl,
}: CustomUrlEditProps) {
  const [isPending, startTransition] = useTransition();
  const [customUrl, setCustomUrl] = useState(currentCustomUrl || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateCustomUrlAction(eventId, {
          customUrl: customUrl.trim() || null,
        });

        if (result.success) {
          toast.success(result.message);
          setIsEditing(false);
        } else {
          toast.error(result.error);
        }
      } catch (_error) {
        toast.error('An error occurred while updating the custom URL');
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      try {
        const result = await updateCustomUrlAction(eventId, {
          customUrl: null,
        });

        if (result.success) {
          toast.success(result.message);
          setCustomUrl('');
          setIsEditing(false);
        } else {
          toast.error(result.error);
        }
      } catch (_error) {
        toast.error('An error occurred while clearing the custom URL');
      }
    });
  };

  const hasChanges = customUrl.trim() !== (currentCustomUrl || '');

  if (!isEditing && !currentCustomUrl) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
            Custom URL
          </p>
        </div>
        <Button
          onClick={() => setIsEditing(true)}
          variant="outline"
          size="sm"
          className="mt-2 border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
        >
          Add Custom URL
        </Button>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
            Custom URL
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <a
            href={currentCustomUrl || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold font-mono text-primary hover:text-primary/80"
          >
            {currentCustomUrl}
          </a>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
            >
              Edit
            </Button>
            <Button
              onClick={handleClear}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="border-2 border-red-500 bg-black font-bold font-mono text-red-500 uppercase tracking-wide hover:bg-red-500 hover:text-white"
            >
              <X className="mr-1 h-3 w-3" />
              {isPending ? 'Clearing...' : 'Clear'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
          Custom URL
        </p>
      </div>
      <div className="mt-2 space-y-2">
        <Input
          type="url"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="https://example.com/event"
          disabled={isPending}
          className="border-2 border-white bg-black font-mono text-white placeholder:text-white/40"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            size="sm"
            className="border-2 border-white bg-primary font-bold font-mono text-white uppercase tracking-wide hover:bg-primary/80"
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={() => {
              setCustomUrl(currentCustomUrl || '');
              setIsEditing(false);
            }}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
          >
            Cancel
          </Button>
        </div>
        <p className="font-mono text-white/60 text-xs">
          This URL will be used instead of the Luma URL when set
        </p>
      </div>
    </div>
  );
}
