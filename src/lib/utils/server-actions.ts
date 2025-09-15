import { revalidatePath } from 'next/cache';

/**
 * Simple utility to revalidate multiple paths
 * Server-only function that uses Next.js cache revalidation
 */
export async function revalidatePaths(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}
