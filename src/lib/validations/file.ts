import { z } from 'zod';

// Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// File type categories
export const isImageFile = (mimeType: string): boolean =>
  ALLOWED_IMAGE_TYPES.includes(mimeType);

export const isDocumentFile = (mimeType: string): boolean =>
  ALLOWED_DOCUMENT_TYPES.includes(mimeType);

export const getMaxSizeForType = (mimeType: string): number =>
  isImageFile(mimeType) ? MAX_FILE_SIZE : MAX_DOCUMENT_SIZE;

export const getFileTypeCategory = (mimeType: string): string => {
  if (isImageFile(mimeType)) return 'image';
  if (isDocumentFile(mimeType)) return 'document';
  return 'unknown';
};

// Image validation schemas
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: 'Image must be less than 5MB',
  })
  .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
    message: 'Image must be JPEG, PNG, or WebP format',
  });

export const imageBlobSchema = z
  .instanceof(Blob)
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: 'Image size should be less than 5MB',
  })
  .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
    message: 'Image type should be JPEG, PNG, or WebP',
  });

// New multi-type file schemas for documents and images
export const documentFileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      const maxSize = getMaxSizeForType(file.type);
      return file.size <= maxSize;
    },
    {
      message: 'File size exceeds limit (5MB for images, 10MB for documents)',
    },
  )
  .refine((file) => ALL_ALLOWED_TYPES.includes(file.type), {
    message:
      'File must be an image (JPEG, PNG, WebP) or document (PDF, Word, Excel, TXT, CSV)',
  });

export const documentBlobSchema = z
  .instanceof(Blob)
  .refine(
    (file) => {
      const maxSize = getMaxSizeForType(file.type);
      return file.size <= maxSize;
    },
    {
      message: 'File size exceeds limit (5MB for images, 10MB for documents)',
    },
  )
  .refine((file) => ALL_ALLOWED_TYPES.includes(file.type), {
    message:
      'File must be an image (JPEG, PNG, WebP) or document (PDF, Word, Excel, TXT, CSV)',
  });
