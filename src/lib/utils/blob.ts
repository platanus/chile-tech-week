// File upload and deletion utilities for Vercel Blob storage

// Image upload function for company logos, profile pictures, etc.
export async function uploadImageFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url as string);
        } catch {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || 'Failed to upload image'));
        } catch {
          reject(new Error('Failed to upload image'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', '/api/files/upload-image');
    xhr.send(formData);
  });
}

// Document upload function for update reports, supporting documents, etc.
export async function uploadDocumentFile(
  file: File,
  prefix?: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  if (prefix) {
    formData.append('prefix', prefix);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url as string);
        } catch {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || 'Failed to upload document'));
        } catch {
          reject(new Error('Failed to upload document'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', '/api/files/upload-document');
    xhr.send(formData);
  });
}

// Delete file from Vercel Blob storage (requires authentication)
export async function deleteFile(url: string): Promise<void> {
  try {
    const response = await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If unauthorized, fail silently for public users
      if (response.status === 401) {
        console.warn('File deletion requires authentication, skipping cleanup');
        return;
      }
      throw new Error(errorData.error || 'Failed to delete file');
    }
  } catch (error) {
    // For public users, file deletion failure shouldn't break the flow
    console.warn('File deletion failed:', error);
  }
}
