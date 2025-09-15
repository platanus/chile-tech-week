import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoles = ['hacker', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const userRoleEnum = pgEnum('user_role', userRoles);

// Core User table
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  encryptedPassword: varchar('encrypted_password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('hacker'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = InferSelectModel<typeof user>;
export type InsertUser = InferInsertModel<typeof user>;

// Public user type without sensitive data (excludes encryptedPassword)
export type PublicUser = Omit<User, 'encryptedPassword'>;

export const outboundEmails = pgTable('OutboundEmails', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  templateName: varchar('template_name', { length: 100 }).notNull(),
  to: varchar('to', { length: 255 }).notNull(),
  cc: json('cc').$type<string[]>(), // JSON array of email addresses
  bcc: json('bcc').$type<string[]>(), // JSON array of email addresses
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content'),
  templateData: json('template_data'), // JSON data used to render template
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, sent, failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  externalMessageId: varchar('external_message_id', { length: 255 }), // Resend message ID
  sentByUserId: uuid('sent_by_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type OutboundEmail = InferSelectModel<typeof outboundEmails>;
export type InsertOutboundEmail = InferInsertModel<typeof outboundEmails>;

// Landing page subscription table
export const landingSub = pgTable('LandingSub', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LandingSub = InferSelectModel<typeof landingSub>;
export type InsertLandingSub = InferInsertModel<typeof landingSub>;
