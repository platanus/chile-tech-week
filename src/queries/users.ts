import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
} from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { type InsertUser, type UserRole, user } from '@/src/lib/db/schema';
import { generateHashedPassword } from '@/src/lib/db/utils';
import {
  type CreateUserServerInputData,
  createUserServerInputSchema,
} from '@/src/schemas/users.schema';

export const getUser = async (email: string) => {
  return db.select().from(user).where(eq(user.email, email));
};

export const getUserById = async (id: string) => {
  const result = await db.select().from(user).where(eq(user.id, id));
  return result[0] ?? null;
};

export const createUser = async (data: CreateUserServerInputData) => {
  const validatedData = createUserServerInputSchema.parse(data);
  const { email, password, firstName, lastName, role } = validatedData;

  const encryptedPassword = generateHashedPassword(password);

  const result = await db
    .insert(user)
    .values({
      email,
      encryptedPassword,
      firstName,
      lastName,
      role: role ?? 'partner-admin',
    })
    .returning();

  return result[0];
};

// Update user function
export const updateUser = async (
  id: string,
  data: Partial<Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>>,
) => {
  const result = await db
    .update(user)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(user.id, id))
    .returning();

  return result[0];
};

// Get all users with pagination, role filtering, and search
export async function getUsers(
  params: {
    page?: number;
    limit?: number;
    roles?: UserRole[];
    search?: string;
  } = {},
) {
  const { page = 1, limit = 20, roles, search } = params;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions: any[] = [];

  // Role filtering
  if (roles && roles.length > 0) {
    conditions.push(inArray(user.role, roles));
  }

  // Search filtering (name or email)
  if (search) {
    conditions.push(
      or(
        ilike(user.firstName, `%${search}%`),
        ilike(user.lastName, `%${search}%`),
        ilike(user.email, `%${search}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get users with filtering and pagination
  const users = await db
    .select({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(user)
    .where(whereClause);

  const totalPages = Math.ceil(total / limit);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

// Get users with notifications enabled
export async function getUsersWithNotificationsEnabled() {
  return db
    .select({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(isNotNull(user.notificationsEnabledAt));
}
