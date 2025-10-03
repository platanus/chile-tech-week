'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import {
  updateCohostLogoAction,
  updateEventLogoAction,
} from '../_actions/update-logo.action';
import { LogoEditModal } from './logo-edit-modal';

interface LogoEditButtonProps {
  id: string;
  type: 'event' | 'cohost';
}

export function LogoEditButton({ id, type }: LogoEditButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogoUploaded = async (logoUrl: string) => {
    setIsUpdating(true);
    try {
      const result =
        type === 'event'
          ? await updateEventLogoAction(id, logoUrl)
          : await updateCohostLogoAction(id, logoUrl);

      if (result.success) {
        toast.success('Logo updated successfully');
      } else {
        toast.error(result.error || 'Failed to update logo');
      }
    } catch (error) {
      console.error('Logo update error:', error);
      toast.error('Failed to update logo');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        disabled={isUpdating}
        size="sm"
        className="h-7 border-2 border-white bg-white px-2 py-1 font-bold font-mono text-black text-xs uppercase tracking-wide hover:bg-gray-200"
      >
        <Pencil className="mr-1 h-3 w-3" />
        {isUpdating ? 'Updating...' : 'Edit'}
      </Button>
      <LogoEditModal
        open={showModal}
        onOpenChange={setShowModal}
        onLogoUploaded={handleLogoUploaded}
        title={
          type === 'event' ? 'EDIT COMPANY LOGO' : 'EDIT CO-HOST COMPANY LOGO'
        }
      />
    </>
  );
}
