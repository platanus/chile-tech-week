import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// import { auth } from '@/app/(auth)/auth'; // Commented out for public uploads
import { imageBlobSchema } from '@/src/lib/validations/file';

const ImageFileSchema = z.object({
  file: imageBlobSchema,
});

export async function POST(request: Request) {
  // Allow public uploads for event creation, but with stricter validation
  // const session = await auth();
  // if (!session) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate as image file
    const validatedFile = ImageFileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const fileFromFormData = formData.get('file') as File;

    // Sanitize filename for security (public upload)
    const originalName = fileFromFormData.name;
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .substring(0, 100);
    const timestamp = Date.now();
    const filename = `public-uploads/${timestamp}-${sanitizedName}`;

    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(filename, fileBuffer, {
        access: 'public',
      });

      return NextResponse.json({
        ...data,
        fileType: 'image',
        size: file.size,
      });
    } catch (error) {
      console.error('Image upload error:', error);
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
