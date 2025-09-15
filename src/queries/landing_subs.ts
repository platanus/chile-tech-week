import { count } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { landingSub } from '@/src/lib/db/schema';

export async function getTotalLandingSubscribers(): Promise<number> {
  const result = await db.select({ count: count() }).from(landingSub);

  return result[0]?.count ?? 0;
}
