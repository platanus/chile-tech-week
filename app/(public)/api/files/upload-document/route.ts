import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  documentBlobSchema,
  getFileTypeCategory,
} from '@/src/lib/validations/file';

const DocumentFileSchema = z.object({
  file: documentBlobSchema,
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate as document file (supports images and documents)
    const validatedFile = DocumentFileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename and prefix from formData
    const fileFromFormData = formData.get('file') as File;
    const prefix = formData.get('prefix') as string;

    // Add prefix and timestamp to filename
    const filename = prefix
      ? `${prefix}/${Date.now()}-${fileFromFormData.name}`
      : `${Date.now()}-${fileFromFormData.name}`;

    const fileTypeCategory = getFileTypeCategory(file.type);
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(filename, fileBuffer, {
        access: 'public',
      });

      return NextResponse.json({
        ...data,
        fileType: fileTypeCategory,
        size: file.size,
      });
    } catch (error) {
      console.error('Document upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
