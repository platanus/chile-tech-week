import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { type InsertOutboundEmail, outboundEmails } from '@/src/lib/db/schema';

export async function createOutboundEmail(data: InsertOutboundEmail) {
  const [record] = await db.insert(outboundEmails).values(data).returning();
  return record;
}

export async function updateOutboundEmail(
  id: string,
  updates: Partial<
    Pick<
      InsertOutboundEmail,
      'status' | 'sentAt' | 'failureReason' | 'externalMessageId'
    >
  >,
) {
  await db.update(outboundEmails).set(updates).where(eq(outboundEmails.id, id));
}

export async function getOutboundEmail(id: string) {
  const [record] = await db
    .select()
    .from(outboundEmails)
    .where(eq(outboundEmails.id, id));

  return record;
}

export interface GetOutboundEmailsParams {
  page?: number;
  limit?: number;
  search?: string;
  to?: string;
}

export async function getOutboundEmails(params: GetOutboundEmailsParams = {}) {
  const { page = 1, limit = 20, search, to } = params;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions: any[] = [];

  // Filter by recipient email
  if (to) {
    conditions.push(eq(outboundEmails.to, to));
  }

  // Search filtering (to, subject, template name)
  if (search) {
    conditions.push(
      or(
        ilike(outboundEmails.to, `%${search}%`),
        ilike(outboundEmails.subject, `%${search}%`),
        ilike(outboundEmails.templateName, `%${search}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db
    .select()
    .from(outboundEmails)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(outboundEmails.createdAt));

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(outboundEmails)
    .where(whereClause);

  const totalPages = Math.ceil(total / limit);

  return {
    emails: records,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getOutboundEmailStats() {
  const [stats] = await db
    .select({
      total: count(),
      sent: count(sql`CASE WHEN status = 'sent' THEN 1 END`),
      failed: count(sql`CASE WHEN status = 'failed' THEN 1 END`),
      pending: count(sql`CASE WHEN status = 'pending' THEN 1 END`),
    })
    .from(outboundEmails);

  return {
    total: Number(stats.total),
    sent: Number(stats.sent),
    failed: Number(stats.failed),
    pending: Number(stats.pending),
    successRate:
      stats.total > 0 ? (Number(stats.sent) / Number(stats.total)) * 100 : 0,
  };
}
