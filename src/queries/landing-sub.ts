import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { type InsertLandingSub, landingSub } from '@/src/lib/db/schema';

export async function findLandingSubByEmail(email: string) {
  const result = await db
    .select()
    .from(landingSub)
    .where(eq(landingSub.email, email))
    .limit(1);

  return result[0] || null;
}

export async function createLandingSub(data: InsertLandingSub) {
  const result = await db.insert(landingSub).values(data).returning();
  return result[0];
}
