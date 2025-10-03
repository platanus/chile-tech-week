'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { uploadImageFile } from '@/src/lib/utils/blob';
import { checkImageContrast } from '@/src/lib/utils/contrast';

interface LogoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoUploaded: (logoUrl: string) => void;
  title?: string;
  description?: string;
}

export function LogoEditModal({
  open,
  onOpenChange,
  onLogoUploaded,
  title = 'UPLOAD COMPANY LOGO',
  description = 'Upload your logo and check contrast against black background',
}: LogoEditModalProps) {
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [modalPreviewUrl, setModalPreviewUrl] = useState<string | null>(null);
  const [modalSelectedFile, setModalSelectedFile] = useState<File | null>(null);
  const [contrastCheckResult, setContrastCheckResult] = useState<{
    contrastRatio: number;
    isGoodContrast: boolean;
  } | null>(null);
  const [isCheckingContrast, setIsCheckingContrast] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const handleModalFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Logo must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Logo must be JPEG, PNG, or WebP format');
      return;
    }

    // Clear previous errors
    setLogoUploadError(null);
    setContrastCheckResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setModalPreviewUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Store the file
    setModalSelectedFile(file);

    // Check contrast
    setIsCheckingContrast(true);
    try {
      const result = await checkImageContrast(file, [0, 0, 0]); // Black background
      setContrastCheckResult({
        contrastRatio: result.contrastRatio,
        isGoodContrast: result.isGoodContrast,
      });
    } catch (error) {
      console.error('Contrast check error:', error);
      setLogoUploadError('Could not check image contrast. Please try again.');
    } finally {
      setIsCheckingContrast(false);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalSelectedFile || !contrastCheckResult?.isGoodContrast) return;

    setLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      // Upload to Vercel Blob with progress tracking
      const logoUrl = await uploadImageFile(modalSelectedFile, (progress) => {
        setLogoUploadProgress(progress);
      });

      // Call the parent callback
      onLogoUploaded(logoUrl);

      // Close modal and reset modal state
      onOpenChange(false);
      resetModalState();
    } catch (error) {
      console.error('Logo upload error:', error);
      setLogoUploadError(
        error instanceof Error ? error.message : 'Failed to upload logo',
      );
    } finally {
      setLogoUploading(false);
      setLogoUploadProgress(0);
    }
  };

  const resetModalState = () => {
    setModalPreviewUrl(null);
    setModalSelectedFile(null);
    setContrastCheckResult(null);
    setIsCheckingContrast(false);
    setLogoUploadError(null);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    onOpenChange(false);
    resetModalState();
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl border-4 border-white bg-black">
        <DialogHeader>
          <DialogTitle className="font-bold font-mono text-white text-xl uppercase tracking-wider">
            {title}
          </DialogTitle>
          <DialogDescription className="font-mono text-gray-300 text-sm uppercase tracking-wider">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={modalFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleModalFileSelect(file);
              }
            }}
          />

          {/* Upload area */}
          <div className="flex flex-col items-center gap-4">
            {modalPreviewUrl ? (
              <div className="relative w-full max-w-md">
                <div
                  className="flex h-48 w-full items-center justify-center border-2 border-white bg-black"
                  style={{
                    backgroundImage: `url(${modalPreviewUrl})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <Button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="mt-2 w-full border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200"
                >
                  CHANGE PHOTO
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                className="h-48 w-full max-w-md border-2 border-white border-dashed bg-transparent text-white hover:bg-gray-900"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-12 w-12 text-white" />
                  <p className="font-bold font-mono text-lg text-white uppercase tracking-wider">
                    CLICK TO UPLOAD
                  </p>
                  <p className="font-mono text-gray-300 text-xs uppercase tracking-wider">
                    JPEG, PNG, WEBP • MAX 2MB
                  </p>
                </div>
              </Button>
            )}
          </div>

          {/* Contrast Check Result */}
          {isCheckingContrast && (
            <div className="rounded border-2 border-yellow-400 bg-yellow-900/20 p-4">
              <p className="font-bold font-mono text-sm text-yellow-400 uppercase tracking-wider">
                CHECKING CONTRAST...
              </p>
            </div>
          )}

          {contrastCheckResult && (
            <div
              className={`rounded border-2 p-4 ${
                contrastCheckResult.isGoodContrast
                  ? 'border-green-400 bg-green-900/20'
                  : 'border-red-400 bg-red-900/20'
              }`}
            >
              <p
                className={`font-bold font-mono text-sm uppercase tracking-wider ${
                  contrastCheckResult.isGoodContrast
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {contrastCheckResult.isGoodContrast
                  ? `✓ GOOD CONTRAST (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`
                  : `✗ LOW CONTRAST (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`}
              </p>
              {!contrastCheckResult.isGoodContrast && (
                <p className="mt-2 font-mono text-red-300 text-xs uppercase tracking-wider">
                  CONTRAST TOO LOW. PLEASE USE A CLEARER PICTURE WITH LIGHTER
                  COLORS.
                </p>
              )}
            </div>
          )}

          {/* Upload Error */}
          {logoUploadError && (
            <div className="rounded border-2 border-red-400 bg-red-900/20 p-4">
              <p className="font-bold font-mono text-red-400 text-sm uppercase tracking-wider">
                {logoUploadError}
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {logoUploading && (
            <div className="rounded border-2 border-blue-400 bg-blue-900/20 p-4">
              <p className="font-bold font-mono text-blue-400 text-sm uppercase tracking-wider">
                UPLOADING... {Math.round(logoUploadProgress)}%
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                <div
                  className="h-2 rounded-full bg-blue-400 transition-all duration-300"
                  style={{
                    width: `${logoUploadProgress}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={handleModalClose}
            disabled={logoUploading}
            className="border-2 border-white bg-transparent font-bold font-mono text-white uppercase tracking-wider hover:bg-gray-800"
          >
            CANCEL
          </Button>
          <Button
            type="button"
            onClick={handleModalSubmit}
            disabled={
              !modalSelectedFile ||
              !contrastCheckResult?.isGoodContrast ||
              logoUploading ||
              isCheckingContrast
            }
            className="border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50"
          >
            {logoUploading ? 'UPLOADING...' : 'SUBMIT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
