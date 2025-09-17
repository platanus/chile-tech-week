'use client';

import { AlertCircle, Image, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { uploadImageFile } from '@/src/lib/utils/blob';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/src/lib/validations/file';
import { Button } from './button';

interface ImageUploadProps {
  onFileSelect: (url: string | null) => void;
  currentFileUrl?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  description?: string;
}

export function ImageUpload({
  onFileSelect,
  currentFileUrl,
  disabled = false,
  className,
  placeholder = 'Drop an image here or click to browse',
  description = 'Supports JPEG, PNG, and WebP up to 5MB',
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const maxMB = MAX_FILE_SIZE / (1024 * 1024);
      setError(`Image must be less than ${maxMB}MB`);
      return false;
    }

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Image must be JPEG, PNG, or WebP format');
      return false;
    }

    return true;
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      setCurrentFile(file);
      setIsUploading(true);
      setError(null);

      try {
        // Upload file using helper function with progress tracking
        const url = await uploadImageFile(file, (progress) => {
          setUploadProgress(progress);
        });
        onFileSelect(url);
      } catch (error) {
        console.error('Image upload error:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to upload image',
        );
        setCurrentFile(null);
        onFileSelect(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [validateFile, onFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const removeFile = useCallback(() => {
    setError(null);
    setCurrentFile(null);
    setUploadProgress(0);
    onFileSelect(null);
  }, [onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className={cn('w-full', className)}>
      {!currentFile && !currentFileUrl ? (
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50',
          )}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleInputChange}
            disabled={disabled || isUploading}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isUploading
                  ? `Uploading... ${Math.round(uploadProgress)}%`
                  : placeholder}
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
              {isUploading && (
                <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Image className="h-4 w-4" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {currentFile?.name || 'Current image'}
            </p>
            {currentFile && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(currentFile.size)}
              </p>
            )}
            {currentFileUrl && !currentFile && (
              <p className="text-xs text-muted-foreground">
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View image
                </a>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeFile}
            disabled={disabled || isUploading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
